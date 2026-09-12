import test from 'node:test';
import * as assert from 'node:assert/strict';

import {
	getCanonicalModelId,
	getCustomProviderGroup,
	getModelDisplayName,
	getModelVendor,
	isCustomProviderGroup,
	parseCustomProviderModel,
	UNCLASSIFIED_VENDOR,
	UNKNOWN_MODEL_ID,
} from '../../../src/webview/shared/modelUtils';
import { getBillingGroup } from '../../../src/chartDataBuilder';
import {
	setFormatLocale,
	getEditorIcon,
	getCharsPerToken,
	formatFixed,
	formatPercent,
	formatNumber,
	formatCost,
	formatDurationShort,
	formatFileSize,
	getTimeSince,
	escapeHtml,
	safeSectionHtml,
	markdownToHtml,
	STAGE_LABELS,
	STAGE_DESCRIPTIONS
} from '../../src/webview/shared/formatUtils';

// ── getModelDisplayName ─────────────────────────────────────────────────

test('getModelDisplayName: returns display name for known models', () => {
	assert.equal(getModelDisplayName('gpt-4o'), 'GPT-4o');
	assert.equal(getModelDisplayName('claude-sonnet-4.5'), 'Claude Sonnet 4.5');
	assert.equal(getModelDisplayName('o3-mini'), 'o3-mini');
	assert.equal(getModelDisplayName('gpt-5'), 'GPT-5');
});

test('getModelDisplayName: returns raw model ID for unknown models', () => {
	assert.equal(getModelDisplayName('some-future-model-99'), 'some-future-model-99');
	assert.equal(getModelDisplayName(''), '');
});

test('getModelDisplayName: decodes URI-encoded segments in unknown model IDs', () => {
	assert.equal(getModelDisplayName('provider/Model%20Name'), 'provider/Model Name');
});

test('getModelDisplayName: returns raw ID when URI decoding fails (malformed percent)', () => {
	assert.equal(getModelDisplayName('bad%2model'), 'bad%2model');
});

test('getModelDisplayName: drops the custom-endpoint prefix and provider name', () => {
	// Only the model part is shown — the provider name becomes its own provider group.
	assert.equal(getModelDisplayName('customendpoint/Mistral/MistralMedium3.5'), 'MistralMedium3.5');
	assert.equal(
		getModelDisplayName('unify-chat-provider/OpenCode%20Go%20(Anthropic%20Messages)/qwen3.7-max'),
		'qwen3.7-max'
	);
});

test('getModelDisplayName: resolves the friendly name of a custom-endpoint model part', () => {
	assert.equal(getModelDisplayName('customendpoint/Mistral/gpt-4o'), 'GPT-4o');
});

test('getModelDisplayName: resolves dash-separated version ids to the dotted pricing key', () => {
	assert.equal(getModelDisplayName('claude-opus-4-8'), 'Claude Opus 4.8');
	assert.equal(getModelDisplayName('claude-sonnet-4-6'), 'Claude Sonnet 4.6');
	assert.equal(getModelDisplayName('claude-haiku-4-5-20251001'), 'Claude Haiku 4.5 (2025-10-01)');
});

test('getModelDisplayName: resolves org-UUID-prefixed catalog ids to the friendly name of the model part', () => {
	assert.equal(
		getModelDisplayName('83a386ed-9f05-4fd9-83d4-f453d20c994c/mistral-medium-latest'),
		'Mistral Medium 3.5'
	);
	assert.equal(
		getModelDisplayName('83a386ed-9f05-4fd9-83d4-f453d20c994c/codestral-latest'),
		'Codestral'
	);
	assert.equal(
		getModelDisplayName('83a386ed-9f05-4fd9-83d4-f453d20c994c/devstral-latest'),
		'Devstral 2'
	);
});

test('getModelDisplayName: strips the org-UUID prefix for unknown catalog models', () => {
	assert.equal(
		getModelDisplayName('83a386ed-9f05-4fd9-83d4-f453d20c994c/some-private-model'),
		'some-private-model'
	);
});

