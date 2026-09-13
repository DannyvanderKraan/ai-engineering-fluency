#!/usr/bin/env node
'use strict';

/**
 * Interaction smoke test for the extension's webview panels.
 *
 * `validate-webview-contract.js` proves that every command a bundle *can* post
 * has a handler. It cannot prove the button is wired to post anything at all —
 * a `<button>` that nobody called `addEventListener` on is, to a static
 * checker, indistinguishable from a decorative element. That is the other half
 * of the bug class this repo keeps hitting after a PR burst: the handler is
 * fine, the markup is fine, and the click goes nowhere.
 *
 * So this script clicks — and, for the controls a click cannot drive, changes.
 * A native `<select>` never receives a `click` that changes its value, so a
 * click-only crawl reports nothing at all about one: the dropdown is neither
 * exercised nor flagged. A second pass therefore selects a *different* option on
 * every `<select>` and measures the same way, which is how a keyboard-accessible
 * dropdown (the Efficiency view's week selector, the Models tab's pickers) gets
 * covered at all.
 *
 * It reuses the visual-view-diff harness to render the
 * *real* webview bundles headlessly (never the Extension Development Host —
 * see "Never Launch a Real Editor/IDE Instance" in AGENTS.md), enumerates every
 * interactive control, clicks each one, and records what happened:
 *
 *   - a `postMessage` to the host          -> wired
 *   - a DOM change                         -> wired (client-side only)
 *   - neither, and no error                -> DEAD CONTROL (finding)
 *   - a thrown error                       -> BROKEN CONTROL (finding)
 *   - a command with no host handler       -> UNHANDLED COMMAND (finding)
 *
 * The last one catches what the static check cannot: a command name computed at
 * runtime (`{ command: someVar }`) that resolves to something nobody handles.
 *
 * One exception: a control that is *already selected* (the `.active` button in
 * a segmented group, a checked radio) is supposed to do nothing when clicked
 * again, so a no-op there is reported as `noop-selected`, not as a finding.
 * That does mean a genuinely dead default button hides here — the same
 * deliberate trade the contract checker makes, because the alternative is three
 * standing false positives on the chart view and a check nobody trusts.
 *
 * Controls are clicked in one pass over a single page, so a click that opens a
 * dialog can hide later controls. Those are reported as `skipped`, never as
 * failures — use `--isolate` to reload the page between clicks when a view's
 * results look polluted.
 *
 * Usage:
 *   node scripts/interaction-smoke.js [--view details,chart] [--isolate]
 *                                     [--json] [--out <file>]
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '..', '.github', 'skills', 'visual-view-diff');
const REPO_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(REPO_ROOT, 'vscode-extension', 'dist', 'webview');

const { buildPageHtml, loadFixture } = require(path.join(SKILL_DIR, 'lib', 'harness.js'));
const { loadChromium } = require(path.join(SKILL_DIR, 'lib', 'browser.js'));
const { parseArgs, readConfig, selectViews } = require(path.join(SKILL_DIR, 'lib', 'config.js'));

const { collectHandledCommandsFromAst, widenHandledFromText, collectTsFiles } = require('./validate-webview-contract.js');

/**
 * What counts as a control a user can click. Kept deliberately broad — a false
 * "dead control" on a decorative element is cheap to allow-list, while missing
 * a real dead button is the whole reason this exists.
 */
const INTERACTIVE_SELECTOR = [
  'button',
  '[role="button"]',
  '[data-action]',
  '[data-command]',
  '[data-tab]',
  '.tab',
  '.clickable',
  'summary',
  'a[href^="#"]',
  'a[href^="command:"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
].join(', ');

/**
 * Runs inside the page: tags every visible, enabled `<select>` that has an
 * enabled option other than the current one, and reports which option to switch
 * to. Selects with a single usable option are skipped — changing nothing proves
 * nothing.
 */
const TAG_SELECTS = () => {
  const isVisible = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none';
  };

  const selects = [];
  let index = 0;
  for (const el of Array.from(document.querySelectorAll('select'))) {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || !isVisible(el)) {
      continue;
    }
    el.setAttribute('data-smoke-select-id', String(index));
    const usable = Array.from(el.options).filter((o) => !o.disabled);
    const target = usable.find((o) => o.value !== el.value);
    selects.push({
      index,
      key: el.id || `select-${index}`,
      queued: el.hasAttribute('data-smoke-seen'),
      tag: 'select',
      id: el.id || null,
      label: (el.getAttribute('aria-label') || el.id || '').slice(0, 60) || null,
      from: el.value,
      target: target ? target.value : null,
    });
    index++;
  }
  return selects;
};

