import test from 'node:test';
import * as assert from 'node:assert/strict';

import {
	buildEfficiencyTrends,
	buildSkillUsageTrends,
	computeCostAttribution,
	computeSkillImpact,
	computeEfficiencyDeltas,
	computeValueSignals,
	getTrailingWindowBoundaries,
	splitTrailingWindows,
	computeModelPeriodMetrics,
	listComparableModels,
	compareModels,
	buildModelWeeklySeries,
	resolveModelCompareWindow,
	selectDaysInWindow,
	windowHasModelData,
	aggregateCombinedWeekly,
	buildCombinedDaily,
	listCombinedFacets,
	reconcileCombinedFilter,
	summarizeCombinedSelection,
	COMBINED_FILTER_ALL,
	UNFILTERED_COMBINED,
	type CombinedFilter,
	type EfficiencyDeps,
	type EfficiencySessionInput,
} from '../../../src/efficiencyAnalysis';
import { getCanonicalModelId, UNCLASSIFIED_VENDOR, UNKNOWN_MODEL_ID } from '../../../src/webview/shared/modelUtils';
import { createEmptyDailyModelEfficiencyEntry } from '../../../src/modelEfficiency';
import type { DailyModelEfficiency, DailyModelEfficiencyEntry, DailyTokenStats, ModelUsage, UsageAnalysisPeriod } from '../../../src/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Fixed "now": Wednesday 2026-07-15 → current week Monday is 2026-07-13.
const NOW = new Date(2026, 6, 15, 12, 0, 0);

/** Prices every model at $10 per million tokens regardless of mix. */
const flatDeps: EfficiencyDeps = {
	calculateEstimatedCost: (mu: ModelUsage) => {
		let tokens = 0;
		for (const u of Object.values(mu)) { tokens += u.inputTokens + u.outputTokens; }
		return (tokens / 1_000_000) * 10;
	},
	now: NOW,
};

function day(date: string, overrides: Partial<DailyTokenStats> = {}): DailyTokenStats {
	return {
		date,
		tokens: 0,
		sessions: 0,
		interactions: 0,
		modelUsage: {},
		editorUsage: {},
		repositoryUsage: {},
		...overrides,
	};
}

function usage(model: string, inputTokens: number, outputTokens: number, sessions = 1): ModelUsage {
	return { [model]: { inputTokens, outputTokens, sessions } };
}

function emptyPeriod(overrides: Partial<UsageAnalysisPeriod> = {}): UsageAnalysisPeriod {
	return {
		sessions: 0,
		toolCalls: { total: 0, byTool: {} },
		modeUsage: { ask: 0, edit: 0, agent: 0, plan: 0, customAgent: 0, cli: 0 },
		contextReferences: {
			file: 0, selection: 0, implicitSelection: 0, symbol: 0, codebase: 0,
			workspace: 0, terminal: 0, vscode: 0, terminalLastCommand: 0, terminalSelection: 0,
			clipboard: 0, changes: 0, outputPanel: 0, problemsPanel: 0, pullRequest: 0,
			byKind: {}, copilotInstructions: 0, agentsMd: 0, byPath: {},
		},
		mcpTools: { total: 0, byServer: {}, byTool: {} },
		modelSwitching: {
			modelsPerSession: [], totalSessions: 0, averageModelsPerSession: 0, maxModelsPerSession: 0,
			minModelsPerSession: 0, switchingFrequency: 0, autoSessions: 0, foundryWindowsSessions: 0,
			unknownProviderSessions: 0, standardModels: [], premiumModels: [], unknownModels: [],
			mixedTierSessions: 0, standardRequests: 0, premiumRequests: 0, unknownRequests: 0,
			totalRequests: 0, lowCostModels: [], mediumCostModels: [], highCostModels: [],
			mixedCostSessions: 0, lowCostRequests: 0, mediumCostRequests: 0, highCostRequests: 0,
			selectedModelExtensions: [], unknownProviderModels: [],
		},
		repositories: [],
		repositoriesWithCustomization: [],
		editScope: { singleFileEdits: 0, multiFileEdits: 0, totalEditedFiles: 0, avgFilesPerSession: 0 },
		applyUsage: { totalApplies: 0, totalCodeBlocks: 0, applyRate: 0 },
		sessionDuration: { totalDurationMs: 0, avgDurationMs: 0, avgFirstProgressMs: 0, avgTotalElapsedMs: 0, avgWaitTimeMs: 0, activeDurationMs: 0 },
		conversationPatterns: { multiTurnSessions: 0, singleTurnSessions: 0, avgTurnsPerSession: 0, maxTurnsInSession: 0 },
		agentTypes: { editsAgent: 0, defaultAgent: 0, workspaceAgent: 0, other: 0 },
		...overrides,
	};
}

// ── buildEfficiencyTrends ────────────────────────────────────────────────────

test('buildEfficiencyTrends: returns requested number of weeks in order, current week last', () => {
	const weekly = buildEfficiencyTrends([], [], flatDeps, 12);
	assert.equal(weekly.length, 12);
	assert.equal(weekly[11].weekKey, '2026-07-13');
	assert.equal(weekly[0].weekKey, '2026-04-27');
	for (let i = 1; i < weekly.length; i++) {
		assert.ok(weekly[i].weekKey > weekly[i - 1].weekKey);
	}
});

test('buildEfficiencyTrends: computes volume ratios from daily stats', () => {
	// Two days inside the current week (Mon 2026-07-13, Tue 2026-07-14).
	const days = [
		day('2026-07-13', { tokens: 100_000, sessions: 2, interactions: 10, linesAdded: 300, linesRemoved: 200, modelUsage: usage('gpt-5', 60_000, 40_000, 2) }),
		day('2026-07-14', { tokens: 50_000, sessions: 1, interactions: 5, linesAdded: 400, linesRemoved: 100, modelUsage: usage('gpt-5', 30_000, 20_000, 1) }),
	];
	const weekly = buildEfficiencyTrends(days, [], flatDeps, 2);
	const cur = weekly[1];
	assert.equal(cur.sessions, 3);
	assert.equal(cur.tokens, 150_000);
	assert.equal(cur.loc, 1000);
	assert.equal(cur.tokensPerSession, 50_000);
	assert.equal(cur.turnsPerSession, 5);
	// Cost: 150K tokens at $10/M = $1.50 → per 1K LOC = $1.50.
	assert.ok(Math.abs((cur.cost ?? 0) - 1.5) < 1e-9);
	assert.ok(Math.abs((cur.costPerKloc ?? 0) - 1.5) < 1e-9);
	assert.ok(Math.abs((cur.locPerDollar ?? 0) - 1000 / 1.5) < 1e-6);
});

test('buildEfficiencyTrends: ratio fields are null for empty weeks', () => {
	const weekly = buildEfficiencyTrends([], [], flatDeps, 3);
	for (const w of weekly) {
		assert.equal(w.tokensPerSession, null);
		assert.equal(w.turnsPerSession, null);
		assert.equal(w.costPerKloc, null);
		assert.equal(w.activeMinutesPerSession, null);
		assert.equal(w.retryRate, null);
		assert.equal(w.applyRate, null);
	}
});

test('buildEfficiencyTrends: session inputs feed duration, retry, and apply ratios', () => {
	const sessions: EfficiencySessionInput[] = [
		{ dayKey: '2026-07-13', activeDurationMs: 30 * 60_000, editTurns: 4, retries: 2, applies: 3, codeBlocks: 4 },
		{ dayKey: '2026-07-14', activeDurationMs: 10 * 60_000, editTurns: 6, retries: 1, applies: 1, codeBlocks: 4 },
	];
	const weekly = buildEfficiencyTrends([], sessions, flatDeps, 1);
	const cur = weekly[0];
	assert.equal(cur.durationSessions, 2);
	assert.ok(Math.abs((cur.activeMinutesPerSession ?? 0) - 20) < 1e-9);
	assert.equal(cur.editTurns, 10);
	assert.ok(Math.abs((cur.retryRate ?? 0) - 0.3) < 1e-9);
	assert.ok(Math.abs((cur.applyRate ?? 0) - 0.5) < 1e-9);
});

test('buildEfficiencyTrends: retry rate needs a minimum number of edit turns', () => {
	const sessions: EfficiencySessionInput[] = [
		{ dayKey: '2026-07-13', editTurns: 2, retries: 2 },
	];
	const weekly = buildEfficiencyTrends([], sessions, flatDeps, 1);
	assert.equal(weekly[0].retryRate, null);
});

