import test from 'node:test';
import * as assert from 'node:assert/strict';

import {
	buildEfficiencyTrends,
	buildEfficiencyWeekDetail,
	buildModelWeekDetail,
	buildModelWeeklySeries,
	buildSkillUsageTrends,
	buildSkillWeekDetail,
	EFFICIENCY_TREND_RANGES,
	type EfficiencyDeps,
	type EfficiencySessionInput,
} from '../../../src/efficiencyAnalysis';
import { createEmptyDailyModelEfficiencyEntry } from '../../../src/modelEfficiency';
import { setFormatLocale } from '../../src/webview/shared/formatUtils';
import {
	clampSelectedWeek,
	fmtValue,
	renderModelWeekDetail,
	renderRangeControls,
	renderSkillWeekDetail,
	renderWeekDetail,
	renderWeekPicker,
	trendMetricForDelta,
} from '../../src/webview/efficiency/weekDetail';
import type { DailyModelEfficiency, DailyModelEfficiencyEntry, DailyTokenStats, ModelUsage } from '../../../src/types';

// Pin the locale so grouping separators are deterministic wherever the suite runs.
setFormatLocale('en-US');

// Fixed "now": Wednesday 2026-07-15 → the current week starts Monday 2026-07-13.
const NOW = new Date(2026, 6, 15, 12, 0, 0);

const deps: EfficiencyDeps = {
	calculateEstimatedCost: (mu: ModelUsage) => {
		let tokens = 0;
		for (const u of Object.values(mu)) { tokens += u.inputTokens + u.outputTokens; }
		return (tokens / 1_000_000) * 10;
	},
	now: NOW,
};

function day(date: string, overrides: Partial<DailyTokenStats> = {}): DailyTokenStats {
	return { date, tokens: 0, sessions: 0, interactions: 0, modelUsage: {}, editorUsage: {}, repositoryUsage: {}, ...overrides };
}

/** Two weeks of data at the end of a 12-week horizon, so prior-week comparisons exist. */
function series(): ReturnType<typeof buildEfficiencyTrends> {
	const days = [
		day('2026-07-07', { tokens: 40_000, sessions: 4, interactions: 24, linesAdded: 600, linesRemoved: 200, modelUsage: { kimi: { inputTokens: 30_000, outputTokens: 10_000, sessions: 4 } } }),
		day('2026-07-14', { tokens: 30_000, sessions: 5, interactions: 20, linesAdded: 400, linesRemoved: 100, modelUsage: { kimi: { inputTokens: 20_000, outputTokens: 10_000, sessions: 5 } } }),
	];
	const sessions: EfficiencySessionInput[] = [
		{ dayKey: '2026-07-07', activeDurationMs: 30 * 60_000, editTurns: 20, retries: 4, applies: 8, codeBlocks: 10 },
		{ dayKey: '2026-07-14', activeDurationMs: 18 * 60_000, editTurns: 20, retries: 2, applies: 9, codeBlocks: 10 },
	];
	return buildEfficiencyTrends(days, sessions, deps, 12);
}

function modelDay(date: string, models: { [model: string]: Partial<DailyModelEfficiencyEntry> }): DailyTokenStats {
	const modelEfficiency: DailyModelEfficiency = {};
	for (const [model, overrides] of Object.entries(models)) {
		modelEfficiency[model] = { ...createEmptyDailyModelEfficiencyEntry(), ...overrides };
	}
	return { date, tokens: 0, sessions: 0, interactions: 0, modelUsage: {}, editorUsage: {}, repositoryUsage: {}, modelEfficiency };
}

// ── Selection rules ──────────────────────────────────────────────────────────

test('clampSelectedWeek: keeps a week that is still in the series', () => {
	assert.equal(clampSelectedWeek(['a', 'b'], 'b'), 'b');
});

test('clampSelectedWeek: drops a selection that fell outside a narrowed horizon', () => {
	// A week picked at 52 weeks must not resolve to some other week at 12.
	assert.equal(clampSelectedWeek(['2026-07-06', '2026-07-13'], '2026-01-05'), null);
	assert.equal(clampSelectedWeek([], '2026-07-13'), null);
	assert.equal(clampSelectedWeek(['2026-07-13'], null), null);
});