// ── parseCustomProviderModel ────────────────────────────────────────────

test('parseCustomProviderModel: splits a three-part custom-endpoint ID', () => {
	assert.deepEqual(parseCustomProviderModel('customendpoint/Mistral/mistral-medium-latest'), {
		source: 'customendpoint',
		providerName: 'Mistral',
		modelId: 'mistral-medium-latest'
	});
});

test('parseCustomProviderModel: URI-decodes each part', () => {
	assert.deepEqual(parseCustomProviderModel('unify-chat-provider/OpenCode%20Go/qwen3.7-max'), {
		source: 'unify-chat-provider',
		providerName: 'OpenCode Go',
		modelId: 'qwen3.7-max'
	});
});

test('parseCustomProviderModel: returns undefined unless there are exactly three non-empty parts', () => {
	assert.equal(parseCustomProviderModel('gpt-4o'), undefined);
	assert.equal(parseCustomProviderModel('provider/Model%20Name'), undefined);
	assert.equal(parseCustomProviderModel('customendpoint//mistral-medium-latest'), undefined);
	assert.equal(parseCustomProviderModel('a/b/c/d'), undefined);
	assert.equal(parseCustomProviderModel(''), undefined);
});

// ── getCustomProviderGroup / isCustomProviderGroup ──────────────────────

test('getCustomProviderGroup: names the group after the user-chosen provider', () => {
	assert.equal(getCustomProviderGroup('customendpoint/Mistral/mistral-medium-latest'), 'Mistral (Custom)');
	assert.equal(getCustomProviderGroup('unify-chat-provider/OpenCode%20Go/qwen3.7-max'), 'OpenCode Go (Custom)');
});

test('getCustomProviderGroup: returns undefined for regular model IDs', () => {
	assert.equal(getCustomProviderGroup('gpt-4o'), undefined);
	assert.equal(getCustomProviderGroup('provider/Model%20Name'), undefined);
});

test('isCustomProviderGroup: recognizes only custom provider groups', () => {
	assert.equal(isCustomProviderGroup('Mistral (Custom)'), true);
	assert.equal(isCustomProviderGroup('Mistral AI'), false);
	assert.equal(isCustomProviderGroup('GitHub Copilot'), false);
});

// ── getCanonicalModelId / getModelVendor ────────────────────────────────

test('getCanonicalModelId: wrapper ids and version spellings collapse onto one identity', () => {
	const canonical = getCanonicalModelId('claude-opus-4.8');
	assert.equal(getCanonicalModelId('copilot/claude-opus-4-8'), canonical);
	assert.equal(getCanonicalModelId('copilot/claude-opus-4.8'), canonical);
	assert.equal(getCanonicalModelId('3b0f52c1-9d4e-4a77-8b21-77c1f0a9e512/claude-opus-4-8'), canonical);
	assert.equal(getCanonicalModelId('CLAUDE-OPUS-4.8'), canonical);
});

test('getCanonicalModelId: a custom endpoint is identified by its model, not the user-typed label', () => {
	assert.equal(getCanonicalModelId('customendpoint/Acme Corp/mistral-medium-latest'), 'mistral-medium-latest');
	// Two endpoints labelled differently but serving the same model are one model.
	assert.equal(
		getCanonicalModelId('customendpoint/Acme Corp/mistral-medium-latest'),
		getCanonicalModelId('unify-chat-provider/Skunkworks/mistral-medium-latest'),
	);
});

test('getCanonicalModelId: sessions that name no model get the unknown identity', () => {
	assert.equal(getCanonicalModelId(''), UNKNOWN_MODEL_ID);
	assert.equal(getCanonicalModelId('   '), UNKNOWN_MODEL_ID);
});

