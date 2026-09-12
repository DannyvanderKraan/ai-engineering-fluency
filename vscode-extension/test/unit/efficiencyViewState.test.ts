import test from 'node:test';
import * as assert from 'node:assert/strict';

import {
	activeBuckets,
	activeRange,
	activeResolution,
	activeResolutionOptions,
	canDrillInto,
	defaultScopeState,
	describeScope,
	drillBack,
	drillInto,
	isDrilled,
	normalizeScopeState,
	rangeExceedsBehaviorWindow,
	selectRange,
} from '../../src/webview/efficiency/viewState';
import type { EfficiencyScopeState } from '../../src/webview/efficiency/viewState';
import { buildEfficiencyBuckets, resolveEfficiencyRange } from '../../../src/efficiencyAnalysis';

// Fixed "now": Wednesday 2026-07-15 → current week Monday is 2026-07-13.
const NOW = new Date(2026, 6, 15, 12, 0, 0);

test('defaultScopeState: opens on the 12-week window with no filters and no drill-down', () => {
	const state = defaultScopeState();
	assert.equal(state.rangeId, 'last12w');
	assert.equal(state.resolution, 'auto');
	assert.equal(state.editor, '');
	assert.equal(state.vendor, '');
	assert.deepEqual(state.drill, []);
	assert.equal(isDrilled(state), false);
});

test('normalizeScopeState: a missing or non-object blob falls back to the defaults', () => {
	assert.deepEqual(normalizeScopeState(undefined), defaultScopeState());
	assert.deepEqual(normalizeScopeState(null), defaultScopeState());
	assert.deepEqual(normalizeScopeState('12 weeks'), defaultScopeState());
});

test('normalizeScopeState: legacy state missing the new fields is filled in with defaults', () => {
	// A state blob written before this feature existed carries only the tab.
	const state = normalizeScopeState({ activeTab: 'models' });
	assert.deepEqual(state, defaultScopeState());
});

test('normalizeScopeState: unrecognised range or resolution values are discarded, not carried forward', () => {
	const state = normalizeScopeState({ rangeId: 'last5y', resolution: 'hourly', editor: 'VS Code', vendor: 'Anthropic' });
	assert.equal(state.rangeId, 'last12w');
	assert.equal(state.resolution, 'auto');
	// Editor and vendor are free text: an editor that no longer exists simply
	// filters to nothing, which the view reports rather than silently ignoring.
	assert.equal(state.editor, 'VS Code');
	assert.equal(state.vendor, 'Anthropic');
});

test('normalizeScopeState: round-trips a valid persisted state', () => {
	const saved = { rangeId: 'last6m', resolution: 'monthly', editor: 'Claude Code', vendor: '', drill: [] };
	assert.deepEqual(normalizeScopeState(JSON.parse(JSON.stringify(saved))), {
		rangeId: 'last6m', resolution: 'monthly', editor: 'Claude Code', vendor: '', drill: [],
	});
});

test('normalizeScopeState: malformed or inverted drill entries are dropped', () => {
	const state = normalizeScopeState({
		drill: [
			{ label: 'good', startKey: '2026-07-01', endKey: '2026-07-07', id: 'custom' },
			{ label: 'inverted', startKey: '2026-07-07', endKey: '2026-07-01', id: 'custom' },
			{ label: 'incomplete' },
			'nonsense',
		],
	});
	assert.equal(state.drill.length, 1);
	assert.equal(state.drill[0].label, 'good');
});

test('activeRange / activeResolution: follow the selected preset when not drilled in', () => {
	const state = { ...defaultScopeState(), rangeId: 'last30d' as const };
	assert.equal(activeRange(state, NOW).startKey, '2026-06-16');
	assert.equal(activeResolution(state, NOW), 'daily');
	assert.equal(activeBuckets(state, NOW).length, 30);
});

test('activeResolutionOptions: offers only the widths the active range can carry', () => {
	assert.deepEqual(activeResolutionOptions({ ...defaultScopeState(), rangeId: 'last1y' }, NOW), ['weekly', 'monthly']);
	assert.deepEqual(activeResolutionOptions({ ...defaultScopeState(), rangeId: 'last30d' }, NOW), ['daily', 'weekly']);
});

test('canDrillInto: only aggregated buckets contain days to drill into', () => {
	assert.equal(canDrillInto('weekly'), true);
	assert.equal(canDrillInto('monthly'), true);
	assert.equal(canDrillInto('daily'), false);
});