test('buildEfficiencyTrends: sessions without duration data do not dilute the duration average', () => {
	const sessions: EfficiencySessionInput[] = [
		{ dayKey: '2026-07-13', activeDurationMs: 30 * 60_000 },
		{ dayKey: '2026-07-13' }, // no duration recorded
	];
	const weekly = buildEfficiencyTrends([], sessions, flatDeps, 1);
	assert.equal(weekly[0].durationSessions, 1);
	assert.ok(Math.abs((weekly[0].activeMinutesPerSession ?? 0) - 30) < 1e-9);
});

test('buildEfficiencyTrends: days and sessions outside the window are ignored', () => {
	const days = [day('2026-01-01', { tokens: 999, sessions: 9 })];
	const sessions: EfficiencySessionInput[] = [{ dayKey: '2026-01-01', activeDurationMs: 1000 }];
	const weekly = buildEfficiencyTrends(days, sessions, flatDeps, 2);
	assert.equal(weekly.reduce((s, w) => s + w.tokens, 0), 0);
	assert.equal(weekly.reduce((s, w) => s + w.durationSessions, 0), 0);
});

// ── computeCostAttribution ───────────────────────────────────────────────────

/** Deps where cost is driven by a per-model price table (per million tokens). */
function pricedDeps(prices: Record<string, number>): EfficiencyDeps {
	return {
		calculateEstimatedCost: (mu: ModelUsage) => {
			let cost = 0;
			for (const [model, u] of Object.entries(mu)) {
				cost += ((u.inputTokens + u.outputTokens) / 1_000_000) * (prices[model] ?? 0);
			}
			return cost;
		},
		now: NOW,
	};
}

test('computeCostAttribution: effects sum exactly to the cost delta', () => {
	const deps = pricedDeps({ 'expensive': 30, 'cheap': 3 });
	const prevDays = [
		day('2026-06-01', { tokens: 1_000_000, sessions: 10, modelUsage: usage('expensive', 600_000, 400_000, 10) }),
	];
	const curDays = [
		day('2026-07-01', { tokens: 800_000, sessions: 8, modelUsage: usage('cheap', 500_000, 300_000, 8) }),
	];
	const attr = computeCostAttribution(prevDays, curDays, deps);
	assert.ok(attr);
	const sum = attr.volumeEffect + attr.efficiencyEffect + attr.mixEffect;
	assert.ok(Math.abs(sum - attr.deltaCost) < 1e-9, `effects (${sum}) must sum to delta (${attr.deltaCost})`);
	// Prev: $30, cur: $2.40 → cost fell, dominated by the mix effect (30 → 3 $/M).
	assert.ok(Math.abs(attr.prev.cost - 30) < 1e-9);
	assert.ok(Math.abs(attr.cur.cost - 2.4) < 1e-9);
	assert.ok(attr.mixEffect < 0);
});

test('computeCostAttribution: pure volume change lands in volumeEffect only', () => {
	const deps = pricedDeps({ m: 10 });
	// Same tokens/session and same model — only session count doubles.
	const prevDays = [day('2026-06-01', { tokens: 500_000, sessions: 5, modelUsage: usage('m', 300_000, 200_000, 5) })];
	const curDays = [day('2026-07-01', { tokens: 1_000_000, sessions: 10, modelUsage: usage('m', 600_000, 400_000, 10) })];
	const attr = computeCostAttribution(prevDays, curDays, deps);
	assert.ok(attr);
	assert.ok(Math.abs(attr.efficiencyEffect) < 1e-9);
	assert.ok(Math.abs(attr.mixEffect) < 1e-9);
	assert.ok(Math.abs(attr.volumeEffect - attr.deltaCost) < 1e-9);
});

test('computeCostAttribution: null when either window is empty', () => {
	const deps = pricedDeps({ m: 10 });
	const days = [day('2026-07-01', { tokens: 1000, sessions: 1, modelUsage: usage('m', 600, 400) })];
	assert.equal(computeCostAttribution([], days, deps), null);
	assert.equal(computeCostAttribution(days, [], deps), null);
});

test('computeCostAttribution: reports the largest model mix shifts', () => {
	const deps = pricedDeps({ a: 10, b: 10 });
	const prevDays = [day('2026-06-01', { tokens: 1_000_000, sessions: 10, modelUsage: { ...usage('a', 500_000, 300_000, 8), ...usage('b', 150_000, 50_000, 2) } })];
	const curDays = [day('2026-07-01', { tokens: 1_000_000, sessions: 10, modelUsage: { ...usage('a', 150_000, 50_000, 2), ...usage('b', 500_000, 300_000, 8) } })];
	const attr = computeCostAttribution(prevDays, curDays, deps);
	assert.ok(attr);
	assert.equal(attr.modelShifts.length, 2);
	const shiftA = attr.modelShifts.find(s => s.model === 'a');
	assert.ok(shiftA);
	assert.ok(shiftA.deltaShare < 0);
});

// ── splitTrailingWindows ─────────────────────────────────────────────────────

test('splitTrailingWindows: partitions days into trailing and previous 30-day windows', () => {
	const days = [
		day('2026-07-15'), // today → current
		day('2026-06-16'), // 29 days back → current
		day('2026-06-15'), // 30 days back → previous
		day('2026-05-17'), // 59 days back → previous
		day('2026-05-16'), // 60 days back → outside
		day('2026-07-16'), // future → outside
	];
	const { prevDays, curDays } = splitTrailingWindows(days, NOW);
	assert.deepEqual(curDays.map(d => d.date).sort(), ['2026-06-16', '2026-07-15']);
	assert.deepEqual(prevDays.map(d => d.date).sort(), ['2026-05-17', '2026-06-15']);
});

