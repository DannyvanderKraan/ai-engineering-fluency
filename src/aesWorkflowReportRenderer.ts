/**
 * Rendering for the AES workflow assessment report.
 *
 * Two pure renderers over the same {@link AesWorkflowReport}: a plain-text
 * form for the CLI's console output, and a self-contained HTML form for the
 * `--html` export. Both are string builders only — no filesystem access, no
 * VS Code API — so the CLI and (later) a VS Code webview can share them.
 *
 * Rendering rules mirror the ones `darkFactorySection.ts` already enforces
 * for Dark Factory Readiness, because the same honesty concerns apply here:
 * an `unknown` stock rating is always shown as unknown, never silently
 * folded into a posture, and supporting evidence keeps the exact
 * `present` / `absent` / `unknown` wording it had in the Dark Factory scan.
 */
import type {
	AesActivity,
	AesPosture,
	AesStock,
	AesSupportingEvidence,
	AesWorkflowReport,
} from './types';
import { ACTIVITIES, AES_ASSESSMENT_DISCLAIMER, MODES, STOCKS } from './aesWorkflowAssessment';
import {
	ACTIVITY_LABELS,
	CONFIDENCE_CSS_CLASS,
	CONFIDENCE_LABELS,
	DELEGATION_LABELS,
	EVIDENCE_STATE_CSS_CLASS,
	EVIDENCE_STATE_ICON,
	formatPostureLabel,
	MODE_LABELS,
	RATING_CSS_CLASS,
	RATING_LABELS,
	safeCssClass,
	STOCK_LABELS,
} from './aesLabels';

// ---------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------

function textRule(char = '-', width = 72): string {
	return char.repeat(width);
}

function renderEvidenceLinesText(evidence: readonly AesSupportingEvidence[], informs: AesActivity | AesStock): string[] {
	const matches = evidence.filter(item => item.informs === informs);
	if (matches.length === 0) { return []; }
	return matches.map(item => {
		const icon = EVIDENCE_STATE_ICON[item.state];
		const detail = item.detail ? ` — ${item.detail}` : '';
		return `      evidence [${icon}] ${item.repo}: ${item.controlLabel}${detail}`;
	});
}

function renderDecisionLinesText(decision: AesWorkflowReport['assessment']['decision']): string[] {
	const lines: string[] = [];
	lines.push('Decision and next experiment');
	lines.push(textRule());
	lines.push(`  Delegate now:            ${decision.delegateNow}`);
	lines.push(`  Deferred:                ${decision.deferred}`);
	lines.push(`  Evidence to reconsider:  ${decision.evidenceToReconsider}`);
	lines.push('  Top actions:');
	for (const action of decision.topActions) {
		lines.push(`    - ${action}`);
	}
	lines.push('');
	return lines;
}