/** Runs inside the page: marks the given tagged elements so they are not queued twice. */
const MARK_QUEUED = ({ attr, indexes }) => {
  for (const index of indexes) {
    document.querySelector(`[${attr}="${index}"]`)?.setAttribute('data-smoke-seen', '1');
  }
};

/** Reads the extension-side handled-command set once, for the unhandled check. */
function loadHandledCommands() {
  const extDir = path.join(REPO_ROOT, 'vscode-extension', 'src');
  const webviewDir = path.join(extDir, 'webview');
  const extensionFiles = collectTsFiles(extDir).filter((f) => !f.startsWith(webviewDir + path.sep));
  return widenHandledFromText(extensionFiles, collectHandledCommandsFromAst(extensionFiles));
}

/**
 * Runs inside the page: tags every visible, enabled control with an index and a
 * stable key, and returns a short description of each.
 *
 * The key matters more than the index. These views re-render by replacing the
 * whole subtree, so the moment one click lands every tag is gone and every
 * later control is "not clickable in this pass" — which silently skipped every
 * tab but the first, and every control those tabs contain. The driver therefore
 * re-runs this before each interaction and finds the control by key.
 */
const TAG_CONTROLS = (selector) => {
  const isVisible = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none';
  };

  const controls = [];
  const seen = {};
  let index = 0;
  for (const el of Array.from(document.querySelectorAll(selector))) {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
      continue;
    }
    if (!isVisible(el)) {
      continue;
    }
    el.setAttribute('data-smoke-id', String(index));
    const label = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    // A segmented control's current option, a checked radio: re-clicking it is
    // meant to be inert, so a no-op there is not evidence of broken wiring.
    const alreadySelected =
      el.classList.contains('active') ||
      el.classList.contains('selected') ||
      el.getAttribute('aria-pressed') === 'true' ||
      el.getAttribute('aria-selected') === 'true' ||
      (el instanceof HTMLInputElement && el.type === 'radio' && el.checked);
    const tag = el.tagName.toLowerCase();
    // State-free identity: tag, id and visible label. `.active`/`aria-pressed`
    // deliberately play no part — a control must stay the same control after the
    // click that selects it.
    const base = `${tag}|${el.id || ''}|${label}`;
    seen[base] = (seen[base] || 0) + 1;
    controls.push({
      index,
      key: `${base}|${seen[base]}`,
      // Identity by element, not by label: a button that swaps its text for a
      // transient confirmation ("✅ Copied!") is the same control, and queueing
      // it again would score the inert confirmation state as a dead control.
      queued: el.hasAttribute('data-smoke-seen'),
      tag,
      id: el.id || null,
      classes: el.className && typeof el.className === 'string' ? el.className.slice(0, 80) : null,
      label: label || null,
      alreadySelected,
    });
    index++;
  }
  return controls;
};

/**
 * Runs inside the page: a fingerprint of the rendered DOM with focus state
 * stripped out.
 *
 * Clicking anything moves focus, and focus is visible in the markup — the
 * `vscode-button` web component carries a `focused` attribute, browsers add
 * `:focus-visible` classes. Hashing raw `innerHTML` therefore reports a DOM
 * change for *every* click, including clicks on buttons that do nothing at all.
 * That is a false negative in the direction that matters: a dead control scored
 * as wired. So normalize the focus artifacts away before hashing.
 */
const DOM_SIGNATURE = () => {
  const clone = document.body.cloneNode(true);
  const FOCUS_ATTRS = ['focused', 'autofocus', 'aria-activedescendant', 'data-smoke-id', 'data-smoke-select-id', 'data-smoke-seen'];
  const FOCUS_CLASSES = ['focused', 'focus-visible', 'focus', 'hover', 'hovered'];
  for (const el of Array.from(clone.querySelectorAll('*'))) {
    for (const attr of FOCUS_ATTRS) {
      el.removeAttribute(attr);
    }
    for (const cls of FOCUS_CLASSES) {
      el.classList.remove(cls);
    }
    if (el.getAttribute('class') === '') {
      el.removeAttribute('class');
    }
  }
  const html = clone.innerHTML;
  let hash = 0;
  for (let i = 0; i < html.length; i++) {
    hash = (hash * 31 + html.charCodeAt(i)) | 0;
  }
  return `${html.length}:${hash}`;
};

