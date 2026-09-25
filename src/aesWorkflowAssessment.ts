/**
 * AES workflow assessment — pure scoring and classification logic.
 *
 * Assesses a team's *self-reported* answers about one delivery workflow
 * against GitHub's Agentic Engineering System (AES) framework: three stocks
 * (governance, shared knowledge, customer value), three activities (define,
 * deliver, detect) and three modes (director, performer, assessor).
 *
 * This is a different lens from the two other assessments already in this
 * codebase, and it is designed to never be confused with either:
 *
 * - **Fluency Score** scores an *individual's* tool usage from local session
 *   data. AES has no individual score at all.
 * - **Dark Factory Readiness** (`darkFactoryReadiness.ts`) scans a single
 *   *repository* for observable governance controls. AES assesses a *named
 *   workflow* that may span several repositories, and its content is
 *   team-reported, not scanned.
 *
 * A Dark Factory observation may be attached to an AES assessment as
 * {@link AesSupportingEvidence} — e.g. "CI runs your test suite" informing the
 * `deliver` activity — but it is only ever offered as evidence for a team's
 * own answer. `present` / `absent` / `unknown` states are carried through
 * unchanged and this module never promotes one into an AES conclusion by
 * itself. See `AGENTS.md` and `docs/features/AES-WORKFLOW-ASSESSMENT.md`.
 *
 * Pure module: no VS Code API, no filesystem access, no network calls. Safe
 * to unit test directly and to call from the CLI.
 */
import type {
	AesActivity,
	AesConfidence,
	AesDelegationLevel,
	AesMode,
	AesPosture,
	AesStock,
	AesWorkflowAssessment,
	AesWorkflowReport,
} from './types';
import { AES_ASSESSMENT_SCHEMA_VERSION } from './types';

export { AES_ASSESSMENT_SCHEMA_VERSION };

/**
 * Shown wherever an AES assessment is reported. This is a team's own
 * self-assessment of one workflow, not a scan and not a certification, and it
 * says nothing about any individual.
 */
export const AES_ASSESSMENT_DISCLAIMER =
	'This is a team-reported self-assessment of one workflow against GitHub\'s Agentic Engineering ' +
	'System (AES) framework — not a repository scan, not a certification, and never a score for a person. ' +
	'The matrix below shows direction, not a threshold to pass.';

export const ACTIVITIES: readonly AesActivity[] = ['define', 'deliver', 'detect'];
export const MODES: readonly AesMode[] = ['director', 'performer', 'assessor'];
export const STOCKS: readonly AesStock[] = ['governance', 'sharedKnowledge', 'customerValue'];

/**
 * The two stocks that place a workflow on the AES "Stock-Adoption matrix"
 * axis. `customerValue` is the framework's separately reported *outcome*
 * stock — it answers "is this creating value", not "are the foundations
 * strong enough for this much delegation" — so it must never gate the
 * posture the matrix derives. Only `governance` and `sharedKnowledge` do.
 */
export const FOUNDATION_STOCKS: readonly AesStock[] = ['governance', 'sharedKnowledge'];

/** Ordered so `Math.max` over indices gives "deepest delegation" a stable meaning. */
const DELEGATION_ORDER: readonly AesDelegationLevel[] = [
	'human-only',
	'agent-assisted',
	'agent-performed-reviewed',
	'agent-performed-autonomous',
];

/** True once agent involvement in the workflow reaches reviewed or autonomous delivery. */
function isAgentNative(level: AesDelegationLevel): boolean {
	return DELEGATION_ORDER.indexOf(level) >= DELEGATION_ORDER.indexOf('agent-performed-reviewed');
}

/** The deepest (most agent-delegated) level reported across every activity and mode. */
export function deepestDelegation(assessment: AesWorkflowAssessment): AesDelegationLevel {
	const levels = [
		...ACTIVITIES.map(activity => assessment.activities[activity].delegation),
		...MODES.map(mode => assessment.modes[mode].delegation),
	];
	return levels.reduce((deepest, level) =>
		DELEGATION_ORDER.indexOf(level) > DELEGATION_ORDER.indexOf(deepest) ? level : deepest,
	'human-only' as AesDelegationLevel);
}

/**
 * True when both foundation stocks ({@link FOUNDATION_STOCKS} — governance and
 * shared knowledge) are rated `strong` or `developing`. `customerValue` is
 * deliberately excluded: it is the matrix's outcome stock, not a foundation,
 * so a weak or unknown customer-value rating must not flip an otherwise solid
 * workflow into "underdeveloped foundations" or "unclear".
 */
export function foundationsAreSolid(assessment: AesWorkflowAssessment): boolean {
	return FOUNDATION_STOCKS.every(stock => {
		const rating = assessment.stocks[stock].rating;
		return rating === 'strong' || rating === 'developing';
	});
}