test('trendMetricForDelta: maps the Month vs Month cards that have a weekly equivalent', () => {
	assert.equal(trendMetricForDelta('turns-per-session'), 'turns-per-session');
	assert.equal(trendMetricForDelta('active-minutes-per-session'), 'active-minutes');
	assert.equal(trendMetricForDelta('retry-rate'), 'retry-rate');
	assert.equal(trendMetricForDelta('apply-rate'), 'apply-rate');
	assert.equal(trendMetricForDelta('tokens-per-session'), 'tokens-per-session');
});

test('trendMetricForDelta: month-only cards map to nothing rather than to an unrelated chart', () => {
	assert.equal(trendMetricForDelta('low-cost-share'), null);
	assert.equal(trendMetricForDelta('cost-per-session'), null);
	assert.equal(trendMetricForDelta('made-up-id'), null);
});

test('fmtValue: an unavailable metric renders as a dash, never as zero', () => {
	assert.equal(fmtValue(null, 'currency'), '—');
	assert.equal(fmtValue(null, 'percent'), '—');
	assert.equal(fmtValue(0, 'currency'), '$0.00');
	assert.equal(fmtValue(0.125, 'percent'), '12.5%');
	assert.equal(fmtValue(3, 'count'), '3');
});

// ── Horizon selector ─────────────────────────────────────────────────────────

test('renderRangeControls: offers every horizon and marks the selected one without relying on colour', () => {
	const html = renderRangeControls(EFFICIENCY_TREND_RANGES, '26w', false);
	for (const range of EFFICIENCY_TREND_RANGES) {
		assert.ok(html.includes(`data-range="${range.id}"`), `${range.id} button`);
		assert.ok(html.includes(range.label), `${range.id} label`);
	}
	assert.ok(html.includes('aria-pressed="true"'));
	assert.equal(html.match(/aria-pressed="true"/g)?.length, 1);
	assert.equal(html.match(/aria-pressed="false"/g)?.length, 2);
	// The group carries an accessible name pointing at its visible label.
	assert.ok(html.includes('aria-labelledby="eff-range-label"'));
	assert.ok(html.includes('id="eff-range-label"'));
});

test('renderRangeControls: button text comes from the localization bundle, not the payload prose', () => {
	// The payload's `label` is locale-neutral data; the webview resolves the
	// display text by range id so a zh-CN webview does not render English here.
	const html = renderRangeControls([{ id: '26w', weeks: 26, label: 'NOT-THE-BUNDLE-TEXT' }], '26w', false);
	assert.ok(html.includes('26 weeks'), html);
	assert.ok(!html.includes('NOT-THE-BUNDLE-TEXT'), html);
});

test('renderRangeControls: a pending horizon is announced, not enforced by disabling the buttons', () => {
	const loading = renderRangeControls(EFFICIENCY_TREND_RANGES, '12w', true);
	assert.ok(loading.includes('aria-busy="true"'));
	assert.ok(loading.includes('role="status"'));
	assert.ok(loading.includes('Loading the selected horizon'));
	// Disabling would drop keyboard focus mid-interaction and block a second choice.
	assert.ok(!loading.includes('disabled'));

	const idle = renderRangeControls(EFFICIENCY_TREND_RANGES, '12w', false);
	assert.ok(idle.includes('aria-busy="false"'));
	assert.ok(!idle.includes('Loading the selected horizon'));
});

// ── Week selector ────────────────────────────────────────────────────────────

test('renderWeekPicker: is a labelled native select, not a canvas-only affordance', () => {
	const html = renderWeekPicker(series(), null, NOW);
	assert.ok(html.includes('<label class="eff-control-label" for="eff-week-select">'));
	assert.ok(html.includes('Selected week'));
	assert.ok(html.includes('<select id="eff-week-select"'));
	// 12 weeks plus the "no week selected" option.
	assert.equal(html.match(/<option /g)?.length, 13);
	assert.ok(html.includes('You can also click a point on a chart.'));
});