test('drillInto: a weekly bucket becomes a daily range covering exactly that week', () => {
	const state = defaultScopeState();
	const week = activeBuckets(state, NOW)[0];
	const drilled = drillInto(state, week);
	assert.equal(isDrilled(drilled), true);
	assert.equal(drilled.resolution, 'daily');
	assert.equal(activeRange(drilled, NOW).startKey, week.startKey);
	assert.equal(activeRange(drilled, NOW).endKey, week.endKey);
	assert.equal(activeBuckets(drilled, NOW).length, 7);
});

test('drillInto: a daily bucket is inert — there is nothing below a day', () => {
	const state = { ...defaultScopeState(), rangeId: 'last30d' as const };
	const dayBucket = activeBuckets(state, NOW)[0];
	assert.equal(drillInto(state, dayBucket), state);
});

test('drillInto: the drill stack is bounded so Back never becomes an endless trail', () => {
	let state: EfficiencyScopeState = { ...defaultScopeState(), rangeId: 'last1y' };
	const month = activeBuckets(state, NOW)[0];
	for (let i = 0; i < 8; i++) { state = drillInto(state, { ...month, resolution: 'monthly' }); }
	assert.ok(state.drill.length <= 4);
});

test('drillBack: restores the preceding range and returns the preset to auto resolution', () => {
	const start = defaultScopeState();
	const week = activeBuckets(start, NOW)[3];
	const drilled = drillInto(start, week);
	const back = drillBack(drilled);
	assert.equal(isDrilled(back), false);
	assert.equal(back.resolution, 'auto');
	assert.deepEqual(activeRange(back, NOW), resolveEfficiencyRange('last12w', NOW));
});

test('drillBack: unwinds one level at a time, keeping deeper drills intact', () => {
	const start = { ...defaultScopeState(), rangeId: 'last1y' as const };
	const month = activeBuckets(start, NOW)[0];
	const first = drillInto(start, month);
	const week = buildEfficiencyBuckets(activeRange(first, NOW), 'weekly')[0];
	const second = drillInto({ ...first, resolution: 'weekly' }, week);
	assert.equal(second.drill.length, 2);
	const back = drillBack(second);
	assert.equal(back.drill.length, 1);
	assert.equal(activeRange(back, NOW).startKey, month.startKey);
});

test('drillBack: at the top of the stack it is a no-op', () => {
	const state = defaultScopeState();
	assert.equal(drillBack(state), state);
});

test('selectRange: picking a preset abandons the drill-down rather than nesting inside it', () => {
	const drilled = drillInto(defaultScopeState(), activeBuckets(defaultScopeState(), NOW)[0]);
	const next = selectRange(drilled, 'last6m');
	assert.equal(isDrilled(next), false);
	assert.equal(next.rangeId, 'last6m');
	assert.equal(next.resolution, 'auto');
});

test('selectRange: keeps the categorical filters — changing the window is not a reset', () => {
	const state = { ...defaultScopeState(), editor: 'VS Code', vendor: 'Anthropic' };
	const next = selectRange(state, 'last30d');
	assert.equal(next.editor, 'VS Code');
	assert.equal(next.vendor, 'Anthropic');
});

test('describeScope: announces range, bucket width and editor scope', () => {
	assert.equal(describeScope(defaultScopeState(), NOW), 'Last 12 weeks, weekly buckets, all editors');
	assert.equal(
		describeScope({ ...defaultScopeState(), rangeId: 'last30d', editor: 'Claude Code' }, NOW),
		'Last 30 days, daily buckets, Claude Code',
	);
});

test('rangeExceedsBehaviorWindow: true only when the range reaches past the session window', () => {
	assert.equal(rangeExceedsBehaviorWindow({ ...defaultScopeState(), rangeId: 'last30d' }, NOW, 84), false);
	assert.equal(rangeExceedsBehaviorWindow({ ...defaultScopeState(), rangeId: 'last12w' }, NOW, 84), false);
	assert.equal(rangeExceedsBehaviorWindow({ ...defaultScopeState(), rangeId: 'last1y' }, NOW, 84), true);
	// A payload that does not declare a window makes no claim either way.
	assert.equal(rangeExceedsBehaviorWindow({ ...defaultScopeState(), rangeId: 'last1y' }, NOW, undefined), false);
});
