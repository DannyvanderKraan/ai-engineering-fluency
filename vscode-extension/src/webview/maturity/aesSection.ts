/**
 * Renders the AES workflow assessment section of the Fluency Score view.
 *
 * This is a third, deliberately separate lens from the other two sections on
 * this page: the personal fluency cards above score an *individual's* tool
 * usage, and the Dark Factory Readiness section scores what a *repository
 * scan* can observe. This section reports a team's own self-assessment of
 * one *named workflow* — which may span several repositories — against
 * GitHub's Agentic Engineering System (AES) framework. It contributes
 * nothing to the personal radar or the Dark Factory ladder, and it never
 * turns a Dark Factory `present` / `absent` / `unknown` observation into an
 * AES conclusion on its own; it only ever displays it as supporting evidence.
 *
 * There is no in-product authoring flow yet, so the report rendered here is
 * always the same FableCart fixture used by the CLI, clearly labelled as an
 * example. See `docs/features/AES-WORKFLOW-ASSESSMENT.md`.
 *
 * Pure string building — no DOM access, no messaging — so it can be unit
 * tested directly, mirroring `darkFactorySection.ts`.
 */
import { escapeHtml } from '../shared/formatUtils';
import { localize, localizeFormat } from '../shared/localization';
import { ACTIVITIES, AES_ASSESSMENT_DISCLAIMER, MODES, STOCKS } from '../../../../src/aesWorkflowAssessment';
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
} from '../../../../src/aesLabels';
import type {
	AesActivity,
	AesPosture,
	AesStock,
	AesSupportingEvidence,
	AesWorkflowReport,
} from '../../../../src/types';

const POSTURE_CSS_CLASS: Record<AesPosture, string> = {
	'healthy-agent-native': 'aes-posture-healthy-native',
	'healthy-but-underused': 'aes-posture-underused',
	'underdeveloped-foundations': 'aes-posture-underdeveloped',
	'stretched-agent-native': 'aes-posture-stretched',
	unclear: 'aes-posture-unclear',
};