test('getCanonicalModelId: the no-model marker cannot be produced by a real model id', () => {
	// Canonicalization lowercases everything it returns, so a marker carrying a
	// capital letter is unreachable — which is the point: a custom endpoint's
	// free-text model part passes straight through.
	assert.notEqual(UNKNOWN_MODEL_ID, UNKNOWN_MODEL_ID.toLowerCase(), 'the marker needs a capital letter to stay unreachable');
	assert.notEqual(getCanonicalModelId('customendpoint/Acme/unknown'), UNKNOWN_MODEL_ID);
	assert.notEqual(getCanonicalModelId('Unattributed'), UNKNOWN_MODEL_ID);
	assert.equal(getCanonicalModelId(''), UNKNOWN_MODEL_ID);
});

test('getCanonicalModelId: dash and dot version spellings collapse regardless of pricing', () => {
	// The candidate list is scanned most-normalized-first, so which spellings the
	// pricing catalog happens to carry cannot split one model into two.
	assert.equal(getCanonicalModelId('claude-sonnet-4-6'), getCanonicalModelId('claude-sonnet-4.6'));
	assert.equal(getCanonicalModelId('copilot/claude-sonnet-4-6'), getCanonicalModelId('claude-sonnet-4.6'));
});

test('getModelVendor: classifies the model maker from the model id', () => {
	assert.equal(getModelVendor('claude-sonnet-4.5'), 'Anthropic');
	assert.equal(getModelVendor('copilot/claude-opus-4-8'), 'Anthropic');
	assert.equal(getModelVendor('gpt-5'), 'OpenAI');
	assert.equal(getModelVendor('o4-mini'), 'OpenAI');
	assert.equal(getModelVendor('gemini-2.5-pro'), 'Google');
	assert.equal(getModelVendor('grok-4'), 'xAI');
	assert.equal(getModelVendor('mistral-medium-latest'), 'Mistral AI');
});

test('getModelVendor: is the model maker, not the billing group', () => {
	// On a Copilot surface the *bill* is GitHub Copilot's whatever model runs;
	// the vendor filter has to keep reporting who built the model.
	assert.equal(getBillingGroup('VS Code', 'claude-sonnet-4.5'), 'GitHub Copilot');
	assert.equal(getModelVendor('claude-sonnet-4.5'), 'Anthropic');
	// And a custom endpoint bills under the user's own label, which is not a maker.
	assert.equal(getBillingGroup('VS Code', 'customendpoint/Acme Corp/mistral-medium-latest'), 'Acme Corp (Custom)');
	assert.equal(getModelVendor('customendpoint/Acme Corp/mistral-medium-latest'), 'Mistral AI');
});

test('getCanonicalModelId: an upper-case wrapper still collapses onto the plain id', () => {
	// The candidate builder strips `copilot/` case-sensitively, so the raw id has
	// to be lowercased before the lookup, not only after it.
	assert.equal(getCanonicalModelId('COPILOT/claude-opus-4.8'), getCanonicalModelId('claude-opus-4.8'));
	assert.equal(getCanonicalModelId('Copilot/GPT-5'), getCanonicalModelId('gpt-5'));
	assert.equal(getModelVendor('COPILOT/claude-opus-4.8'), 'Anthropic');
});

test('getModelVendor: a vendor prefix only matches as a whole token', () => {
	// Otherwise every unrecognized id starting with those letters would be
	// silently claimed by a vendor — the exact guessing Unclassified prevents.
	assert.equal(getModelVendor('gptish-internal'), UNCLASSIFIED_VENDOR);
	assert.equal(getModelVendor('claudefake'), UNCLASSIFIED_VENDOR);
	assert.equal(getModelVendor('grokking-around'), UNCLASSIFIED_VENDOR);
	assert.equal(getModelVendor('geminized'), UNCLASSIFIED_VENDOR);
	// Real ids still classify, whether the prefix is followed by a separator or a digit.
	assert.equal(getModelVendor('gpt-5'), 'OpenAI');
	assert.equal(getModelVendor('gpt5'), 'OpenAI');
	assert.equal(getModelVendor('o4-mini'), 'OpenAI');
	assert.equal(getModelVendor('claude-sonnet-4.5'), 'Anthropic');
	assert.equal(getModelVendor('gemini-2.5-pro'), 'Google');
	assert.equal(getModelVendor('llama3'), 'Meta');
	assert.equal(getModelVendor('codex'), 'OpenAI');
});