/** True when at least one foundation stock is explicitly rated `weak`. */
function hasWeakFoundationStock(assessment: AesWorkflowAssessment): boolean {
	return FOUNDATION_STOCKS.some(stock => assessment.stocks[stock].rating === 'weak');
}

/** True when at least one foundation stock could not be rated (`unknown`). */
function hasUnknownFoundationStock(assessment: AesWorkflowAssessment): boolean {
	return FOUNDATION_STOCKS.some(stock => assessment.stocks[stock].rating === 'unknown');
}

/**
 * `verified` only when both foundation stocks' ratings ({@link FOUNDATION_STOCKS}
 * — the ones that actually drive `posture`) were themselves marked
 * {@link AesConfidence}-`verified`. A rating with no `confidence` field is
 * treated as `unverified` — confidence must be claimed, never assumed — so
 * older assessments written before this field existed are conservatively
 * flagged for confirmation rather than silently trusted. `customerValue`'s
 * confidence is not consulted here for the same reason it does not gate
 * `posture`: it is the outcome stock, not a foundation.
 */
export function derivePostureConfidence(assessment: AesWorkflowAssessment): AesConfidence {
	return FOUNDATION_STOCKS.every(stock => assessment.stocks[stock].confidence === 'verified') ? 'verified' : 'unverified';
}

const POSTURE_GUIDANCE: Record<AesPosture, string> = {
	'healthy-agent-native':
		'Governance and shared knowledge are reported strong or developing, and agent delegation already reaches reviewed ' +
		'or autonomous delivery. Stay the course, and expand to the next safe class of work.',
	'healthy-but-underused':
		'Governance and shared knowledge are reported strong or developing, but agents are not yet performing or delivering ' +
		'this work. The foundations could support more delegation than is currently used — expand agent participation on ' +
		'small, well-bounded tasks first.',
	'underdeveloped-foundations':
		'Governance or shared knowledge is reported weak, and agent delegation for this workflow is still human-only or ' +
		'agent-assisted. Strengthen governance and shared knowledge before expanding agent use here.',
	'stretched-agent-native':
		'Governance or shared knowledge is reported weak, yet agent delegation already reaches reviewed or autonomous ' +
		'delivery. This is the misaligned state the framework calls out explicitly — slow expansion, narrow the agent\'s ' +
		'scope, and repair the missing foundations.',
	'unclear':
		'Governance or shared knowledge could not be rated, so this workflow cannot yet be placed on the matrix. Answer ' +
		'the missing foundation-stock question(s) before drawing a conclusion about posture.',
};

/**
 * Classify a workflow onto the AES "Stock-Adoption matrix" — whether current
 * agent delegation matches the strength of its governance and shared-
 * knowledge foundations ({@link FOUNDATION_STOCKS}). Derived only from the
 * team's own stock ratings and delegation answers; it reads no repository
 * evidence and detects nothing. `customerValue` is reported alongside these
 * but never changes where a workflow lands on this axis — it is the
 * framework's separately reported outcome stock, not a foundation.
 *
 * An `unknown` foundation-stock rating always yields `'unclear'` rather than
 * guessing — the matrix shows direction, and a guess dressed up as a posture
 * is not direction, it is a false claim.
 */
export function classifyAesPosture(assessment: AesWorkflowAssessment): AesPosture {
	if (hasUnknownFoundationStock(assessment)) { return 'unclear'; }

	const agentNative = isAgentNative(deepestDelegation(assessment));
	const solid = foundationsAreSolid(assessment) && !hasWeakFoundationStock(assessment);

	if (solid && agentNative) { return 'healthy-agent-native'; }
	if (solid && !agentNative) { return 'healthy-but-underused'; }
	if (!solid && agentNative) { return 'stretched-agent-native'; }
	return 'underdeveloped-foundations';
}

const NEEDS_CONFIRMATION_NOTE =
	' This has not been confirmed: at least one stock rating behind it is unverified — an impression, not something the ' +
	'team has checked. Treat this as a lead worth confirming, not a firm conclusion, until it is.';

/**
 * Build the computed, read-only view of an assessment: posture, guidance and
 * the summary figures the report renderer needs. Does not mutate or validate
 * the assessment — that is the caller's responsibility when accepting
 * team input from an untrusted source.
 */
export function buildAesWorkflowReport(assessment: AesWorkflowAssessment): AesWorkflowReport {
	const posture = classifyAesPosture(assessment);
	const postureConfidence = derivePostureConfidence(assessment);
	const guidance = POSTURE_GUIDANCE[posture];
	return {
		assessment,
		posture,
		postureConfidence,
		// 'unclear' already means "a rating is missing" — appending the confirmation
		// note there would conflate two different reasons a conclusion isn't possible.
		postureGuidance: (posture !== 'unclear' && postureConfidence === 'unverified')
			? `${guidance}${NEEDS_CONFIRMATION_NOTE}`
			: guidance,
		foundationsSolid: foundationsAreSolid(assessment),
		deepestDelegation: deepestDelegation(assessment),
	};
}