test('renderWeekPicker: the empty option is selected when no week is chosen', () => {
	const html = renderWeekPicker(series(), null, NOW);
	assert.ok(html.includes('<option value="" selected>'));
});

test('renderWeekPicker: the chosen week is the selected option and shows its date span', () => {
	const html = renderWeekPicker(series(), '2026-07-13', NOW);
	assert.ok(html.includes('<option value="2026-07-13" selected>'));
	assert.ok(!html.includes('<option value="" selected>'));
	assert.match(html, /Jul 13.*Jul 19/);
});

// ── Detail region ────────────────────────────────────────────────────────────

test('renderWeekDetail: with no selection, the live region explains how to make one', () => {
	const html = renderWeekDetail(null);
	assert.ok(html.includes('id="eff-week-detail"'));
	assert.ok(html.includes('role="region"'));
	assert.ok(html.includes('aria-live="polite"'));
	assert.ok(html.includes('No week selected.'));
});

test('renderWeekDetail: shows the raw volume and the date range behind the selected point', () => {
	const html = renderWeekDetail(buildEfficiencyWeekDetail(series(), '2026-07-06', NOW));
	assert.ok(html.includes('Raw volume'));
	assert.ok(html.includes('Sessions'));
	assert.ok(html.includes('Estimated cost'));
	assert.match(html, /Jul 6.*Jul 12/);
	// A complete week carries no partial-week chip.
	assert.ok(!html.includes('week-chip'));
});

test('renderWeekDetail: the current week is labelled partial', () => {
	const html = renderWeekDetail(buildEfficiencyWeekDetail(series(), '2026-07-13', NOW));
	assert.ok(html.includes('week-chip'));
	assert.ok(html.includes('Partial week'));
	assert.ok(html.includes('Partial week: 3 of 7 days elapsed'));
});

test('renderWeekDetail: an unavailable metric shows a dash and the reason, never a zero', () => {
	const weeks = series();
	const html = renderWeekDetail(buildEfficiencyWeekDetail(weeks, weeks[0].weekKey, NOW));
	assert.ok(html.includes('No sessions were recorded in this week.'));
	assert.ok(html.includes('model-row-muted'));
	// Raw volume legitimately reads zero; the derived ratios must not.
	const ratios = html.slice(html.indexOf('Derived ratios'));
	assert.ok(!ratios.includes('$'), ratios);
	assert.ok(!ratios.includes('0.0%'), ratios);
	// 7 metrics × (this week, prior week, change) — all three cells unavailable.
	assert.equal(ratios.match(/>—</g)?.length, 21);
});

test('renderWeekDetail: the change cell states the direction in words, not only in colour', () => {
	const html = renderWeekDetail(buildEfficiencyWeekDetail(series(), '2026-07-13', NOW));
	assert.ok(html.includes('better') || html.includes('worse'), html);
	assert.ok(html.includes('Prior week: '));
});

test('renderWeekDetail: the first week of the horizon says it has nothing to compare against', () => {
	const weeks = series();
	const html = renderWeekDetail(buildEfficiencyWeekDetail(weeks, weeks[0].weekKey, NOW));
	assert.ok(html.includes('No prior week inside the selected horizon.'));
});

// ── Tools & Skills detail ────────────────────────────────────────────────────

test('renderSkillWeekDetail: lists the week’s skills and escapes their names', () => {
	const sessions: EfficiencySessionInput[] = [
		{ dayKey: '2026-07-07', skillCalls: { graphify: 2 } },
		{ dayKey: '2026-07-14', skillCalls: { '<img src=x onerror=alert(1)>': 3 } },
	];
	const trends = buildSkillUsageTrends(sessions, deps, 12);
	const html = renderSkillWeekDetail(buildSkillWeekDetail(trends, '2026-07-13', NOW));
	assert.ok(html.includes('Skill invocations this week'));
	assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
	assert.ok(!html.includes('<img src=x'));
});