test('getModelVendor: unrecognized models stay visible as Unclassified rather than being guessed at', () => {
	assert.equal(getModelVendor('acme-internal-v2'), UNCLASSIFIED_VENDOR);
	assert.equal(getModelVendor('customendpoint/Acme Corp/acme-internal-v2'), UNCLASSIFIED_VENDOR);
	assert.equal(getModelVendor(''), UNCLASSIFIED_VENDOR);
	// Unclassified is a bucket, not a drop: the model keeps a usable identity.
	assert.equal(getCanonicalModelId('acme-internal-v2'), 'acme-internal-v2');
});

// ── formatDurationShort ─────────────────────────────────────────────────

test('formatDurationShort: formats minutes-only durations', () => {
	assert.equal(formatDurationShort(12 * 60 * 1000), '12m');
	assert.equal(formatDurationShort(59 * 60 * 1000), '59m');
});

test('formatDurationShort: formats hour durations with zero-padded minutes', () => {
	assert.equal(formatDurationShort(64 * 60 * 1000), '1h 04m');
	assert.equal(formatDurationShort(2 * 60 * 60 * 1000), '2h 00m');
	assert.equal(formatDurationShort((60 + 30) * 60 * 1000), '1h 30m');
});

test('formatDurationShort: formats sub-minute durations as <1m', () => {
	assert.equal(formatDurationShort(0), '<1m');
	assert.equal(formatDurationShort(29 * 1000), '<1m');
});

test('formatDurationShort: returns em dash for missing or invalid values', () => {
	assert.equal(formatDurationShort(undefined), '—');
	assert.equal(formatDurationShort(-1), '—');
	assert.equal(formatDurationShort(Number.NaN), '—');
});

// ── getEditorIcon ───────────────────────────────────────────────────────

test('getEditorIcon: returns correct icons for known editors', () => {
	assert.equal(getEditorIcon('VS Code'), '💙');
	assert.equal(getEditorIcon('Cursor'), '🖱️');
	assert.equal(getEditorIcon('OpenCode'), '🟢');
	assert.equal(getEditorIcon('Gemini CLI'), '💎');
	assert.equal(getEditorIcon('Unknown'), '❓');
});

test('getEditorIcon: returns fallback icon for unrecognized editors', () => {
	assert.equal(getEditorIcon('SomeNewEditor'), '📝');
});

// ── getCharsPerToken ────────────────────────────────────────────────────

test('getCharsPerToken: returns a positive number for known models', () => {
	const result = getCharsPerToken('gpt-4o');
	assert.ok(result > 0, 'chars per token should be positive');
	assert.ok(result < 20, 'chars per token should be reasonable');
});

test('getCharsPerToken: returns default for unknown models', () => {
	const result = getCharsPerToken('nonexistent-model-xyz');
	// Default ratio is 0.25, so 1/0.25 = 4
	assert.equal(result, 4);
});

// ── formatFixed ─────────────────────────────────────────────────────────

test('formatFixed: formats to specified decimal places', () => {
	setFormatLocale('en-US');
	assert.equal(formatFixed(3.14159, 2), '3.14');
	assert.equal(formatFixed(1000, 0), '1,000');
	assert.equal(formatFixed(0.5, 3), '0.500');
});

// ── formatPercent ───────────────────────────────────────────────────────

test('formatPercent: formats as percentage with default 1 decimal', () => {
	setFormatLocale('en-US');
	assert.equal(formatPercent(42.567), '42.6%');
	assert.equal(formatPercent(100, 0), '100%');
	assert.equal(formatPercent(0), '0.0%');
});

// ── formatNumber ────────────────────────────────────────────────────────