/** Render the report as plain text for the CLI's console output. */
export function renderAesReportText(report: AesWorkflowReport): string {
	const { assessment } = report;
	const lines: string[] = [];

	lines.push(`AES Workflow Assessment — ${assessment.workflow.name}`);
	lines.push(textRule('='));
	lines.push(assessment.workflow.description);
	lines.push(`Repositories: ${assessment.workflow.repositories.join(', ') || '(none listed)'}`);
	lines.push(`Assessed: ${assessment.assessedAt}${assessment.assessedBy ? ` by ${assessment.assessedBy}` : ''}`);
	lines.push('');
	lines.push(AES_ASSESSMENT_DISCLAIMER);
	lines.push('');

	lines.push('Outcome');
	lines.push(textRule());
	lines.push(`  Customer value: ${assessment.outcome.customerValue}`);
	lines.push(`  Customers:      ${assessment.outcome.customers}`);
	lines.push('');

	// Posture and Decision come before the stock/activity/mode detail on purpose:
	// they are the conclusion, and a reader should never have to assemble it
	// themselves from the sections below.
	lines.push('Posture');
	lines.push(textRule());
	lines.push(`  ${formatPostureLabel(report.posture, report.postureConfidence)}`);
	lines.push(`  ${report.postureGuidance}`);
	lines.push('');

	lines.push(...renderDecisionLinesText(assessment.decision));

	lines.push('Stocks');
	lines.push(textRule());
	for (const stock of STOCKS) {
		const stockAssessment = assessment.stocks[stock];
		const confidence = CONFIDENCE_LABELS[stockAssessment.confidence ?? 'unverified'];
		lines.push(`  ${STOCK_LABELS[stock].padEnd(18)} ${RATING_LABELS[stockAssessment.rating]} (${confidence})`);
		lines.push(`    ${stockAssessment.evidence}`);
		lines.push(...renderEvidenceLinesText(assessment.supportingEvidence ?? [], stock));
	}
	lines.push('');

	lines.push('Activities (define → deliver → detect)');
	lines.push(textRule());
	for (const activity of ACTIVITIES) {
		const activityAssessment = assessment.activities[activity];
		lines.push(`  ${ACTIVITY_LABELS[activity]}`);
		lines.push(`    Delegation: ${DELEGATION_LABELS[activityAssessment.delegation]}`);
		lines.push(`    ${activityAssessment.description}`);
		lines.push(`    Signal: ${activityAssessment.signal}`);
		if (activityAssessment.notes) {
			lines.push(`    Notes: ${activityAssessment.notes}`);
		}
		lines.push(...renderEvidenceLinesText(assessment.supportingEvidence ?? [], activity));
	}
	lines.push('');

	lines.push('Modes (director / performer / assessor)');
	lines.push(textRule());
	for (const mode of MODES) {
		const modeAssessment = assessment.modes[mode];
		lines.push(`  ${MODE_LABELS[mode]}`);
		lines.push(`    Delegation: ${DELEGATION_LABELS[modeAssessment.delegation]}`);
		if (modeAssessment.antiPatternsObserved?.length) {
			lines.push(`    Anti-patterns observed: ${modeAssessment.antiPatternsObserved.join('; ')}`);
		}
	}
	lines.push('');

	if (assessment.notes) {
		lines.push('Notes');
		lines.push(textRule());
		lines.push(`  ${assessment.notes}`);
		lines.push('');
	}

	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

/** Minimal HTML escaping — this module has no DOM and takes no dependency on one. */
function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

const POSTURE_CSS_CLASS: Record<AesPosture, string> = {
	'healthy-agent-native': 'aes-posture-healthy-native',
	'healthy-but-underused': 'aes-posture-underused',
	'underdeveloped-foundations': 'aes-posture-underdeveloped',
	'stretched-agent-native': 'aes-posture-stretched',
	unclear: 'aes-posture-unclear',
};

function renderEvidenceListHtml(evidence: readonly AesSupportingEvidence[], informs: AesActivity | AesStock): string {
	const matches = evidence.filter(item => item.informs === informs);
	if (matches.length === 0) { return ''; }
	const items = matches.map(item => {
		const icon = EVIDENCE_STATE_ICON[item.state] ?? '?';
		const stateClass = safeCssClass(EVIDENCE_STATE_CSS_CLASS, item.state, 'aes-evidence-unknown');
		const detail = item.detail ? ` &mdash; ${escapeHtml(item.detail)}` : '';
		return `<li class="aes-evidence ${stateClass}">[${escapeHtml(icon)}] <strong>${escapeHtml(item.repo)}</strong>: ${escapeHtml(item.controlLabel)}${detail}</li>`;
	}).join('');
	return `<ul class="aes-evidence-list">${items}</ul>`;
}

function renderStocksHtml(report: AesWorkflowReport): string {
	const evidence = report.assessment.supportingEvidence ?? [];
	const rows = STOCKS.map(stock => {
		const s = report.assessment.stocks[stock];
		const confidence = s.confidence ?? 'unverified';
		const ratingClass = safeCssClass(RATING_CSS_CLASS, s.rating, 'aes-rating-unknown');
		const confidenceClass = safeCssClass(CONFIDENCE_CSS_CLASS, confidence, 'aes-confidence-unverified');
		return `<div class="aes-card">
			<div class="aes-card-title">${escapeHtml(STOCK_LABELS[stock])}
				<span class="aes-badge ${ratingClass}">${escapeHtml(RATING_LABELS[s.rating] ?? s.rating)}</span>
				<span class="aes-badge ${confidenceClass}">${escapeHtml(CONFIDENCE_LABELS[confidence] ?? confidence)}</span>
			</div>
			<div class="aes-card-body">${escapeHtml(s.evidence)}</div>
			${renderEvidenceListHtml(evidence, stock)}
		</div>`;
	}).join('');
	return `<div class="aes-grid">${rows}</div>`;
}

function renderDecisionHtml(report: AesWorkflowReport): string {
	const { decision } = report.assessment;
	const actions = decision.topActions.map(action => `<li>${escapeHtml(action)}</li>`).join('');
	return `<div class="aes-decision">
		<div class="aes-decision-row"><strong>Delegate now:</strong> ${escapeHtml(decision.delegateNow)}</div>
		<div class="aes-decision-row"><strong>Deferred:</strong> ${escapeHtml(decision.deferred)}</div>
		<div class="aes-decision-row"><strong>Top actions:</strong><ul class="aes-decision-actions">${actions}</ul></div>
		<div class="aes-decision-row"><strong>Evidence to reconsider:</strong> ${escapeHtml(decision.evidenceToReconsider)}</div>
	</div>`;
}

function renderActivitiesHtml(report: AesWorkflowReport): string {
	const evidence = report.assessment.supportingEvidence ?? [];
	const rows = ACTIVITIES.map(activity => {
		const a = report.assessment.activities[activity];
		return `<div class="aes-card">
			<div class="aes-card-title">${escapeHtml(ACTIVITY_LABELS[activity])}
				<span class="aes-badge aes-delegation">${DELEGATION_LABELS[a.delegation]}</span>
			</div>
			<div class="aes-card-body">${escapeHtml(a.description)}</div>
			<div class="aes-card-signal">Signal: ${escapeHtml(a.signal)}</div>
			${renderEvidenceListHtml(evidence, activity)}
		</div>`;
	}).join('');
	return `<div class="aes-grid">${rows}</div>`;
}

function renderModesHtml(report: AesWorkflowReport): string {
	const rows = MODES.map(mode => {
		const m = report.assessment.modes[mode];
		const antiPatterns = m.antiPatternsObserved?.length
			? `<ul class="aes-anti-patterns">${m.antiPatternsObserved.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
			: '';
		return `<div class="aes-card">
			<div class="aes-card-title">${escapeHtml(MODE_LABELS[mode])}
				<span class="aes-badge aes-delegation">${DELEGATION_LABELS[m.delegation]}</span>
			</div>
			${m.notes ? `<div class="aes-card-body">${escapeHtml(m.notes)}</div>` : ''}
			${antiPatterns}
		</div>`;
	}).join('');
	return `<div class="aes-grid">${rows}</div>`;
}

const AES_REPORT_CSS = `
	body { font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; margin: 2rem; color: #1b1f24; background: #fff; }
	h1 { margin-bottom: 0.25rem; }
	.aes-subtitle { color: #57606a; margin-bottom: 1rem; }
	.aes-disclaimer { background: #fff8c5; border: 1px solid #d4a72c; border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; }
	.aes-section-title { margin-top: 2rem; border-bottom: 1px solid #d0d7de; padding-bottom: 0.25rem; }
	.aes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 0.75rem; }
	.aes-card { border: 1px solid #d0d7de; border-radius: 8px; padding: 0.75rem 1rem; }
	.aes-card-title { font-weight: 600; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
	.aes-card-body { margin-top: 0.35rem; color: #24292f; }
	.aes-card-signal { margin-top: 0.35rem; color: #57606a; font-size: 0.9em; }
	.aes-badge { font-size: 0.75em; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 999px; background: #eaeef2; white-space: nowrap; }
	.aes-rating-strong { background: #d1f0d1; }
	.aes-rating-developing { background: #fff2cc; }
	.aes-rating-weak { background: #ffd7d5; }
	.aes-rating-unknown { background: #eaeef2; }
	.aes-evidence-list, .aes-anti-patterns { margin: 0.5rem 0 0; padding-left: 1.1rem; font-size: 0.9em; color: #57606a; }
	.aes-evidence-present { color: #1a7f37; }
	.aes-evidence-absent { color: #cf222e; }
	.aes-evidence-unknown { color: #57606a; }
	.aes-posture-banner { border-radius: 8px; padding: 1rem; margin-top: 0.75rem; font-weight: 600; }
	.aes-posture-healthy-native { background: #d1f0d1; }
	.aes-posture-underused { background: #dbe9ff; }
	.aes-posture-underdeveloped { background: #ffd7d5; }
	.aes-posture-stretched { background: #ffe0b3; }
	.aes-posture-unclear { background: #eaeef2; }
	.aes-posture-guidance { font-weight: 400; margin-top: 0.35rem; }
	.aes-confidence-unverified { background: #fff2cc; }
	.aes-confidence-verified { background: #d1f0d1; }
	.aes-decision { border: 1px solid #d0d7de; border-radius: 8px; padding: 0.75rem 1rem; margin-top: 0.75rem; background: #f6f8fa; }
	.aes-decision-row { margin-bottom: 0.5rem; }
	.aes-decision-row:last-child { margin-bottom: 0; }
	.aes-decision-actions { margin: 0.25rem 0 0; padding-left: 1.25rem; }
	.aes-footer { margin-top: 2rem; color: #57606a; font-size: 0.85em; }
`;

/** Render the report as a self-contained HTML document, for the CLI's `--html` export. */
export function renderAesReportHtml(report: AesWorkflowReport): string {
	const { assessment } = report;
	const repos = assessment.workflow.repositories.length > 0
		? assessment.workflow.repositories.map(escapeHtml).join(', ')
		: '(none listed)';

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AES Workflow Assessment — ${escapeHtml(assessment.workflow.name)}</title>
<style>${AES_REPORT_CSS}</style>
</head>
<body>
	<h1>AES Workflow Assessment — ${escapeHtml(assessment.workflow.name)}</h1>
	<div class="aes-subtitle">
		${escapeHtml(assessment.workflow.description)}<br>
		Repositories: ${repos}<br>
		Assessed ${escapeHtml(assessment.assessedAt)}${assessment.assessedBy ? ` by ${escapeHtml(assessment.assessedBy)}` : ''}
	</div>
	<div class="aes-disclaimer">${escapeHtml(AES_ASSESSMENT_DISCLAIMER)}</div>

	<h2 class="aes-section-title">Outcome</h2>
	<p><strong>Customer value:</strong> ${escapeHtml(assessment.outcome.customerValue)}</p>
	<p><strong>Customers:</strong> ${escapeHtml(assessment.outcome.customers)}</p>

	<h2 class="aes-section-title">Posture</h2>
	<div class="aes-posture-banner ${POSTURE_CSS_CLASS[report.posture]}">
		${escapeHtml(formatPostureLabel(report.posture, report.postureConfidence))}
		<div class="aes-posture-guidance">${escapeHtml(report.postureGuidance)}</div>
	</div>

	<h2 class="aes-section-title">Decision and next experiment</h2>
	${renderDecisionHtml(report)}

	<h2 class="aes-section-title">Stocks</h2>
	${renderStocksHtml(report)}

	<h2 class="aes-section-title">Activities (define &rarr; deliver &rarr; detect)</h2>
	${renderActivitiesHtml(report)}

	<h2 class="aes-section-title">Modes (director / performer / assessor)</h2>
	${renderModesHtml(report)}

	${assessment.notes ? `<h2 class="aes-section-title">Notes</h2><p>${escapeHtml(assessment.notes)}</p>` : ''}

	<div class="aes-footer">Generated by AI Engineering Fluency &middot; schema v${escapeHtml(String(assessment.schemaVersion))}</div>
</body>
</html>`;
}