test('renderSkillWeekDetail: carries the same raw volume as the other tabs when the week is supplied', () => {
	const trends = buildSkillUsageTrends([{ dayKey: '2026-07-14', skillCalls: { graphify: 2 } }], deps, 12);
	const week = buildEfficiencyWeekDetail(series(), '2026-07-13', NOW);
	const html = renderSkillWeekDetail(buildSkillWeekDetail(trends, '2026-07-13', NOW), week);
	for (const label of ['Raw volume', 'Sessions', 'Tokens', 'Turns', 'Lines changed', 'Estimated cost']) {
		assert.ok(html.includes(label), `${label} missing from the skills drill-down`);
	}
	// Still shows the skill-specific part.
	assert.ok(html.includes('Skill invocations this week'));
});

test('renderSkillWeekDetail: a week with no invocations says so instead of rendering an empty table', () => {
	const trends = buildSkillUsageTrends([], deps, 12);
	const html = renderSkillWeekDetail(buildSkillWeekDetail(trends, '2026-07-13', NOW));
	assert.ok(html.includes('No skill invocations were recorded in this week.'));
});

// ── Models detail ────────────────────────────────────────────────────────────

test('renderModelWeekDetail: an unused model reports unavailability rather than a zeroed profile', () => {
	const modelSeries = buildModelWeeklySeries([modelDay('2026-07-14', { kimi: { sessions: 4, sessionShare: 4, inputTokens: 1000, outputTokens: 200, cost: 1 } })], 'kimi', NOW, 12);
	const html = renderModelWeekDetail([buildModelWeekDetail(modelSeries, 'kimi', modelSeries[0].weekKey, NOW)]);
	assert.ok(html.includes('was not used in this week'));
	assert.ok(html.includes('>—<'));
});

test('renderModelWeekDetail: describes every compared model, so a click on either series is not misattributed', () => {
	const days = [modelDay('2026-07-14', {
		kimi: { sessions: 6, sessionShare: 6, editTurns: 20, inputTokens: 90_000, outputTokens: 10_000, cost: 4 },
		qwen: { sessions: 3, sessionShare: 3, editTurns: 12, inputTokens: 40_000, outputTokens: 5_000, cost: 1 },
	})];
	const details = ['kimi', 'qwen'].map(model =>
		buildModelWeekDetail(buildModelWeeklySeries(days, model, NOW, 12), model, '2026-07-13', NOW));
	const html = renderModelWeekDetail(details);
	assert.ok(html.includes('kimi'), html);
	assert.ok(html.includes('qwen'), html);
	// One live region, one block per model.
	assert.equal(html.match(/id="eff-week-detail"/g)?.length, 1);
	assert.equal(html.match(/class="week-model-block"/g)?.length, 2);
	// Raw volume includes the edit turns backing the turn-based ratios.
	assert.ok(html.includes('Edit turns'));
});

test('renderModelWeekDetail: no models selected falls back to the empty region', () => {
	assert.ok(renderModelWeekDetail([]).includes('No week selected.'));
});

test('renderModelWeekDetail: keeps the sample-floor caveats visible under "Read with care"', () => {
	const thin = { sessions: 1, sessionShare: 1, calls: 2, editTurns: 2, oneShotEditTurns: 1, retries: 1, inputTokens: 900, outputTokens: 100, cost: 1 };
	const modelSeries = buildModelWeeklySeries([modelDay('2026-07-14', { kimi: thin })], 'kimi', NOW, 12);
	const html = renderModelWeekDetail([buildModelWeekDetail(modelSeries, 'kimi', '2026-07-13', NOW)]);
	assert.ok(html.includes('Read with care'));
	assert.ok(html.includes('session equivalents'));
	assert.ok(html.includes('edit turns'));
});

test('renderModelWeekDetail: with no selection it falls back to the same empty live region', () => {
	const html = renderModelWeekDetail([null]);
	assert.ok(html.includes('aria-live="polite"'));
	assert.ok(html.includes('No week selected.'));
});