test('formatNumber: adds thousand separators', () => {
	setFormatLocale('en-US');
	assert.equal(formatNumber(1234567), '1,234,567');
	assert.equal(formatNumber(42), '42');
	assert.equal(formatNumber(0), '0');
});

// ── formatCost ──────────────────────────────────────────────────────────

test('formatCost: formats as USD with 2 decimal places', () => {
	setFormatLocale('en-US');
	const result = formatCost(1.23456789);
	assert.ok(result.includes('$'), 'should contain dollar sign');
	assert.ok(result.includes('1.23'), 'should round to 2 decimal places');
});

test('formatCost: zero cost', () => {
	setFormatLocale('en-US');
	const result = formatCost(0);
	assert.ok(result.includes('$'), 'should contain dollar sign');
	assert.ok(result.includes('0.00'), 'should show two decimal zeros');
});

// ── escapeHtml ──────────────────────────────────────────────────────────

test('escapeHtml: escapes ampersand, angle brackets, double quote, single quote', () => {
	assert.equal(escapeHtml('a & b'), 'a &amp; b');
	assert.equal(escapeHtml('<div>'), '&lt;div&gt;');
	assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;');
	assert.equal(escapeHtml("it's"), 'it&#039;s');
});

test('escapeHtml: leaves safe text unchanged', () => {
	assert.equal(escapeHtml('hello world'), 'hello world');
});