/** Writes the view's standalone page to a temp dir and returns both paths. */
function preparePage(view, fixturePath, bundlePath) {
  const html = buildPageHtml({
    globalName: view.global,
    fixture: loadFixture(fixturePath, REPO_ROOT),
    theme: 'dark',
    bundlePath,
    repoRoot: REPO_ROOT,
  });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interaction-smoke-'));
  const pageFile = path.join(tmpDir, `${view.id}.html`);
  fs.writeFileSync(pageFile, html);
  return { pageFile, tmpDir };
}

async function openPage(browser, pageFile, view, defaults) {
  const page = await browser.newPage({
    viewport: view.viewport || defaults.viewport,
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    // A real VS Code webview can write to the clipboard; a bare headless page
    // cannot, so "copy" controls would reject with NotAllowedError and be scored
    // as broken. Grant it so the harness matches the environment under test.
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  // A control that opens a real URL or a dialog must not hang or navigate the
  // harness away from the page under test.
  page.on('dialog', (dialog) => void dialog.dismiss().catch(() => {}));
  await page.goto(require('url').pathToFileURL(pageFile).href, { waitUntil: 'load' });
  await page.waitForTimeout(view.settleMs || defaults.settleMs || 1200);
  return page;
}

/**
 * Waits until the DOM stops changing on its own.
 *
 * Without this, a click that triggers an async re-render bleeds into the *next*
 * control's measurement: that control looks like it changed the DOM when it did
 * nothing at all, and a genuinely dead button right after a live one is scored
 * as wired. Two identical consecutive reads mean the previous click has landed.
 */
async function waitForQuietDom(page, { pollMs = 100, maxWaitMs = 3000 } = {}) {
  let previous = await page.evaluate(DOM_SIGNATURE);
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(pollMs);
    const current = await page.evaluate(DOM_SIGNATURE);
    if (current === previous) {
      return true;
    }
    previous = current;
  }
  return false;
}

/**
 * Drives one interaction and reports what it did. `act` performs the actual
 * gesture; everything around it — settling the DOM first so the previous
 * interaction cannot be credited to this one, clearing the recorded messages,
 * and comparing the before/after signatures — is identical for a click and for
 * a dropdown change.
 */
async function measureInteraction(page, act, settleMs) {
  const quiet = await waitForQuietDom(page);
  const before = await page.evaluate(DOM_SIGNATURE);
  await page.evaluate(() => {
    window.__HARNESS_POSTED_MESSAGES__.length = 0;
    window.__HARNESS_ERRORS__.length = 0;
  });

  const skipped = await act();
  if (skipped) {
    return skipped;
  }

  await page.waitForTimeout(settleMs);

  const [posted, errors, after] = await Promise.all([
    page.evaluate(() => window.__HARNESS_POSTED_MESSAGES__.slice()),
    page.evaluate(() => window.__HARNESS_ERRORS__.slice()),
    page.evaluate(DOM_SIGNATURE),
  ]);

  if (errors.length > 0) {
    return { status: 'error', posted, errors, quiet };
  }
  if (posted.length > 0) {
    return { status: 'posted', posted, domChanged: before !== after, quiet };
  }
  if (before !== after) {
    return { status: 'dom-only', posted, domChanged: true, quiet };
  }
  return { status: 'dead', posted, domChanged: false, quiet };
}

async function clickControl(page, control) {
  const current = (await page.evaluate(TAG_CONTROLS, INTERACTIVE_SELECTOR)).find((c) => c.key === control.key);
  if (!current) {
    return { status: 'skipped', reason: 'the control is no longer on the page in this pass' };
  }
  const outcome = await measureInteraction(page, async () => {
    try {
      await page.locator(`[data-smoke-id="${current.index}"]`).click({ timeout: 1500, force: false, noWaitAfter: true });
    } catch (error) {
      return { status: 'skipped', reason: `not clickable in this pass: ${String(error.message).split('\n')[0]}` };
    }
    return null;
  }, 120);
  // Selected state is read at click time, not at enumeration time: a control the
  // user has since selected is allowed to be inert.
  return { ...outcome, alreadySelected: current.alreadySelected };
}

/**
 * Picks a different option on one `<select>`. The page is re-tagged first: an
 * earlier change may have re-rendered the view, which drops the tags and can
 * move a select's position, so the dropdown is re-found by its id.
 */
async function changeSelect(page, control) {
  const current = (await page.evaluate(TAG_SELECTS)).find((s) => s.key === control.key);
  if (!current) {
    return { status: 'skipped', reason: 'the select is no longer on the page in this pass' };
  }
  if (current.target === null) {
    return { status: 'skipped', reason: 'no alternative enabled option to switch to' };
  }
  return measureInteraction(page, async () => {
    try {
      await page.locator(`[data-smoke-select-id="${current.index}"]`).selectOption(current.target, { timeout: 1500 });
    } catch (error) {
      return { status: 'skipped', reason: `not selectable in this pass: ${String(error.message).split('\n')[0]}` };
    }
    return null;
  }, 150);
}

async function smokeView({ browser, view, defaults, handledCommands, isolate }) {
  const bundlePath = path.join(DIST_DIR, `${view.bundle}.js`);
  if (!fs.existsSync(bundlePath)) {
    return {
      view: view.id,
      status: 'error',
      error: `Missing bundle ${path.relative(REPO_ROOT, bundlePath)} — run \`npm run compile\` in vscode-extension/ first.`,
      controls: [],
      findings: [],
    };
  }
  const fixturePath = path.join(SKILL_DIR, 'fixtures', view.fixture);
  if (!fs.existsSync(fixturePath)) {
    return { view: view.id, status: 'error', error: `Missing fixture ${view.fixture}`, controls: [], findings: [] };
  }

  const { pageFile, tmpDir } = preparePage(view, fixturePath, bundlePath);
  let page = await openPage(browser, pageFile, view, defaults);

  const renderErrors = await page.evaluate(() => window.__HARNESS_ERRORS__.slice());
  const controls = await page.evaluate(TAG_CONTROLS, INTERACTIVE_SELECTOR);

  const results = [];
  const findings = [];

  // A worklist, not two fixed passes. Clicking a tab replaces the whole subtree,
  // so the `<select>` controls visible right now are only the ones on the tab
  // that happens to be open: enumerating dropdowns once, at the end, would cover
  // whichever tab was left showing and silently skip every other tab's. Instead,
  // re-enumerate after each interaction and append any dropdown not yet seen.
  const queue = controls.map((control) => ({ control, run: () => clickControl(page, control) }));
  const seenSelects = new Set();
  const seenControls = new Set(controls.map((c) => c.key));
  await page.evaluate(MARK_QUEUED, { attr: 'data-smoke-id', indexes: controls.map((c) => c.index) });

  // Newly-found dropdowns go in *directly after* the interaction that revealed
  // them, not at the end of the queue: appending would only get to a tab's
  // dropdowns after every remaining tab click had already navigated away from it.
  // Controls discovered by a later pass are *contextual*: they exist only because
  // an earlier interaction navigated to them, so `--isolate`'s reload would put
  // them out of reach (see the reload guard below).
  const enqueueNewControls = async (at, contextual) => {
    const fresh = [];
    const newClickIndexes = [];
    const newSelectIndexes = [];
    // Buttons first: a tab click is what reveals this view's contextual-navigation
    // actions (the Month vs Month "Show weekly trend" and Cost Attribution
    // "Inspect this model" buttons live only on their own tabs), so enumerating
    // clickables once at the start would never reach them and the crawl could
    // pass with either handler dead.
    for (const control of await page.evaluate(TAG_CONTROLS, INTERACTIVE_SELECTOR)) {
      if (control.queued || seenControls.has(control.key)) {
        continue;
      }
      seenControls.add(control.key);
      newClickIndexes.push(control.index);
      fresh.push({ control: { ...control, contextual }, run: () => clickControl(page, control) });
    }
    for (const control of await page.evaluate(TAG_SELECTS)) {
      if (control.queued || seenSelects.has(control.key)) {
        continue;
      }
      seenSelects.add(control.key);
      newSelectIndexes.push(control.index);
      fresh.push({ control: { ...control, contextual }, run: () => changeSelect(page, control) });
    }
    if (newClickIndexes.length > 0) {
      await page.evaluate(MARK_QUEUED, { attr: 'data-smoke-id', indexes: newClickIndexes });
    }
    if (newSelectIndexes.length > 0) {
      await page.evaluate(MARK_QUEUED, { attr: 'data-smoke-select-id', indexes: newSelectIndexes });
    }
    queue.splice(at, 0, ...fresh);
  };

  await enqueueNewControls(0, false);

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const { control, run } = queue[cursor];
    // `--isolate` reloads between interactions to stop one polluting the next.
    // A contextual control is different: it was only reachable because an earlier
    // click navigated there, so reloading first would drop it back to the
    // fixture's default tab and record it as skipped — silently un-testing the
    // controls this mode is meant to exercise most thoroughly. That covers a tab's
    // own buttons ("Show weekly trend", "Inspect this model") as much as its
    // dropdowns; only the controls the default view renders are reload-safe.
    if (isolate && results.length > 0 && !control.contextual) {
      await page.close();
      page = await openPage(browser, pageFile, view, defaults);
      await page.evaluate(TAG_CONTROLS, INTERACTIVE_SELECTOR);
    }

    const outcome = await run();
    results.push({ ...control, ...outcome });
    // This interaction may have revealed a tab's own controls for the first time.
    await enqueueNewControls(cursor + 1, true);

    const where = `${control.tag}${control.id ? `#${control.id}` : ''}${control.label ? ` "${control.label}"` : ''}`;

    if (outcome.status === 'dead' && outcome.quiet === false) {
      // The DOM never stopped moving, so "nothing changed" is not trustworthy here.
      results[results.length - 1].status = 'inconclusive';
    } else if (outcome.status === 'dead' && (outcome.alreadySelected ?? control.alreadySelected)) {
      results[results.length - 1].status = 'noop-selected';
    } else if (outcome.status === 'dead') {
      findings.push({
        view: view.id,
        kind: 'dead-control',
        control: where,
        detail: control.tag === 'select'
          ? `changing it from '${control.from}' to '${control.target}' posts no message to the host and changes nothing on screen`
          : 'clicking it posts no message to the host and changes nothing on screen',
      });
    }
    if (outcome.status === 'error') {
      findings.push({
        view: view.id,
        kind: control.tag === 'select' ? 'change-threw' : 'click-threw',
        control: where,
        detail: outcome.errors.join(' | ').slice(0, 400),
      });
    }
    for (const message of outcome.posted || []) {
      const command = message && (message.command || message.type);
      if (typeof command === 'string' && !handledCommands.has(command)) {
        findings.push({
          view: view.id,
          kind: 'unhandled-command',
          control: where,
          detail: `posts '${command}', which no handler on the extension side matches`,
        });
      }
    }
  }

  await page.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });

  return {
    view: view.id,
    status: 'ok',
    renderErrors,
    controls: results,
    findings,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = readConfig(SKILL_DIR);
  const views = selectViews(config, args.view);

  if (views.length === 0) {
    console.error(`❌ No views selected${args.view ? ` for --view ${args.view}` : ''}.`);
    process.exit(2);
  }

  const handledCommands = loadHandledCommands();
  const chromium = loadChromium();
  const browser = await chromium.launch({ headless: true });

  const reports = [];
  try {
    for (const view of views) {
      reports.push(
        await smokeView({
          browser,
          view,
          defaults: config.defaults,
          handledCommands,
          isolate: Boolean(args.isolate),
        })
      );
    }
  } finally {
    await browser.close();
  }

  const findings = reports.flatMap((r) => r.findings);
  const errored = reports.filter((r) => r.status === 'error');

  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(path.resolve(args.out), JSON.stringify({ reports }, null, 2));
  }

  if (args.json) {
    console.log(JSON.stringify({ ok: findings.length === 0 && errored.length === 0, reports }, null, 2));
    process.exit(findings.length === 0 && errored.length === 0 ? 0 : 1);
  }

  console.log('🖱️  Webview interaction smoke\n');

  for (const report of reports) {
    if (report.status === 'error') {
      console.error(`   ${report.view.padEnd(22)} ❌ ${report.error}`);
      continue;
    }
    const counts = report.controls.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    const summary = Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ');
    const mark = report.findings.length === 0 ? '✅' : '❌';
    console.log(`   ${report.view.padEnd(22)} ${mark} ${report.controls.length} control(s): ${summary || 'none found'}`);
    if (report.renderErrors && report.renderErrors.length > 0) {
      console.log(`   ${' '.repeat(22)}    ⚠️  render error: ${report.renderErrors[0].split('\n')[0]}`);
    }
  }

  if (findings.length > 0) {
    console.error(`\n❌ ${findings.length} interaction finding(s):\n`);
    for (const finding of findings) {
      console.error(`   [${finding.view}] ${finding.kind}: ${finding.control}`);
      console.error(`      ${finding.detail}`);
    }
    console.error('');
  }

  if (errored.length > 0 || findings.length > 0) {
    console.error('❌ Interaction smoke failed!\n');
    process.exit(1);
  }

  console.log('\n✅ Every control does something when clicked.\n');
  process.exit(0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`❌ ${error && error.message ? error.message : error}`);
    process.exit(2);
  });
}