test('getTrailingWindowBoundaries: returns adjacent inclusive 30-day ranges', () => {
	const boundaries = getTrailingWindowBoundaries(NOW);
	assert.deepEqual(
		[
			boundaries.prevStart,
			boundaries.prevEnd,
			boundaries.curStart,
			boundaries.curEnd,
			].map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`),
		['2026-05-17', '2026-06-15', '2026-06-16', '2026-07-15'],
	);
});

// ── computeEfficiencyDeltas ──────────────────────────────────────────────────

function periodWithMetrics(sessions: number, turns: number, activeMs: number, retries: number, editTurns: number, lowReq: number, midReq: number, highReq: number, applies: number, blocks: number): UsageAnalysisPeriod {
	const p = emptyPeriod({ sessions });
	p.conversationPatterns = { multiTurnSessions: sessions, singleTurnSessions: 0, avgTurnsPerSession: turns, maxTurnsInSession: turns };
	p.sessionDuration = { totalDurationMs: activeMs, avgDurationMs: activeMs / Math.max(1, sessions), avgFirstProgressMs: 0, avgTotalElapsedMs: 0, avgWaitTimeMs: 0, activeDurationMs: activeMs };
	p.modelEfficiency = { m: { calls: editTurns, editTurns, oneShotEditTurns: editTurns - retries, retries, selfCorrections: 0, editToolCalls: editTurns, inputTokens: 0, outputTokens: 0, cachedReadTokens: 0, cost: 0 } };
	p.modelSwitching.lowCostRequests = lowReq;
	p.modelSwitching.mediumCostRequests = midReq;
	p.modelSwitching.highCostRequests = highReq;
	p.applyUsage = { totalApplies: applies, totalCodeBlocks: blocks, applyRate: blocks > 0 ? (applies / blocks) * 100 : 0 };
	return p;
}

test('computeEfficiencyDeltas: improvement flags follow the good direction', () => {
	const prev = periodWithMetrics(20, 10, 20 * 40 * 60_000, 10, 20, 10, 30, 60, 10, 40);
	const cur = periodWithMetrics(20, 6, 20 * 25 * 60_000, 4, 20, 60, 30, 10, 30, 40);
	const deltas = computeEfficiencyDeltas(cur, prev);
	const byId = new Map(deltas.map(d => [d.id, d]));

	const turns = byId.get('turns-per-session')!;
	assert.equal(turns.improved, true); // 10 → 6, down is good
	const minutes = byId.get('active-minutes-per-session')!;
	assert.equal(minutes.improved, true); // 40 → 25 min
	const retry = byId.get('retry-rate')!;
	assert.equal(retry.improved, true); // 0.5 → 0.2
	const lowCost = byId.get('low-cost-share')!;
	assert.equal(lowCost.improved, true); // 10% → 60%, up is good
	const apply = byId.get('apply-rate')!;
	assert.equal(apply.improved, true); // 25% → 75%
});

test('computeEfficiencyDeltas: too few sessions yields null values', () => {
	const prev = periodWithMetrics(2, 10, 100, 1, 20, 20, 0, 0, 5, 10);
	const cur = periodWithMetrics(20, 6, 100, 1, 20, 20, 0, 0, 5, 10);
	const deltas = computeEfficiencyDeltas(cur, prev);
	for (const d of deltas) {
		assert.equal(d.prev, null, `${d.id} prev should be gated`);
		assert.equal(d.deltaPct, null);
		assert.equal(d.improved, null);
	}
});

test('computeEfficiencyDeltas: volume totals add tokens- and cost-per-session cards', () => {
	const prev = periodWithMetrics(20, 10, 100, 1, 20, 20, 0, 0, 5, 10);
	const cur = periodWithMetrics(20, 6, 100, 1, 20, 20, 0, 0, 5, 10);
	const deltas = computeEfficiencyDeltas(cur, prev,
		{ tokens: 1_000_000, sessions: 20, estimatedCost: 10 },
		{ tokens: 3_000_000, sessions: 20, estimatedCost: 30 });
	const tokens = deltas.find(d => d.id === 'tokens-per-session')!;
	assert.equal(tokens.prev, 150_000);
	assert.equal(tokens.cur, 50_000);
	assert.equal(tokens.improved, true);
	const cost = deltas.find(d => d.id === 'cost-per-session')!;
	assert.ok(Math.abs((cost.cur ?? 0) - 0.5) < 1e-9);
	assert.equal(cost.improved, true);
});

test('computeEfficiencyDeltas: regressions are flagged as not improved', () => {
	const prev = periodWithMetrics(20, 6, 20 * 25 * 60_000, 4, 20, 60, 30, 10, 30, 40);
	const cur = periodWithMetrics(20, 10, 20 * 40 * 60_000, 10, 20, 10, 30, 60, 10, 40);
	const deltas = computeEfficiencyDeltas(cur, prev);
	const turns = deltas.find(d => d.id === 'turns-per-session')!;
	assert.equal(turns.improved, false);
});

// ── computeValueSignals ──────────────────────────────────────────────────────

test('computeValueSignals: merged PRs drive the rate and cost-per-PR metrics', () => {
	const since = new Date(NOW.getTime() - 30 * 24 * 3600 * 1000).toISOString();
	const v = computeValueSignals({
		userPrs: 10, mergedPrs: 6, aiPrs: 0, prsSince: since, periodCost: 12,
		applyUsage: { totalApplies: 30, totalCodeBlocks: 40, applyRate: 75 },
		linesChanged: 3000, now: NOW,
	});
	assert.equal(v.userPrs, 10);
	assert.equal(v.mergedPrs, 6);
	assert.ok(Math.abs((v.prsPerWeek ?? 0) - 6 / (30 / 7)) < 1e-9, 'rate uses merged, not authored');
	assert.ok(Math.abs((v.costPerMergedPr ?? 0) - 2) < 1e-9);
	assert.ok(Math.abs((v.applyRate ?? 0) - 0.75) < 1e-9);
	assert.ok(Math.abs((v.locPerDollar ?? 0) - 250) < 1e-9);
});

test('computeValueSignals: zero AI-authored PRs still yields real user PR value', () => {
	// The common local-AI workflow: no bot-opened PRs, but plenty of shipped work.
	const since = new Date(NOW.getTime() - 30 * 24 * 3600 * 1000).toISOString();
	const v = computeValueSignals({
		userPrs: 12, mergedPrs: 9, aiPrs: 0, prsSince: since, periodCost: 90,
		linesChanged: 5000, now: NOW,
	});
	assert.equal(v.aiPrs, 0);
	assert.equal(v.mergedPrs, 9);
	assert.ok(Math.abs((v.costPerMergedPr ?? 0) - 10) < 1e-9);
	assert.ok((v.prsPerWeek ?? 0) > 0);
});

test('computeValueSignals: falls back to authored PRs when merge state is unavailable', () => {
	const since = new Date(NOW.getTime() - 7 * 24 * 3600 * 1000).toISOString();
	const v = computeValueSignals({
		userPrs: 7, mergedPrs: null, aiPrs: null, prsSince: since, periodCost: 10,
		linesChanged: 0, now: NOW,
	});
	assert.ok(Math.abs((v.prsPerWeek ?? 0) - 7) < 1e-9);
	assert.equal(v.costPerMergedPr, null, 'no merge data means no cost-per-merged-PR');
});

test('computeValueSignals: PR metrics are null when PR stats were never loaded', () => {
	const v = computeValueSignals({
		userPrs: null, mergedPrs: null, aiPrs: null, prsSince: null,
		periodCost: 12, linesChanged: 0, now: NOW,
	});
	assert.equal(v.userPrs, null);
	assert.equal(v.prsPerWeek, null);
	assert.equal(v.costPerMergedPr, null);
	assert.equal(v.applyRate, null);
	assert.equal(v.locPerDollar, null);
});

test('computeValueSignals: zero merged PRs yields null cost per PR (no divide by zero)', () => {
	const since = new Date(NOW.getTime() - 7 * 24 * 3600 * 1000).toISOString();
	const v = computeValueSignals({
		userPrs: 2, mergedPrs: 0, aiPrs: 0, prsSince: since, periodCost: 12,
		linesChanged: 0, now: NOW,
	});
	assert.equal(v.mergedPrs, 0);
	assert.equal(v.costPerMergedPr, null);
	assert.equal(v.prsPerWeek, 0);
});

// ── buildSkillUsageTrends ────────────────────────────────────────────────────

test('buildSkillUsageTrends: buckets skill calls by week and computes session share', () => {
	const sessions: EfficiencySessionInput[] = [
		{ dayKey: '2026-07-13', skillCalls: { graphify: 2 } },
		{ dayKey: '2026-07-14', skillCalls: { impeccable: 1 } },
		{ dayKey: '2026-07-14' }, // session without skills
		{ dayKey: '2026-07-06', skillCalls: { graphify: 1 } }, // previous week
	];
	const trends = buildSkillUsageTrends(sessions, flatDeps, 2);
	assert.equal(trends.totalCalls, 4);
	assert.deepEqual(trends.topSkills, ['graphify', 'impeccable']);

	const prevWeek = trends.weeks[0];
	assert.equal(prevWeek.weekKey, '2026-07-06');
	assert.equal(prevWeek.totalCalls, 1);
	assert.equal(prevWeek.skillSessions, 1);
	assert.equal(prevWeek.trackedSessions, 1);
	assert.equal(prevWeek.skillShare, 1);

	const curWeek = trends.weeks[1];
	assert.equal(curWeek.totalCalls, 3);
	assert.equal(curWeek.skillSessions, 2);
	assert.equal(curWeek.trackedSessions, 3);
	assert.ok(Math.abs((curWeek.skillShare ?? 0) - 2 / 3) < 1e-9);
	assert.deepEqual(curWeek.byName, { graphify: 2, impeccable: 1 });
});

test('buildSkillUsageTrends: empty input yields zeroed weeks and no top skills', () => {
	const trends = buildSkillUsageTrends([], flatDeps, 3);
	assert.equal(trends.weeks.length, 3);
	assert.equal(trends.totalCalls, 0);
	assert.deepEqual(trends.topSkills, []);
	for (const w of trends.weeks) {
		assert.equal(w.skillShare, null);
	}
});

test('buildSkillUsageTrends: zero-count skill entries are ignored', () => {
	const sessions: EfficiencySessionInput[] = [
		{ dayKey: '2026-07-13', skillCalls: { graphify: 0 } },
	];
	const trends = buildSkillUsageTrends(sessions, flatDeps, 1);
	assert.equal(trends.totalCalls, 0);
	assert.equal(trends.weeks[0].skillSessions, 0);
	assert.equal(trends.weeks[0].trackedSessions, 1);
});

// ── computeSkillImpact ───────────────────────────────────────────────────────

function skillSession(skill: string | null, interactions: number, tokens: number, activeMin: number, editTurns: number, retries: number): EfficiencySessionInput {
	return {
		dayKey: '2026-07-13',
		interactions,
		totalTokens: tokens,
		activeDurationMs: activeMin * 60_000,
		editTurns,
		retries,
		...(skill ? { skillCalls: { [skill]: 1 } } : {}),
	};
}

test('computeSkillImpact: compares with/without cohorts and flags favourable differences', () => {
	// 5 sessions with graphify: leaner (4 turns, 50K tokens, 15 min, no retries).
	// 5 sessions without: heavier (10 turns, 200K tokens, 45 min, 50% retry rate).
	const sessions: EfficiencySessionInput[] = [
		...Array.from({ length: 5 }, () => skillSession('graphify', 4, 50_000, 15, 4, 0)),
		...Array.from({ length: 5 }, () => skillSession(null, 10, 200_000, 45, 4, 2)),
	];
	const impacts = computeSkillImpact(sessions);
	assert.equal(impacts.length, 1);
	const g = impacts[0];
	assert.equal(g.skill, 'graphify');
	assert.equal(g.withSkill.sessions, 5);
	assert.equal(g.withoutSkill.sessions, 5);
	assert.equal(g.withSkill.avgTurns, 4);
	assert.equal(g.withoutSkill.avgTurns, 10);
	assert.equal(g.withSkill.retryRate, 0);
	assert.equal(g.withoutSkill.retryRate, 0.5);
	const turns = g.metrics.find(m => m.id === 'turns')!;
	assert.equal(turns.favorable, true);
	assert.ok(Math.abs((turns.deltaPct ?? 0) + 60) < 1e-9); // 4 vs 10 → −60%
	const retry = g.metrics.find(m => m.id === 'retry-rate')!;
	assert.equal(retry.favorable, true);
});

test('computeSkillImpact: skills below the session floor are omitted', () => {
	const sessions: EfficiencySessionInput[] = [
		...Array.from({ length: 4 }, () => skillSession('graphify', 4, 50_000, 15, 0, 0)),
		...Array.from({ length: 10 }, () => skillSession(null, 10, 200_000, 45, 0, 0)),
	];
	assert.deepEqual(computeSkillImpact(sessions), []);
});

test('computeSkillImpact: requires enough sessions on the without side too', () => {
	const sessions: EfficiencySessionInput[] = [
		...Array.from({ length: 6 }, () => skillSession('graphify', 4, 50_000, 15, 0, 0)),
		...Array.from({ length: 2 }, () => skillSession(null, 10, 200_000, 45, 0, 0)),
	];
	assert.deepEqual(computeSkillImpact(sessions), []);
});

test('computeSkillImpact: unfavourable differences are flagged red', () => {
	// Skill sessions are heavier than the rest.
	const sessions: EfficiencySessionInput[] = [
		...Array.from({ length: 5 }, () => skillSession('impeccable', 12, 300_000, 50, 0, 0)),
		...Array.from({ length: 5 }, () => skillSession(null, 5, 60_000, 20, 0, 0)),
	];
	const impacts = computeSkillImpact(sessions);
	assert.equal(impacts.length, 1);
	const turns = impacts[0].metrics.find(m => m.id === 'turns')!;
	assert.equal(turns.favorable, false);
});

// ── Model comparison ─────────────────────────────────────────────────────────

function modelDay(date: string, models: { [model: string]: Partial<DailyModelEfficiencyEntry> }, taskCategoryUsage?: DailyTokenStats['taskCategoryUsage']): DailyTokenStats {
	const modelEfficiency: DailyModelEfficiency = {};
	for (const [model, overrides] of Object.entries(models)) {
		modelEfficiency[model] = { ...createEmptyDailyModelEfficiencyEntry(), ...overrides };
	}
	return {
		date, tokens: 0, sessions: 0, interactions: 0,
		modelUsage: {}, editorUsage: {}, repositoryUsage: {},
		modelEfficiency, ...(taskCategoryUsage ? { taskCategoryUsage } : {}),
	};
}

/** A model profile that clears both sample floors, with the given overrides applied. */
function solidModel(overrides: Partial<DailyModelEfficiencyEntry>): Partial<DailyModelEfficiencyEntry> {
	return {
		sessions: 10, sessionShare: 10, calls: 40, editTurns: 20, oneShotEditTurns: 15,
		retries: 5, inputTokens: 900_000, outputTokens: 100_000, cost: 10,
		linesAdded: 800, linesRemoved: 200, durationSessionShare: 10, activeDurationMs: 10 * 600_000,
		applies: 40, codeBlocks: 50,
		...overrides,
	};
}

test('computeModelPeriodMetrics: returns null for a model absent from the window', () => {
	const days = [modelDay('2026-07-01', { a: solidModel({}) })];
	assert.equal(computeModelPeriodMetrics(days, 'missing', 'Jul'), null);
});

test('computeModelPeriodMetrics: aggregates across days and derives ratios', () => {
	const days = [
		modelDay('2026-07-01', { kimi: solidModel({}) }),
		modelDay('2026-07-02', { kimi: solidModel({}) }),
	];
	const m = computeModelPeriodMetrics(days, 'kimi', 'Jul')!;
	assert.equal(m.sessionShare, 20);
	assert.equal(m.editTurns, 40);
	assert.equal(m.cost, 20);
	assert.equal(m.tokens, 2_000_000);
	assert.equal(m.costPerEditTurn, 0.5);            // $20 / 40 edit turns
	assert.equal(m.costPerSession, 1);               // $20 / 20 session equivalents
	assert.equal(m.costPerKloc, 10);                 // $20 / 2000 lines * 1000
	assert.equal(m.dollarsPerMTokens, 10);
	assert.equal(m.oneShotRate, 0.75);               // 30 / 40
	assert.equal(m.retryRate, 0.25);                 // 10 / 40
	assert.equal(m.activeMinutesPerSession, 10);     // 600_000ms per session equivalent
	assert.equal(m.applyRate, 0.8);                  // 80 / 100
	assert.ok(m.sampleSufficient && m.editSampleSufficient);
});

test('computeModelPeriodMetrics: suppresses ratios that fall below the sample floors', () => {
	const days = [modelDay('2026-07-01', { rare: { ...createEmptyDailyModelEfficiencyEntry(), sessions: 1, sessionShare: 1, editTurns: 2, retries: 1, cost: 3, inputTokens: 1000, linesAdded: 10 } })];
	const m = computeModelPeriodMetrics(days, 'rare', 'Jul')!;
	assert.equal(m.sampleSufficient, false);
	assert.equal(m.editSampleSufficient, false);
	assert.equal(m.retryRate, null);
	assert.equal(m.costPerEditTurn, null);
	assert.equal(m.costPerSession, null);
	// Price per token needs no behavioural sample, so it still reports.
	assert.ok(m.dollarsPerMTokens !== null);
});

test('computeModelPeriodMetrics: caps cache read share at 1.0', () => {
	const days = [modelDay('2026-07-01', { a: solidModel({ inputTokens: 1000, cachedReadTokens: 5000 }) })];
	assert.equal(computeModelPeriodMetrics(days, 'a', 'Jul')!.cacheReadShare, 1);
});

test('computeModelPeriodMetrics: attributes task mix by the model share of the day', () => {
	const days = [modelDay('2026-07-01',
		{ a: solidModel({ inputTokens: 750_000, outputTokens: 0 }), b: solidModel({ inputTokens: 250_000, outputTokens: 0 }) },
		{ Coding: { tokens: 800, sessions: 1 }, Debugging: { tokens: 200, sessions: 1 } },
	)];
	const m = computeModelPeriodMetrics(days, 'a', 'Jul')!;
	// Shares are normalized within the model, so the mix matches the day's mix.
	assert.equal(m.taskMix['Coding'], 0.8);
	assert.equal(m.taskMix['Debugging'], 0.2);
});

test('listComparableModels: sorts by tokens and flags models below the sample floor', () => {
	const days = [modelDay('2026-07-01', {
		small: { ...createEmptyDailyModelEfficiencyEntry(), sessionShare: 1, inputTokens: 100 },
		big: solidModel({}),
	})];
	const models = listComparableModels(days);
	assert.deepEqual(models.map(m => m.model), ['big', 'small']);
	assert.equal(models[0].sampleSufficient, true);
	assert.equal(models[1].sampleSufficient, false);
});

test('compareModels: picks the winner per metric respecting each metric direction', () => {
	const a = computeModelPeriodMetrics([modelDay('2026-07-01', { a: solidModel({ cost: 20 }) })], 'a', 'Jul')!;
	const b = computeModelPeriodMetrics([modelDay('2026-07-01', { b: solidModel({ cost: 10 }) })], 'b', 'Jul')!;
	const cmp = compareModels(a, b);

	const cost = cmp.rows.find(r => r.id === 'cost-per-edit-turn')!;
	assert.equal(cost.a, 1);
	assert.equal(cost.b, 0.5);
	assert.equal(cost.deltaPct, -50);
	assert.equal(cost.winner, 'b');   // cheaper is better
	assert.equal(cost.significant, true);

	// Identical one-shot rates are a tie, not a win.
	const oneShot = cmp.rows.find(r => r.id === 'one-shot-rate')!;
	assert.equal(oneShot.winner, 'tie');
	assert.equal(oneShot.significant, false);
});

test('compareModels: higher-is-better metrics award the win to the larger value', () => {
	const a = computeModelPeriodMetrics([modelDay('2026-07-01', { a: solidModel({ oneShotEditTurns: 4 }) })], 'a', 'Jul')!;
	const b = computeModelPeriodMetrics([modelDay('2026-07-01', { b: solidModel({ oneShotEditTurns: 18 }) })], 'b', 'Jul')!;
	const oneShot = compareModels(a, b).rows.find(r => r.id === 'one-shot-rate')!;
	assert.equal(oneShot.winner, 'b');
	assert.equal(oneShot.significant, true);
});

test('compareModels: nulls stay null and never produce a winner', () => {
	const a = computeModelPeriodMetrics([modelDay('2026-07-01', { a: solidModel({}) })], 'a', 'Jul')!;
	const b = computeModelPeriodMetrics([modelDay('2026-07-01', { b: { ...createEmptyDailyModelEfficiencyEntry(), sessionShare: 1, editTurns: 1, cost: 1, inputTokens: 10 } })], 'b', 'Jul')!;
	const cost = compareModels(a, b).rows.find(r => r.id === 'cost-per-edit-turn')!;
	assert.equal(cost.b, null);
	assert.equal(cost.winner, null);
	assert.equal(cost.significant, false);
});

test('compareModels: verdict counts significant wins on each side', () => {
	// b is cheaper (wins cost rows) but retries far more (loses quality rows).
	const a = computeModelPeriodMetrics([modelDay('2026-07-01', { a: solidModel({ cost: 40 }) })], 'a', 'Jul')!;
	const b = computeModelPeriodMetrics([modelDay('2026-07-01', { b: solidModel({ cost: 10, retries: 18, oneShotEditTurns: 2 }) })], 'b', 'Jul')!;
	const cmp = compareModels(a, b);
	assert.ok(cmp.verdict !== null);
	assert.ok(cmp.verdict!.wins.a > 0, 'a should win the quality rows');
	assert.ok(cmp.verdict!.wins.b > 0, 'b should win the cost rows');
});

test('compareModels: verdict is null when nothing clears the noise band', () => {
	const a = computeModelPeriodMetrics([modelDay('2026-07-01', { a: solidModel({}) })], 'a', 'Jul')!;
	const b = computeModelPeriodMetrics([modelDay('2026-07-01', { b: solidModel({}) })], 'b', 'Jul')!;
	assert.equal(compareModels(a, b).verdict, null);
});

test('compareModels: raises a caveat when a side is below the sample floor', () => {
	const a = computeModelPeriodMetrics([modelDay('2026-07-01', { a: solidModel({}) })], 'a', 'Jul')!;
	const b = computeModelPeriodMetrics([modelDay('2026-07-01', { b: { ...createEmptyDailyModelEfficiencyEntry(), sessionShare: 1, editTurns: 1, inputTokens: 10 } })], 'b', 'Jul')!;
	const cmp = compareModels(a, b);
	assert.ok(cmp.caveats.some(c => c.includes('session equivalents')));
	assert.ok(cmp.caveats.some(c => c.includes('edit turns')));
});

test('compareModels: raises a caveat when the two sides did different kinds of work', () => {
	const a = computeModelPeriodMetrics(
		[modelDay('2026-07-01', { a: solidModel({}) }, { Coding: { tokens: 1000, sessions: 1 } })], 'a', 'Jul')!;
	const b = computeModelPeriodMetrics(
		[modelDay('2026-07-01', { b: solidModel({}) }, { Debugging: { tokens: 1000, sessions: 1 } })], 'b', 'Jul')!;
	assert.ok(compareModels(a, b).caveats.some(c => c.includes('task-mix')));
});

test('compareModels: warns when the usage is dominated by mixed-model sessions', () => {
	// 20 sessions touched the model but they are worth only 5 session equivalents.
	const mixed = solidModel({ sessions: 20, sessionShare: 5 });
	const a = computeModelPeriodMetrics([modelDay('2026-07-01', { a: mixed })], 'a', 'Jul')!;
	const b = computeModelPeriodMetrics([modelDay('2026-07-01', { b: solidModel({}) })], 'b', 'Jul')!;
	assert.ok(compareModels(a, b).caveats.some(c => c.includes('mixed several models')));
});

test('buildModelWeeklySeries: buckets days into weeks and gaps unused weeks', () => {
	// NOW is Wed 2026-07-15, so the last bucket is the week of Mon 2026-07-13.
	const days = [
		modelDay('2026-07-14', { kimi: solidModel({ cost: 10 }) }),
		modelDay('2026-07-07', { kimi: solidModel({ cost: 20 }) }),
	];
	const series = buildModelWeeklySeries(days, 'kimi', NOW, 3);
	assert.equal(series.length, 3);
	assert.equal(series[0].metrics, null);              // week of Jun 29 — unused
	assert.equal(series[1].metrics!.cost, 20);          // week of Jul 6
	assert.equal(series[2].metrics!.cost, 10);          // week of Jul 13
});

test('buildModelWeeklySeries: ignores days outside the requested window', () => {
	const days = [modelDay('2020-01-01', { kimi: solidModel({}) })];
	const series = buildModelWeeklySeries(days, 'kimi', NOW, 4);
	assert.ok(series.every(p => p.metrics === null));
});

// ── Comparison windows ───────────────────────────────────────────────────────

test('resolveModelCompareWindow: last30 covers the 30 days ending today', () => {
	const w = resolveModelCompareWindow('last30', NOW);
	assert.equal(w.startKey, '2026-06-16');
	assert.equal(w.endKey, '2026-07-15');
	assert.equal(w.label, 'Last 30 days');
});

test('resolveModelCompareWindow: prev30 sits immediately before last30 without overlapping', () => {
	const last = resolveModelCompareWindow('last30', NOW);
	const prev = resolveModelCompareWindow('prev30', NOW);
	assert.equal(prev.startKey, '2026-05-17');
	assert.equal(prev.endKey, '2026-06-15');
	assert.ok(prev.endKey < last.startKey, 'previous window must end before the last window starts');
});

test('resolveModelCompareWindow: last90 spans 90 days ending today', () => {
	const w = resolveModelCompareWindow('last90', NOW);
	assert.equal(w.startKey, '2026-04-17');
	assert.equal(w.endKey, '2026-07-15');
});

test('resolveModelCompareWindow: thisMonth runs from the 1st to today and is labelled by month', () => {
	const w = resolveModelCompareWindow('thisMonth', NOW);
	assert.equal(w.startKey, '2026-07-01');
	assert.equal(w.endKey, '2026-07-15');
	assert.equal(w.label, 'July 2026');
});

test('resolveModelCompareWindow: lastMonth covers the whole previous calendar month', () => {
	const w = resolveModelCompareWindow('lastMonth', NOW);
	assert.equal(w.startKey, '2026-06-01');
	assert.equal(w.endKey, '2026-06-30');
	assert.equal(w.label, 'June 2026');
});

test('resolveModelCompareWindow: lastMonth rolls back across a year boundary', () => {
	const w = resolveModelCompareWindow('lastMonth', new Date(2026, 0, 9, 12, 0, 0));
	assert.equal(w.startKey, '2025-12-01');
	assert.equal(w.endKey, '2025-12-31');
	assert.equal(w.label, 'December 2025');
});

test('selectDaysInWindow: keeps only days inside the window, bounds included', () => {
	const days = [
		modelDay('2026-06-30', {}),
		modelDay('2026-07-01', {}),
		modelDay('2026-07-10', {}),
		modelDay('2026-07-15', {}),
		modelDay('2026-07-16', {}),
	];
	const picked = selectDaysInWindow(days, resolveModelCompareWindow('thisMonth', NOW));
	assert.deepEqual(picked.map(d => d.date), ['2026-07-01', '2026-07-10', '2026-07-15']);
});

test('selectDaysInWindow: returns nothing when no day falls inside the window', () => {
	const days = [modelDay('2026-01-05', {}), modelDay('2026-02-05', {})];
	assert.equal(selectDaysInWindow(days, resolveModelCompareWindow('last30', NOW)).length, 0);
});

test('resolveModelCompareWindow: rangeLabel is a concrete date span distinguishing same-length windows', () => {
	const last = resolveModelCompareWindow('last30', NOW);
	const prev = resolveModelCompareWindow('prev30', NOW);
	assert.equal(last.rangeLabel, 'Jun 16 – Jul 15, 2026');
	assert.equal(prev.rangeLabel, 'May 17 – Jun 15, 2026');
	assert.notEqual(last.rangeLabel, prev.rangeLabel);
});

test('resolveModelCompareWindow: rangeLabel includes both years when the span crosses a year boundary', () => {
	const w = resolveModelCompareWindow('lastMonth', new Date(2026, 0, 9, 12, 0, 0));
	assert.equal(w.rangeLabel, 'Dec 1 – Dec 31, 2025');
});

test('windowHasModelData: false when no day in the window has per-model efficiency data', () => {
	const days = [modelDay('2026-07-01', {}), modelDay('2026-07-10', {})];
	assert.equal(windowHasModelData(days, resolveModelCompareWindow('thisMonth', NOW)), false);
});

test('windowHasModelData: true when at least one day in the window has per-model efficiency data', () => {
	const days = [modelDay('2026-07-10', { 'gpt-4o': {} })];
	assert.equal(windowHasModelData(days, resolveModelCompareWindow('thisMonth', NOW)), true);
});

test('windowHasModelData: ignores data outside the window bounds', () => {
	const days = [modelDay('2026-06-01', { 'gpt-4o': {} })];
	assert.equal(windowHasModelData(days, resolveModelCompareWindow('thisMonth', NOW)), false);
});

// ── Combined-chart filters (vendor × model × editor) ─────────────────────────

/** Prices Opus at 4× the flat rate, so cost attribution can be told apart from token share. */
const combinedDeps: EfficiencyDeps = {
	calculateEstimatedCost: (mu: ModelUsage) => {
		let cost = 0;
		for (const [model, u] of Object.entries(mu)) {
			const rate = model.includes('opus') ? 40 : 10;
			cost += ((u.inputTokens + u.outputTokens) / 1_000_000) * rate;
		}
		return cost;
	},
	now: NOW,
};

function modelUsageOf(entries: [string, number, number][]): ModelUsage {
	const usage: ModelUsage = {};
	for (const [model, inputTokens, outputTokens] of entries) {
		usage[model] = { inputTokens, outputTokens, sessions: 1 };
	}
	return usage;
}

/**
 * Two weeks of activity across three editors and five models, including one
 * mixed-model session (gpt-5 + claude-sonnet-4.5), one session on an
 * unclassifiable model, and one session that names no model at all.
 */
function combinedFixture(): { days: DailyTokenStats[]; sessions: EfficiencySessionInput[] } {
	const days: DailyTokenStats[] = [
		day('2026-07-06', {
			tokens: 100_000, sessions: 3, interactions: 30, linesAdded: 160, linesRemoved: 40,
			modelUsage: modelUsageOf([['gpt-5', 30_000, 6_000], ['claude-sonnet-4.5', 20_000, 4_000], ['claude-opus-4.8', 33_000, 7_000]]),
			editorUsage: {
				'VS Code': { tokens: 60_000, sessions: 2, linesAdded: 100, linesRemoved: 20 },
				'Claude Code': { tokens: 40_000, sessions: 1, linesAdded: 60, linesRemoved: 20 },
			},
			editorModelUsage: {
				'VS Code': modelUsageOf([['gpt-5', 30_000, 6_000], ['claude-sonnet-4.5', 20_000, 4_000]]),
				'Claude Code': modelUsageOf([['claude-opus-4.8', 33_000, 7_000]]),
			},
		}),
		day('2026-07-08', {
			tokens: 50_000, sessions: 1, interactions: 12, linesAdded: 40, linesRemoved: 10,
			modelUsage: modelUsageOf([['copilot/claude-opus-4-8', 40_000, 8_000]]),
			editorUsage: { 'Claude Code': { tokens: 50_000, sessions: 1, linesAdded: 40, linesRemoved: 10 } },
			editorModelUsage: { 'Claude Code': modelUsageOf([['copilot/claude-opus-4-8', 40_000, 8_000]]) },
		}),
		day('2026-07-13', {
			tokens: 20_000, sessions: 1, interactions: 6, linesAdded: 25, linesRemoved: 5,
			modelUsage: modelUsageOf([['acme-internal-v2', 15_000, 3_000]]),
			editorUsage: { 'Copilot CLI': { tokens: 20_000, sessions: 1, linesAdded: 25, linesRemoved: 5 } },
			editorModelUsage: { 'Copilot CLI': modelUsageOf([['acme-internal-v2', 15_000, 3_000]]) },
		}),
		day('2026-07-14', {
			tokens: 8_000, sessions: 1, interactions: 4,
			modelUsage: {},
			editorUsage: { 'VS Code': { tokens: 8_000, sessions: 1 } },
			editorModelUsage: { 'VS Code': {} },
		}),
	];
	const sessions: EfficiencySessionInput[] = [
		{
			dayKey: '2026-07-06', editor: 'VS Code',
			modelShares: { 'gpt-5': 36_000, 'claude-sonnet-4.5': 24_000 },
			modelEditTurns: { 'gpt-5': 7, 'claude-sonnet-4.5': 3 },
			modelRetries: { 'gpt-5': 2, 'claude-sonnet-4.5': 1 },
			activeDurationMs: 600_000, editTurns: 10, retries: 3, applies: 4, codeBlocks: 8, interactions: 18,
		},
		{
			dayKey: '2026-07-06', editor: 'Claude Code',
			modelShares: { 'claude-opus-4.8': 40_000 },
			modelEditTurns: { 'claude-opus-4.8': 6 }, modelRetries: { 'claude-opus-4.8': 1 },
			activeDurationMs: 300_000, editTurns: 6, retries: 1, applies: 2, codeBlocks: 5, interactions: 12,
		},
		{
			dayKey: '2026-07-08', editor: 'Claude Code',
			modelShares: { 'copilot/claude-opus-4-8': 48_000 },
			modelEditTurns: { 'copilot/claude-opus-4-8': 5 }, modelRetries: { 'copilot/claude-opus-4-8': 2 },
			activeDurationMs: 420_000, editTurns: 5, retries: 2, applies: 3, codeBlocks: 6, interactions: 12,
		},
		{
			dayKey: '2026-07-13', editor: 'Copilot CLI',
			modelShares: { 'acme-internal-v2': 18_000 },
			modelEditTurns: { 'acme-internal-v2': 4 }, modelRetries: { 'acme-internal-v2': 1 },
			activeDurationMs: 240_000, editTurns: 4, retries: 1, applies: 1, codeBlocks: 4, interactions: 6,
		},
		// Names no model at all: it must still be visible, under the unknown bucket.
		{ dayKey: '2026-07-14', editor: 'VS Code', activeDurationMs: 120_000, editTurns: 2, retries: 0, applies: 1, codeBlocks: 2, interactions: 4 },
	];
	return { days, sessions };
}

/** Equality that tolerates the last bits of floating-point noise from share maths. */
function assertClose(actual: number | null, expected: number | null, what: string): void {
	if (actual === null || expected === null) {
		assert.equal(actual, expected, what);
		return;
	}
	assert.ok(Math.abs(actual - expected) <= Math.max(1e-9, Math.abs(expected) * 1e-9), `${what}: ${actual} vs ${expected}`);
}

const WEEK_NUMERIC_FIELDS = [
	'sessions', 'tokens', 'cost', 'loc', 'interactions', 'tokensPerSession', 'turnsPerSession',
	'costPerKloc', 'locPerDollar', 'activeMinutesPerSession', 'retryRate', 'applyRate',
	'durationSessions', 'editTurns',
] as const;

test('buildCombinedDaily: All/All/All reproduces the unfiltered weekly series exactly', () => {
	const { days, sessions } = combinedFixture();
	const expected = buildEfficiencyTrends(days, sessions, combinedDeps);
	const actual = aggregateCombinedWeekly(buildCombinedDaily(days, sessions, combinedDeps), UNFILTERED_COMBINED, NOW);

	assert.equal(actual.length, expected.length);
	for (let i = 0; i < expected.length; i++) {
		assert.equal(actual[i].weekKey, expected[i].weekKey);
		assert.equal(actual[i].label, expected[i].label);
		for (const field of WEEK_NUMERIC_FIELDS) {
			assertClose(actual[i][field], expected[i][field], `${expected[i].weekKey}.${field}`);
		}
	}
});

test('buildCombinedDaily: mutually exclusive model slices sum back to the all-model totals', () => {
	const { days, sessions } = combinedFixture();
	const points = buildCombinedDaily(days, sessions, combinedDeps);
	const models = listCombinedFacets(points, UNFILTERED_COMBINED).models.map(m => m.value);
	// The fixture's mixed-model session is the whole point: naive per-model
	// re-aggregation would count it once per model and inflate every total.
	assert.ok(models.length >= 4, `expected several models, got ${models.join(', ')}`);

	const all = aggregateCombinedWeekly(points, UNFILTERED_COMBINED, NOW);
	const slices = models.map(model => aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, model }, NOW));

	for (let i = 0; i < all.length; i++) {
		for (const field of ['sessions', 'tokens', 'cost', 'loc', 'interactions', 'editTurns', 'durationSessions'] as const) {
			const summed = slices.reduce((sum, slice) => sum + slice[i][field], 0);
			assertClose(summed, all[i][field], `${all[i].weekKey}.${field}`);
		}
	}
});

test('buildCombinedDaily: editor slices also sum back to the all-editor totals', () => {
	const { days, sessions } = combinedFixture();
	const points = buildCombinedDaily(days, sessions, combinedDeps);
	const editors = listCombinedFacets(points, UNFILTERED_COMBINED).editors.map(e => e.value);
	const all = aggregateCombinedWeekly(points, UNFILTERED_COMBINED, NOW);
	const slices = editors.map(editor => aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, editor }, NOW));
	for (let i = 0; i < all.length; i++) {
		for (const field of ['sessions', 'tokens', 'cost', 'loc', 'editTurns'] as const) {
			assertClose(slices.reduce((sum, s) => sum + s[i][field], 0), all[i][field], `${all[i].weekKey}.${field}`);
		}
	}
});

test('buildCombinedDaily: cost follows each model’s price, not just its token share', () => {
	const { days, sessions } = combinedFixture();
	const points = buildCombinedDaily(days, sessions, combinedDeps);
	const week = (filter: Partial<CombinedFilter>) =>
		aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, ...filter }, NOW).find(w => w.weekKey === '2026-07-06')!;
	const opus = week({ model: 'claude-opus-4.8' });
	const sonnet = week({ model: 'claude-sonnet-4.5' });
	// Opus is priced 4× higher than Sonnet, so its cost per token has to come out
	// that much higher — a purely token-proportional split would flatten them.
	const opusRate = opus.cost / opus.tokens;
	const sonnetRate = sonnet.cost / sonnet.tokens;
	assert.ok(opusRate / sonnetRate > 3, `expected the price gap to show: ${opusRate} vs ${sonnetRate}`);
});

test('buildCombinedDaily: aliases and wrapper ids land in one model slice', () => {
	const { days, sessions } = combinedFixture();
	const points = buildCombinedDaily(days, sessions, combinedDeps);
	const models = listCombinedFacets(points, UNFILTERED_COMBINED).models.map(m => m.value);
	// `claude-opus-4.8` and `copilot/claude-opus-4-8` are the same model.
	assert.equal(models.filter(m => m.includes('opus')).length, 1, models.join(', '));
	const opus = aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, model: getCanonicalModelId('copilot/claude-opus-4-8') }, NOW);
	assert.ok(opus.some(w => w.weekKey === '2026-07-06' && w.tokens > 0), 'first week of opus usage');
	assert.ok(opus.some(w => w.weekKey === '2026-07-06' && w.editTurns > 0), 'opus edit turns');
});

test('buildCombinedDaily: unclassifiable models and model-less sessions stay visible', () => {
	const { days, sessions } = combinedFixture();
	const points = buildCombinedDaily(days, sessions, combinedDeps);
	const vendors = listCombinedFacets(points, UNFILTERED_COMBINED).vendors.map(v => v.value);
	assert.ok(vendors.includes(UNCLASSIFIED_VENDOR), vendors.join(', '));

	const unclassified = aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, vendor: UNCLASSIFIED_VENDOR }, NOW);
	const total = unclassified.reduce((sum, w) => sum + w.tokens, 0);
	// The acme model (20k) plus the session that named no model (8k).
	assertClose(total, 28_000, 'unclassified tokens');
	const models = listCombinedFacets(points, { ...UNFILTERED_COMBINED, vendor: UNCLASSIFIED_VENDOR }).models.map(m => m.value);
	assert.deepEqual(models.sort(), ['acme-internal-v2', UNKNOWN_MODEL_ID].sort());
});

test('listCombinedFacets: each control is faceted by the other two selections', () => {
	const { days, sessions } = combinedFixture();
	const points = buildCombinedDaily(days, sessions, combinedDeps);

	const forAnthropic = listCombinedFacets(points, { ...UNFILTERED_COMBINED, vendor: 'Anthropic' });
	assert.deepEqual(forAnthropic.editors.map(e => e.value).sort(), ['Claude Code', 'VS Code']);
	assert.ok(forAnthropic.models.every(m => m.value.includes('claude')), forAnthropic.models.map(m => m.value).join(', '));
	// A dimension never facets itself away, or picking a vendor would hide the rest.
	assert.ok(forAnthropic.vendors.length > 1, 'vendor options stay complete');

	const forClaudeCode = listCombinedFacets(points, { ...UNFILTERED_COMBINED, editor: 'Claude Code' });
	assert.deepEqual(forClaudeCode.models.map(m => m.value), ['claude-opus-4.8']);
	assert.deepEqual(forClaudeCode.vendors.map(v => v.value), ['Anthropic']);
});

test('reconcileCombinedFilter: drops only the selections the facets no longer offer', () => {
	const { days, sessions } = combinedFixture();
	const points = buildCombinedDaily(days, sessions, combinedDeps);
	// The user just picked the editor; the model no longer exists there, but the
	// vendor still does and must survive.
	const reconciled = reconcileCombinedFilter(points, { vendor: 'Anthropic', model: 'gpt-5', editor: 'Claude Code' }, 'editor');
	assert.deepEqual(reconciled, { vendor: 'Anthropic', model: COMBINED_FILTER_ALL, editor: 'Claude Code' });

	const valid = { vendor: 'Anthropic', model: 'claude-opus-4.8', editor: 'Claude Code' };
	assert.deepEqual(reconcileCombinedFilter(points, valid, 'editor'), valid);

	// Picking a vendor that exists nowhere near the other two selections keeps
	// only what the user actually chose, instead of showing an empty chart.
	assert.deepEqual(
		reconcileCombinedFilter(points, { vendor: UNCLASSIFIED_VENDOR, model: 'claude-opus-4.8', editor: 'Claude Code' }, 'vendor'),
		{ vendor: UNCLASSIFIED_VENDOR, model: COMBINED_FILTER_ALL, editor: COMBINED_FILTER_ALL },
	);
});

test('summarizeCombinedSelection: empty and low-sample selections are called out, not drawn as zero', () => {
	const { days, sessions } = combinedFixture();
	const points = buildCombinedDaily(days, sessions, combinedDeps);

	const impossible = summarizeCombinedSelection(points, { vendor: 'Anthropic', model: COMBINED_FILTER_ALL, editor: 'Copilot CLI' }, NOW);
	assert.equal(impossible.empty, true);
	assert.equal(impossible.activeWeeks, 0);

	const thin = summarizeCombinedSelection(points, { ...UNFILTERED_COMBINED, vendor: UNCLASSIFIED_VENDOR }, NOW);
	assert.equal(thin.empty, false);
	assert.equal(thin.lowSample, true, `sessions=${thin.sessions} editTurns=${thin.editTurns}`);

	const everything = summarizeCombinedSelection(points, UNFILTERED_COMBINED, NOW);
	assert.equal(everything.empty, false);
	assert.ok(everything.activeWeeks >= 2, `active weeks: ${everything.activeWeeks}`);
});

test('aggregateCombinedWeekly: the retry-rate sample gate survives filtering', () => {
	const { days, sessions } = combinedFixture();
	const points = buildCombinedDaily(days, sessions, combinedDeps);
	const sonnet = aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, model: 'claude-sonnet-4.5' }, NOW)
		.find(w => w.weekKey === '2026-07-06')!;
	// 3 edit turns is below the weekly floor, so the ratio is withheld rather than
	// reported from a sample that cannot support it.
	assertClose(sonnet.editTurns, 3, 'sonnet edit turns');
	assert.equal(sonnet.retryRate, null);

	const opus = aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, model: 'claude-opus-4.8' }, NOW)
		.find(w => w.weekKey === '2026-07-06')!;
	// Both Opus sessions of that week (6 + 5 edit turns) clear the floor.
	assertClose(opus.editTurns, 11, 'opus edit turns');
	assert.ok(opus.retryRate !== null && opus.retryRate > 0, 'opus retry rate is reported');
});

test('buildCombinedDaily: keeps only the trailing window and no per-session detail', () => {
	const { days, sessions } = combinedFixture();
	const stale = day('2026-01-05', {
		tokens: 999, sessions: 1, interactions: 1,
		modelUsage: modelUsageOf([['gpt-5', 900, 99]]),
		editorUsage: { 'VS Code': { tokens: 999, sessions: 1 } },
		editorModelUsage: { 'VS Code': modelUsageOf([['gpt-5', 900, 99]]) },
	});
	const points = buildCombinedDaily([stale, ...days], sessions, combinedDeps);
	assert.ok(points.every(p => p.date >= '2026-04-27'), points.map(p => p.date).join(', '));
	// The payload is cells, not sessions: nothing identifying a session survives.
	const keys = new Set(points.flatMap(p => p.cells.flatMap(c => Object.keys(c))));
	assert.equal(keys.has('sessionId'), false);
	assert.equal(keys.has('path'), false);
});

test('COMBINED_FILTER_ALL: the unfiltered sentinel cannot collide with a real model id', () => {
	// A custom endpoint's model part is free text that canonicalizes straight
	// through, so a readable sentinel like 'all' would be a real model id too —
	// and that model could then never be selected.
	assert.equal(getCanonicalModelId('customendpoint/Acme/all'), 'all');
	assert.notEqual(COMBINED_FILTER_ALL, 'all');

	const days = [day('2026-07-06', {
		tokens: 1_000, sessions: 1, interactions: 4,
		modelUsage: modelUsageOf([['customendpoint/Acme/all', 800, 200]]),
		editorUsage: { 'VS Code': { tokens: 1_000, sessions: 1 } },
		editorModelUsage: { 'VS Code': modelUsageOf([['customendpoint/Acme/all', 800, 200]]) },
	})];
	const points = buildCombinedDaily(days, [], combinedDeps);
	const models = listCombinedFacets(points, UNFILTERED_COMBINED).models.map(m => m.value);
	assert.deepEqual(models, ['all']);
	// Selecting it really filters, rather than reading as "no filter".
	const selected = aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, model: 'all' }, NOW);
	assert.ok(selected.some(w => w.tokens > 0), 'the model named "all" is selectable');
	const other = aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, model: 'gpt-5' }, NOW);
	assert.ok(other.every(w => w.tokens === 0), 'a different model selects nothing');
});

test('buildCombinedDaily: model-less activity is not absorbed by the models named beside it', () => {
	// One editor, one day, two sessions: one on gpt-5, one that named no model.
	// Without the unattributed figure the day's whole 30k would land on gpt-5.
	const days = [day('2026-07-06', {
		tokens: 30_000, sessions: 2, interactions: 10, linesAdded: 90, linesRemoved: 10,
		modelUsage: modelUsageOf([['gpt-5', 16_000, 4_000]]),
		editorUsage: { 'VS Code': { tokens: 30_000, sessions: 2, linesAdded: 90, linesRemoved: 10 } },
		editorModelUsage: { 'VS Code': modelUsageOf([['gpt-5', 16_000, 4_000]]) },
		editorModelFallback: { 'VS Code': { [UNKNOWN_MODEL_ID]: 10_000 } },
	})];
	const points = buildCombinedDaily(days, [], combinedDeps);
	const week = (model: string) => aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, model }, NOW)
		.find(w => w.weekKey === '2026-07-06')!;

	const unknown = week(UNKNOWN_MODEL_ID);
	const gpt = week('gpt-5');
	// 10k of 30k tokens named no model, so a third of the day is unattributed.
	assertClose(unknown.tokens, 10_000, 'unattributed tokens');
	assertClose(gpt.tokens, 20_000, 'gpt-5 tokens');
	assert.ok(unknown.sessions > 0, 'the model-less session keeps a session share');
	// And the split still adds back up to the unfiltered day.
	const all = aggregateCombinedWeekly(points, UNFILTERED_COMBINED, NOW).find(w => w.weekKey === '2026-07-06')!;
	assertClose(unknown.tokens + gpt.tokens, all.tokens, 'tokens');
	assertClose(unknown.sessions + gpt.sessions, all.sessions, 'sessions');
	assertClose(unknown.loc + gpt.loc, all.loc, 'loc');

	assert.ok(
		listCombinedFacets(points, UNFILTERED_COMBINED).vendors.some(v => v.value === UNCLASSIFIED_VENDOR),
		'the unattributed share is offered under Unclassified',
	);
});

test('buildCombinedDaily: the raw no-model turn key folds into one unattributed bucket', () => {
	// computeEfficiencyFromTurns writes the bare word 'unknown' for a turn that
	// named no model. It must land in the same bucket as genuinely model-less
	// activity, not a second lowercase slice beside it — while a *wrapped* id
	// that merely ends in "unknown" stays a real, separate model.
	const days = [day('2026-07-06', {
		tokens: 20_000, sessions: 2, interactions: 8,
		modelUsage: modelUsageOf([['customendpoint/Acme/unknown', 8_000, 2_000]]),
		editorUsage: { 'VS Code': { tokens: 20_000, sessions: 2 } },
		editorModelUsage: { 'VS Code': modelUsageOf([['customendpoint/Acme/unknown', 8_000, 2_000]]) },
		editorModelFallback: { 'VS Code': { unknown: 10_000 } },
	})];
	const points = buildCombinedDaily(days, [], combinedDeps);
	const models = listCombinedFacets(points, UNFILTERED_COMBINED).models.map(m => m.value).sort();
	assert.deepEqual(models, [UNKNOWN_MODEL_ID, 'unknown'].sort());

	const week = (model: string) => aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, model }, NOW)
		.find(w => w.weekKey === '2026-07-06')!;
	assertClose(week(UNKNOWN_MODEL_ID).tokens, 10_000, 'unattributed tokens');
	assertClose(week('unknown').tokens, 10_000, 'the custom model named "unknown"');
});

test('buildCombinedDaily: a session with only turn counters is attributed to those models', () => {
	// No token breakdown, so it contributes nothing to editorModelUsage — its
	// volume must follow the models its counters name, not become unattributed.
	const days = [day('2026-07-06', {
		tokens: 12_000, sessions: 1, interactions: 5, linesAdded: 40, linesRemoved: 10,
		modelUsage: {},
		editorUsage: { 'Claude Code': { tokens: 12_000, sessions: 1, linesAdded: 40, linesRemoved: 10 } },
		editorModelUsage: { 'Claude Code': {} },
		editorModelFallback: { 'Claude Code': { 'claude-opus-4.8': 12_000 } },
	})];
	const sessions: EfficiencySessionInput[] = [{
		dayKey: '2026-07-06', editor: 'Claude Code',
		modelShares: { 'claude-opus-4.8': 1 },
		modelEditTurns: { 'claude-opus-4.8': 6 }, modelRetries: { 'claude-opus-4.8': 2 },
		editTurns: 6, retries: 2,
	}];
	const points = buildCombinedDaily(days, sessions, combinedDeps);
	const opus = aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, model: 'claude-opus-4.8' }, NOW)
		.find(w => w.weekKey === '2026-07-06')!;
	// Volume and behavioural evidence land in the same slice.
	assertClose(opus.tokens, 12_000, 'tokens');
	assertClose(opus.sessions, 1, 'sessions');
	assertClose(opus.loc, 50, 'loc');
	assertClose(opus.editTurns, 6, 'edit turns');
	const unattributed = aggregateCombinedWeekly(points, { ...UNFILTERED_COMBINED, model: UNKNOWN_MODEL_ID }, NOW);
	assert.ok(unattributed.every(w => w.tokens === 0), 'nothing is left unattributed');
});
