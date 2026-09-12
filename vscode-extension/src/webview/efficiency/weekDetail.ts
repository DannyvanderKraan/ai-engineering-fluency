// Efficiency view — horizon selector and selected-week drill-down markup.
//
// The charts on the Efficiency view answer "did this ratio move?"; they cannot
// answer "on what?". This module renders the controls that pick a horizon and a
// week, and the live detail region that shows the raw volume, the derived
// ratios (null stays null — an unavailable metric is never shown as zero), the
// change against the previous week, and what the week's sample actually
// supports.
//
// It is deliberately separate from main.ts: every function here is a pure
// string builder over the payload types, so the selection rules and the
// "unavailable, not zero" contract are unit-testable without a DOM.
import { escapeHtml, formatCompact } from '../shared/formatUtils';
import { localize, localizeFormat } from '../shared/localization';
import { getWeekBounds } from '../../../../src/efficiencyAnalysis';
import type {
	DeltaUnit,
	EfficiencyTrendRange,
	EfficiencyTrendRangeId,
	EfficiencyWeekDetail,
	ModelWeekDetail,
	SkillWeekDetail,
	WeekDetailMetric,
} from '../../../../src/efficiencyAnalysis';

/** Placeholder for a metric that has no value. Never a zero — a missing ratio is not a ratio of 0. */
export const NO_VALUE = '—';

export function fmtValue(v: number | null, unit: DeltaUnit): string {
	if (v === null) { return NO_VALUE; }
	switch (unit) {
		case 'percent': return `${(v * 100).toFixed(1)}%`;
		case 'minutes': return `${v.toFixed(1)} min`;
		case 'tokens': return formatCompact(Math.round(v));
		case 'count': return formatCompact(Math.round(v));
		case 'currency': return `$${v.toFixed(2)}`;
		case 'ratio': return v.toFixed(1);
	}
}

/**
 * Month vs Month card id → the weekly trend card that measures the same thing.
 * Cards with no weekly equivalent are absent on purpose: `low-cost-share` and
 * `cost-per-session` are month-bucketed aggregates with no weekly series, and a
 * button that focused an unrelated chart would imply a link that is not there.
 */
export const DELTA_TO_TREND_METRIC: Readonly<Record<string, string>> = {
	'turns-per-session': 'turns-per-session',
	'tokens-per-session': 'tokens-per-session',
	'active-minutes-per-session': 'active-minutes',
	'retry-rate': 'retry-rate',
	'apply-rate': 'apply-rate',
};

/** The weekly trend card a Month vs Month card can focus, or null when it has no weekly equivalent. */
export function trendMetricForDelta(deltaId: string): string | null {
	return DELTA_TO_TREND_METRIC[deltaId] ?? null;
}

/**
 * Keeps a week selection only while the week is still in the rendered series.
 * Narrowing the horizon from 52 to 12 weeks must drop a selection that fell
 * outside, never silently resolve it to a different week.
 */
export function clampSelectedWeek(weekKeys: readonly string[], selected: string | null): string | null {
	return selected !== null && weekKeys.includes(selected) ? selected : null;
}

// ── Controls ───────────────────────────────────────────────────────────

/**
 * A horizon's button text. The payload carries a locale-neutral `label` so the
 * pure module stays translation-free; the webview resolves the display text from
 * the bundle by range id, and falls back to the payload's label if a key is ever
 * missing.
 */
function rangeLabel(range: EfficiencyTrendRange): string {
	const key = `efficiency.horizon.range${range.id}`;
	const localized = localize(key);
	return localized === key ? range.label : localized;
}

/**
 * The horizon selector. Toggle buttons in a labelled group: the selected state
 * is exposed through `aria-pressed` rather than colour alone, and the group is
 * reachable and operable from the keyboard like any other button. `loading` only
 * affects the status text and `aria-busy` — the buttons never go disabled.
 */