function buildEvidenceListHtml(evidence: readonly AesSupportingEvidence[], informs: AesActivity | AesStock): string {
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

function buildStocksHtml(report: AesWorkflowReport): string {
	const evidence = report.assessment.supportingEvidence ?? [];
	const cards = STOCKS.map(stock => {
		const s = report.assessment.stocks[stock];
		const confidence = s.confidence ?? 'unverified';
		const ratingClass = safeCssClass(RATING_CSS_CLASS, s.rating, 'aes-rating-unknown');
		const confidenceClass = safeCssClass(CONFIDENCE_CSS_CLASS, confidence, 'aes-confidence-unverified');
		return `<div class="aes-card">
			<div class="aes-card-title">
				<span>${escapeHtml(STOCK_LABELS[stock])}</span>
				<span class="aes-badge ${ratingClass}">${escapeHtml(RATING_LABELS[s.rating] ?? s.rating)}</span>
				<span class="aes-badge ${confidenceClass}" title="${escapeHtml(localize('maturity.aes.confidenceTooltip'))}">${escapeHtml(CONFIDENCE_LABELS[confidence] ?? confidence)}</span>
			</div>
			<div class="aes-card-body">${escapeHtml(s.evidence)}</div>
			${buildEvidenceListHtml(evidence, stock)}
		</div>`;
	}).join('');
	return `<div class="aes-grid">${cards}</div>`;
}

function buildActivitiesHtml(report: AesWorkflowReport): string {
	const evidence = report.assessment.supportingEvidence ?? [];
	const cards = ACTIVITIES.map(activity => {
		const a = report.assessment.activities[activity];
		return `<div class="aes-card">
			<div class="aes-card-title">
				<span>${escapeHtml(ACTIVITY_LABELS[activity])}</span>
				<span class="aes-badge aes-delegation">${escapeHtml(DELEGATION_LABELS[a.delegation])}</span>
			</div>
			<div class="aes-card-body">${escapeHtml(a.description)}</div>
			<div class="aes-card-signal">${escapeHtml(localize('maturity.aes.signalLabel'))} ${escapeHtml(a.signal)}</div>
			${a.notes ? `<div class="aes-card-notes">${escapeHtml(a.notes)}</div>` : ''}
			${buildEvidenceListHtml(evidence, activity)}
		</div>`;
	}).join('');
	return `<div class="aes-grid">${cards}</div>`;
}

function buildModesHtml(report: AesWorkflowReport): string {
	const cards = MODES.map(mode => {
		const m = report.assessment.modes[mode];
		const antiPatterns = m.antiPatternsObserved?.length
			? `<ul class="aes-anti-patterns">${m.antiPatternsObserved.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
			: '';
		return `<div class="aes-card">
			<div class="aes-card-title">
				<span>${escapeHtml(MODE_LABELS[mode])}</span>
				<span class="aes-badge aes-delegation">${escapeHtml(DELEGATION_LABELS[m.delegation])}</span>
			</div>
			${m.notes ? `<div class="aes-card-body">${escapeHtml(m.notes)}</div>` : ''}
			${antiPatterns}
		</div>`;
	}).join('');
	return `<div class="aes-grid">${cards}</div>`;
}

function buildPostureBannerHtml(report: AesWorkflowReport): string {
	return `<div class="aes-posture-banner ${POSTURE_CSS_CLASS[report.posture]}">
		<div class="aes-posture-label">${escapeHtml(formatPostureLabel(report.posture, report.postureConfidence))}</div>
		<div class="aes-posture-guidance">${escapeHtml(report.postureGuidance)}</div>
	</div>`;
}

/** The decision a team reached: what to delegate now, what to defer, and what would change that. */
function buildDecisionHtml(report: AesWorkflowReport): string {
	const { decision } = report.assessment;
	const actions = decision.topActions.map(action => `<li>${escapeHtml(action)}</li>`).join('');
	return `<div class="aes-decision">
		<div class="aes-decision-row"><span class="aes-decision-label">${escapeHtml(localize('maturity.aes.decisionDelegateNow'))}</span>${escapeHtml(decision.delegateNow)}</div>
		<div class="aes-decision-row"><span class="aes-decision-label">${escapeHtml(localize('maturity.aes.decisionDeferred'))}</span>${escapeHtml(decision.deferred)}</div>
		<div class="aes-decision-row">
			<span class="aes-decision-label">${escapeHtml(localize('maturity.aes.decisionTopActions'))}</span>
			<ul class="aes-decision-actions">${actions}</ul>
		</div>
		<div class="aes-decision-row"><span class="aes-decision-label">${escapeHtml(localize('maturity.aes.decisionEvidenceToReconsider'))}</span>${escapeHtml(decision.evidenceToReconsider)}</div>
	</div>`;
}

/**
 * Build the whole section. Returns an empty string when no report is available
 * — mirroring `buildDarkFactorySectionHtml`'s rule that an absent assessment
 * says nothing rather than implying an empty one.
 */
export function buildAesSectionHtml(report: AesWorkflowReport | undefined): string {
	if (!report) { return ''; }

	const { assessment } = report;
	const repos = assessment.workflow.repositories.length > 0
		? assessment.workflow.repositories.map(escapeHtml).join(', ')
		: escapeHtml(localize('maturity.aes.reposEmpty'));
	const assessedMeta = localizeFormat('maturity.aes.assessedMeta', escapeHtml(new Date(assessment.assessedAt).toLocaleString()))
		+ (assessment.assessedBy ? localizeFormat('maturity.aes.assessedByMeta', escapeHtml(assessment.assessedBy)) : '');

	return `
		<div class="aes-section">
			<div class="aes-section-head">
				<span class="aes-section-icon">🧭</span>
				<span class="aes-section-title">${escapeHtml(localize('maturity.aes.title'))}</span>
				<span class="aes-section-badge">${escapeHtml(localize('maturity.aes.badge'))}</span>
			</div>
			<div class="info-box">
				<div class="info-box-title">${escapeHtml(localize('maturity.aes.whatThisMeasuresTitle'))}</div>
				<div>
					${escapeHtml(localize('maturity.aes.whatThisMeasuresBody'))}
					<br><br>
					${escapeHtml(AES_ASSESSMENT_DISCLAIMER)}
				</div>
			</div>
			<div class="aes-notice">
				${escapeHtml(localize('maturity.aes.noticeText'))}
				${localizeFormat('maturity.aes.noticeRunCli', '<code>aes --file &lt;path&gt;</code>')}
			</div>
			<div class="aes-workflow-card">
				<div class="aes-workflow-head">
					<span class="aes-workflow-name">${escapeHtml(assessment.workflow.name)}</span>
					<span class="aes-workflow-repos">${repos}</span>
				</div>
				<div class="aes-workflow-description">${escapeHtml(assessment.workflow.description)}</div>
				<div class="aes-workflow-meta">${assessedMeta}</div>
			</div>
			<div class="aes-block">
				<div class="aes-block-title">${escapeHtml(localize('maturity.aes.outcomeBlockTitle'))}</div>
				<div class="aes-outcome"><strong>${escapeHtml(localize('maturity.aes.outcomeCustomerValue'))}</strong> ${escapeHtml(assessment.outcome.customerValue)}</div>
				<div class="aes-outcome"><strong>${escapeHtml(localize('maturity.aes.outcomeCustomers'))}</strong> ${escapeHtml(assessment.outcome.customers)}</div>
			</div>
			<div class="aes-block-title">${escapeHtml(localize('maturity.aes.postureBlockTitle'))}</div>
			${buildPostureBannerHtml(report)}
			<div class="aes-block-title">${escapeHtml(localize('maturity.aes.decisionBlockTitle'))}</div>
			${buildDecisionHtml(report)}
			<div class="aes-block-title">${escapeHtml(localize('maturity.aes.stocksBlockTitle'))}</div>
			${buildStocksHtml(report)}
			<div class="aes-block-title">${escapeHtml(localize('maturity.aes.activitiesBlockTitle'))}</div>
			${buildActivitiesHtml(report)}
			<div class="aes-block-title">${escapeHtml(localize('maturity.aes.modesBlockTitle'))}</div>
			${buildModesHtml(report)}
			${assessment.notes ? `<div class="aes-block-title">${escapeHtml(localize('maturity.aes.notesBlockTitle'))}</div><div class="aes-outcome">${escapeHtml(assessment.notes)}</div>` : ''}
			<div class="aes-footer">${escapeHtml(localizeFormat('maturity.aes.footerSchema', assessment.schemaVersion))}</div>
		</div>
	`;
}