test('escapeHtml: neutralises a script injection attempt', () => {
	const result = escapeHtml('<script>alert("xss")</script>');
	assert.ok(!result.includes('<script'));
	assert.equal(result, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
});

// ── safeSectionHtml ───────────────────────────────────────────────────────

test('safeSectionHtml: returns the builder output when it succeeds', () => {
	const result = safeSectionHtml('My Section', () => '<div>ok</div>');
	assert.equal(result, '<div>ok</div>');
});

test('safeSectionHtml: catches a thrown error and renders a fallback card instead', () => {
	const errors: string[] = [];
	const result = safeSectionHtml('Model Efficiency', () => {
		throw new Error('boom');
	}, (m) => errors.push(m));

	assert.ok(result.includes('Model Efficiency'));
	assert.ok(result.includes("couldn't be displayed"));
	assert.equal(errors.length, 1);
	assert.ok(errors[0].includes('Model Efficiency'));
	assert.ok(errors[0].includes('boom'));
});

test('safeSectionHtml: handles non-Error throws (e.g. a thrown string)', () => {
	const errors: string[] = [];
	const result = safeSectionHtml('Weird Section', () => {
		// eslint-disable-next-line @typescript-eslint/no-throw-literal
		throw 'not an Error instance';
	}, (m) => errors.push(m));

	assert.ok(result.includes('Weird Section'));
	assert.ok(errors[0].includes('not an Error instance'));
});

test('safeSectionHtml: escapes the label in the fallback card to avoid HTML injection', () => {
	const result = safeSectionHtml('<img src=x onerror=alert(1)>', () => {
		throw new Error('boom');
	}, () => { /* noop */ });

	assert.ok(!result.includes('<img src=x'));
	assert.ok(result.includes('&lt;img'));
});

test('safeSectionHtml: one failing section does not affect independently built sections', () => {
	const sectionA = safeSectionHtml('Section A', () => '<div>a-ok</div>', () => { /* noop */ });
	const sectionB = safeSectionHtml('Section B', () => { throw new Error('section B broke'); }, () => { /* noop */ });
	const sectionC = safeSectionHtml('Section C', () => '<div>c-ok</div>', () => { /* noop */ });

	const page = `${sectionA}${sectionB}${sectionC}`;
	assert.ok(page.includes('a-ok'));
	assert.ok(page.includes('c-ok'));
	assert.ok(page.includes('Section B'));
});

// ── markdownToHtml ──────────────────────────────────────────────────────

test('markdownToHtml: converts markdown link to anchor tag', () => {
	const result = markdownToHtml('[click here](https://example.com)');
	assert.equal(result, '<a href="https://example.com" target="_blank" rel="noopener noreferrer">click here</a>');
});

test('markdownToHtml: escapes HTML outside of links', () => {
	const result = markdownToHtml('See <this> & [link](https://example.com)');
	assert.ok(result.includes('&lt;this&gt;'));
	assert.ok(result.includes('&amp;'));
	assert.ok(result.includes('<a href='));
});

test('markdownToHtml: plain text without links is just HTML-escaped', () => {
	assert.equal(markdownToHtml('hello & world'), 'hello &amp; world');
});

test('markdownToHtml: generated anchor has target=_blank and rel=noopener noreferrer', () => {
	const result = markdownToHtml('[docs](https://docs.example.com)');
	assert.ok(result.includes('target="_blank"'));
	assert.ok(result.includes('rel="noopener noreferrer"'));
});

// ── STAGE_LABELS ────────────────────────────────────────────────────────

test('STAGE_LABELS: defines labels for all four stages', () => {
	assert.equal(STAGE_LABELS[1], 'Stage 1: AI Skeptic');
	assert.equal(STAGE_LABELS[2], 'Stage 2: AI Explorer');
	assert.equal(STAGE_LABELS[3], 'Stage 3: AI Collaborator');
	assert.equal(STAGE_LABELS[4], 'Stage 4: AI Strategist');
});

// ── STAGE_DESCRIPTIONS ──────────────────────────────────────────────────

test('STAGE_DESCRIPTIONS: defines descriptions for all four stages', () => {
	assert.ok(STAGE_DESCRIPTIONS[1].length > 0);
	assert.ok(STAGE_DESCRIPTIONS[2].length > 0);
	assert.ok(STAGE_DESCRIPTIONS[3].length > 0);
	assert.ok(STAGE_DESCRIPTIONS[4].length > 0);
});

// ── formatFileSize ──────────────────────────────────────────────────────

test('formatFileSize: bytes below 1 KB show as B', () => {
	assert.equal(formatFileSize(512), '512 B');
});

test('formatFileSize: kilobytes use one decimal', () => {
	assert.equal(formatFileSize(1536), '1.5 KB');
});

test('formatFileSize: megabytes use two decimals', () => {
	assert.equal(formatFileSize(5 * 1024 * 1024), '5.00 MB');
});

test('formatFileSize: scales into GB', () => {
	assert.equal(formatFileSize(3 * 1024 ** 3), '3.00 GB');
});

test('formatFileSize: scales into TB', () => {
	assert.equal(formatFileSize(2 * 1024 ** 4), '2.00 TB');
});

test('formatFileSize: scales into PB and caps there', () => {
	assert.equal(formatFileSize(4 * 1024 ** 5), '4.00 PB');
	assert.equal(formatFileSize(2048 * 1024 ** 5), '2048.00 PB');
});

test('formatFileSize: rejects negative and non-finite values', () => {
	assert.equal(formatFileSize(-1), 'N/A');
	assert.equal(formatFileSize(NaN), 'N/A');
});

// ── getTimeSince ────────────────────────────────────────────────────────

test('getTimeSince: returns "Unknown" for invalid timestamps instead of NaN text', () => {
	assert.equal(getTimeSince('not-a-date'), 'Unknown');
	assert.equal(getTimeSince(''), 'Unknown');
});

test('getTimeSince: returns "Just now" for future timestamps', () => {
	assert.equal(getTimeSince(new Date(Date.now() + 60_000).toISOString()), 'Just now');
});

test('getTimeSince: formats seconds, minutes, hours and days', () => {
	assert.equal(getTimeSince(new Date(Date.now() - 5_000).toISOString()), '5 seconds ago');
	assert.equal(getTimeSince(new Date(Date.now() - 3 * 60_000).toISOString()), '3 minutes ago');
	assert.equal(getTimeSince(new Date(Date.now() - 2 * 3_600_000).toISOString()), '2 hours ago');
	assert.equal(getTimeSince(new Date(Date.now() - 4 * 86_400_000).toISOString()), '4 days ago');
});