export function renderRangeControls(
	ranges: readonly EfficiencyTrendRange[],
	selected: EfficiencyTrendRangeId,
	loading: boolean,
): string {
	const buttons = ranges.map(r => {
		const isSelected = r.id === selected;
		return `<button type="button" class="eff-range-btn${isSelected ? ' active' : ''}" data-range="${escapeHtml(r.id)}" aria-pressed="${isSelected ? 'true' : 'false'}">${escapeHtml(rangeLabel(r))}</button>`;
	}).join('');
	// The buttons stay enabled while a horizon is loading: disabling them would
	// drop keyboard focus mid-interaction, and a second choice must be allowed to
	// supersede the first. `aria-busy` announces the pending rebuild instead.
	return `
		<div class="eff-controls" aria-busy="${loading ? 'true' : 'false'}">
			<div class="eff-range" role="group" aria-labelledby="eff-range-label">
				<span class="eff-control-label" id="eff-range-label">${escapeHtml(localize('efficiency.horizon.label'))}</span>
				${buttons}
			</div>
			<span class="eff-range-status" role="status">${loading ? escapeHtml(localize('efficiency.horizon.loading')) : ''}</span>
			<span class="eff-control-hint">${escapeHtml(localize('efficiency.horizon.hint'))}</span>
		</div>`;
}

/**
 * The keyboard-accessible week selector. A Chart.js point click sets the same
 * state, but this control — not the canvas — is the supported path: a canvas
 * click is a pointer convenience, never the only way in.
 */
export function renderWeekPicker(
	weeks: readonly { weekKey: string; label: string }[],
	selected: string | null,
	now: Date,
): string {
	const options = [
		`<option value=""${selected === null ? ' selected' : ''}>${escapeHtml(localize('efficiency.week.none'))}</option>`,
		...weeks.map(w => {
			const bounds = getWeekBounds(w.weekKey, now);
			return `<option value="${escapeHtml(w.weekKey)}"${w.weekKey === selected ? ' selected' : ''}>${escapeHtml(`${w.label} · ${bounds.rangeLabel}`)}</option>`;
		}),
	].join('');
	return `
		<div class="eff-week-picker">
			<label class="eff-control-label" for="eff-week-select">${escapeHtml(localize('efficiency.week.label'))}</label>
			<select id="eff-week-select" class="model-select">${options}</select>
			<span class="eff-control-hint">${escapeHtml(localize('efficiency.week.hint'))}</span>
		</div>`;
}

// ── Detail region ──────────────────────────────────────────────────────

/** The change cell. The arrow and the colour are backed by a word, so direction never depends on colour alone. */
function changeCell(m: WeekDetailMetric): string {
	if (m.deltaPct === null) { return `<span class="delta-na">${NO_VALUE}</span>`; }
	const cls = m.improved === null ? 'flat' : m.improved ? 'good' : 'bad';
	const arrow = m.deltaPct > 0 ? '↑' : m.deltaPct < 0 ? '↓' : '→';
	const word = m.improved === null ? '' : ` ${localize(m.improved ? 'efficiency.week.better' : 'efficiency.week.worse')}`;
	return `<span class="delta-change ${cls}">${escapeHtml(`${arrow} ${Math.abs(m.deltaPct).toFixed(0)}%${word}`)}</span>`;
}

function metricRow(m: WeekDetailMetric, showReasons: boolean): string {
	const unavailable = m.value === null;
	const reason = showReasons && unavailable && m.unavailableReason
		? `<div class="week-unavailable">${escapeHtml(m.unavailableReason)}</div>`
		: '';
	return `
			<tr${unavailable ? ' class="model-row-muted"' : ''}>
				<td title="${escapeHtml(m.description)}">${escapeHtml(m.label)}${reason}</td>
				<td class="num">${escapeHtml(fmtValue(m.value, m.unit))}</td>
				<td class="num">${escapeHtml(fmtValue(m.prior, m.unit))}</td>
				<td class="num">${changeCell(m)}</td>
			</tr>`;
}

/**
 * `showReasons` is off when one sentence above the table already explains every
 * row — repeating "X was not used in this week" twelve times buries the numbers
 * rather than explaining them.
 */
function metricTable(metrics: readonly WeekDetailMetric[], showReasons = true): string {
	return `
		<table class="attr-shift-table week-metric-table">
			<thead><tr>
				<th>${escapeHtml(localize('efficiency.week.colMetric'))}</th>
				<th class="num">${escapeHtml(localize('efficiency.week.colValue'))}</th>
				<th class="num">${escapeHtml(localize('efficiency.week.colPrior'))}</th>
				<th class="num">${escapeHtml(localize('efficiency.week.colChange'))}</th>
			</tr></thead>
			<tbody>${metrics.map(m => metricRow(m, showReasons)).join('')}</tbody>
		</table>`;
}

function coverageList(heading: string, notes: readonly string[]): string {
	if (notes.length === 0) { return ''; }
	return `
		<h4 class="week-detail-sub">${escapeHtml(heading)}</h4>
		<ul class="week-coverage">${notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>`;
}

function priorLine(priorLabel: string | null): string {
	const text = priorLabel === null
		? localize('efficiency.week.noPrior')
		: localizeFormat('efficiency.week.priorIs', priorLabel);
	return `<p class="week-detail-prior">${escapeHtml(text)}</p>`;
}

function detailHead(label: string, rangeLabel: string, isPartial: boolean): string {
	const chip = isPartial
		? `<span class="week-chip partial">${escapeHtml(localize('efficiency.week.partialChip'))}</span>`
		: '';
	return `
		<div class="week-detail-head">
			<h3 class="week-detail-title">${escapeHtml(label)}</h3>
			<span class="week-detail-range">${escapeHtml(rangeLabel)}</span>
			${chip}
		</div>`;
}

function rawStat(label: string, value: string): string {
	return `<div class="week-raw-stat"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

/** The raw-volume block every tab's drill-down shows above its ratios. */
function rawVolumeBlock(stats: { label: string; value: string }[]): string {
	return `
		<h4 class="week-detail-sub">${escapeHtml(localize('efficiency.week.rawHeading'))}</h4>
		<dl class="week-raw">${stats.map(stat => rawStat(stat.label, stat.value)).join('')}</dl>`;
}

/** The week's sessions, tokens, turns, lines changed and cost, in that order. */
function weekVolumeStats(detail: EfficiencyWeekDetail): { label: string; value: string }[] {
	return [
		{ label: localize('efficiency.week.sessions'), value: formatCompact(detail.sessions) },
		{ label: localize('efficiency.week.tokens'), value: formatCompact(detail.tokens) },
		{ label: localize('efficiency.week.turns'), value: formatCompact(detail.interactions) },
		{ label: localize('efficiency.week.loc'), value: formatCompact(detail.loc) },
		{ label: localize('efficiency.week.cost'), value: `$${detail.cost.toFixed(2)}` },
	];
}

/** Wraps a detail body in the live region the selection updates in place. */
function detailRegion(body: string): string {
	return `<div class="week-detail" id="eff-week-detail" role="region" aria-label="${escapeHtml(localize('efficiency.week.detailHeading'))}" aria-live="polite" tabindex="-1">${body}</div>`;
}

function emptyDetailBody(): string {
	return `<p class="eff-section-note">${escapeHtml(localize('efficiency.week.empty'))}</p>`;
}

/** The selected week of the efficiency trends: raw volume, ratios, prior-week change, coverage. */
export function renderWeekDetail(detail: EfficiencyWeekDetail | null): string {
	if (!detail) { return detailRegion(emptyDetailBody()); }
	return detailRegion(`
		${detailHead(detail.label, detail.rangeLabel, detail.isPartial)}
		${rawVolumeBlock(weekVolumeStats(detail))}
		<h4 class="week-detail-sub">${escapeHtml(localize('efficiency.week.ratiosHeading'))}</h4>
		${priorLine(detail.priorLabel)}
		${metricTable(detail.metrics)}
		${coverageList(localize('efficiency.week.coverageHeading'), detail.coverageNotes)}`);
}

/**
 * The selected week of the Tools & Skills trends. `week` carries the same raw
 * volume the other tabs show, so the drill-down is genuinely common across tabs
 * rather than a skills-only view of the same week.
 */
export function renderSkillWeekDetail(detail: SkillWeekDetail | null, week: EfficiencyWeekDetail | null = null): string {
	if (!detail) { return detailRegion(emptyDetailBody()); }
	const rows = detail.skills.map(s => `
			<tr>
				<td>${escapeHtml(s.skill)}</td>
				<td class="num">${escapeHtml(formatCompact(s.calls))}</td>
				<td class="num">${escapeHtml(s.priorCalls === null ? NO_VALUE : formatCompact(s.priorCalls))}</td>
				<td class="num">${escapeHtml(s.share === null ? NO_VALUE : `${(s.share * 100).toFixed(0)}%`)}</td>
			</tr>`).join('');
	const table = detail.skills.length === 0
		? `<p class="eff-section-note">${escapeHtml(localize('efficiency.week.noSkills'))}</p>`
		: `
		<table class="attr-shift-table week-metric-table">
			<thead><tr>
				<th>${escapeHtml(localize('efficiency.week.colSkill'))}</th>
				<th class="num">${escapeHtml(localize('efficiency.week.colValue'))}</th>
				<th class="num">${escapeHtml(localize('efficiency.week.colPrior'))}</th>
				<th class="num">${escapeHtml(localize('efficiency.week.colShare'))}</th>
			</tr></thead>
			<tbody>${rows}</tbody>
		</table>`;
	return detailRegion(`
		${detailHead(detail.label, detail.rangeLabel, detail.isPartial)}
		${week ? rawVolumeBlock(weekVolumeStats(week)) : ''}
		${priorLine(detail.priorLabel)}
		${metricTable(detail.metrics)}
		<h4 class="week-detail-sub">${escapeHtml(localize('efficiency.week.skillsHeading'))}</h4>
		${table}
		${coverageList(localize('efficiency.week.coverageHeading'), detail.coverageNotes)}`);
}

/** One model's profile for the selected week. */
function modelWeekBody(detail: ModelWeekDetail): string {
	const unused = detail.metrics === null
		? `<p class="eff-section-note">${escapeHtml(localizeFormat('efficiency.week.modelUnused', detail.displayName))}</p>`
		: '';
	const volume = detail.metrics === null ? '' : rawVolumeBlock([
		{ label: localize('efficiency.week.sessions'), value: formatCompact(detail.metrics.sessions) },
		{ label: localize('efficiency.week.tokens'), value: formatCompact(detail.metrics.tokens) },
		{ label: localize('efficiency.week.editTurns'), value: formatCompact(detail.metrics.editTurns) },
		{ label: localize('efficiency.week.loc'), value: formatCompact(detail.metrics.loc) },
		{ label: localize('efficiency.week.cost'), value: `$${detail.metrics.cost.toFixed(2)}` },
	]);
	return `
		${detailHead(`${detail.displayName} · ${detail.label}`, detail.rangeLabel, detail.isPartial)}
		${unused}
		${volume}
		${priorLine(detail.priorLabel)}
		${metricTable(detail.rows, detail.metrics !== null)}
		${coverageList(localize('efficiency.week.caveatsHeading'), detail.caveats)}`;
}

/**
 * The selected week on the Models tab, with one profile per model currently on
 * the drift chart. Both compared models are shown rather than only slot A: a
 * click lands on whichever series was under the pointer, so reporting one model
 * would attribute the wrong profile to the clicked point — and a keyboard user
 * picking the same week from the selector must see exactly what the click shows.
 *
 * Every existing sample floor, task-mix and mixed-model-session caveat travels
 * with each detail — zooming into one week must not make a comparison look more
 * certain than the head-to-head table it came from.
 */
export function renderModelWeekDetail(details: readonly (ModelWeekDetail | null)[]): string {
	const present = details.filter((d): d is ModelWeekDetail => d !== null);
	if (present.length === 0) { return detailRegion(emptyDetailBody()); }
	return detailRegion(present.map(d => `<div class="week-model-block">${modelWeekBody(d)}</div>`).join(''));
}
