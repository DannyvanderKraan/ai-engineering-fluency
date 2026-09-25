/**
 * Display labels shared between the AES report renderers (`aesWorkflowReportRenderer.ts`,
 * for the CLI's text/HTML export) and the VS Code webview section
 * (`vscode-extension/src/webview/maturity/aesSection.ts`).
 *
 * Kept in one place so the wording a team sees in the CLI's `--html` export
 * matches what they see in the Fluency Score view — divergent copy for the
 * same rating would read as two different assessments.
 *
 * These enum-label constants are intentionally NOT routed through the
 * webview's `localize()` pipeline, even though `aesSection.ts`'s own static
 * UI chrome (headings, notices, footer) is. The CLI has no localization
 * infrastructure at all — it is TypeScript run under Node, with no
 * `package.nls.*.json`/`webviewStrings.generated.json` equivalent — so
 * localizing this module only for the webview half would immediately
 * reintroduce the divergent-copy problem described above: a `weak` rating
 * would read "Weak" in the CLI's `--html` export but a translated string in
 * the webview. Fully localizing the CLI is a larger, separate change and out
 * of scope here.
 */
import type { AesActivity, AesConfidence, AesMaturityRating, AesMode, AesPosture, AesStock, AesSupportingEvidence } from './types';

export const ACTIVITY_LABELS: Record<AesActivity, string> = {
	define: 'Define — decide what should happen',
	deliver: 'Deliver — make the change',
	detect: 'Detect — observe what happened',
};

export const MODE_LABELS: Record<AesMode, string> = {
	director: 'Director — sets direction',
	performer: 'Performer — carries out the work',
	assessor: 'Assessor — evaluates the result',
};

export const STOCK_LABELS: Record<AesStock, string> = {
	governance: 'Governance',
	sharedKnowledge: 'Shared knowledge',
	customerValue: 'Customer value',
};

export const DELEGATION_LABELS: Record<string, string> = {
	'human-only': 'Human-only',
	'agent-assisted': 'Agent-assisted',
	'agent-performed-reviewed': 'Agent-performed, human-reviewed',
	'agent-performed-autonomous': 'Agent-performed, autonomous',
};

export const RATING_LABELS: Record<string, string> = {
	strong: 'Strong',
	developing: 'Developing',
	weak: 'Weak',
	unknown: 'Unknown',
};

/**
 * Fixed allowlists from a rating/evidence-state enum to its CSS class name.
 *
 * Both the CLI's HTML renderer and the VS Code webview section interpolate a
 * class name built from team-authored `--file` JSON (`AesStockAssessment.rating`,
 * `AesSupportingEvidence.state`). Deriving the class from a map instead of the
 * raw enum value means a malformed or unrecognised value can only ever
 * produce one of these fixed strings, never break out of the `class`
 * attribute into markup or another attribute.
 */
export const RATING_CSS_CLASS: Record<AesMaturityRating, string> = {
	strong: 'aes-rating-strong',
	developing: 'aes-rating-developing',
	weak: 'aes-rating-weak',
	unknown: 'aes-rating-unknown',
};

export const EVIDENCE_STATE_CSS_CLASS: Record<AesSupportingEvidence['state'], string> = {
	present: 'aes-evidence-present',
	absent: 'aes-evidence-absent',
	unknown: 'aes-evidence-unknown',
};

export const CONFIDENCE_CSS_CLASS: Record<AesConfidence, string> = {
	verified: 'aes-confidence-verified',
	unverified: 'aes-confidence-unverified',
};

/**
 * Safe lookup into one of the allowlists above: a value that is not a
 * recognised key (e.g. an untrusted `--file` JSON with a stray or malformed
 * enum value) falls back to `fallback` instead of producing `undefined` in a
 * `class` attribute.
 */
export function safeCssClass<T extends string>(map: Record<T, string>, value: T, fallback: string): string {
	return Object.prototype.hasOwnProperty.call(map, value) ? map[value] : fallback;
}

export const CONFIDENCE_LABELS: Record<AesConfidence, string> = {
	verified: 'Verified',
	unverified: 'Unverified',
};

export const POSTURE_LABELS: Record<AesPosture, string> = {
	'healthy-agent-native': 'Healthy agent-native',
	'healthy-but-underused': 'Healthy but underused',
	'underdeveloped-foundations': 'Underdeveloped foundations',
	'stretched-agent-native': 'Stretched agent-native',
	unclear: 'Unclear — missing stock evidence',
};

/**
 * The label actually shown for a posture: prefixed with "Possible " and
 * suffixed with "— confirmation needed" whenever it was derived from at
 * least one unverified stock rating. `unclear` is left unchanged — it
 * already means a rating is missing, a different case from "reached from an
 * unverified one".
 */
export function formatPostureLabel(posture: AesPosture, confidence: AesConfidence): string {
	const label = POSTURE_LABELS[posture];
	if (posture === 'unclear' || confidence === 'verified') { return label; }
	return `Possible ${label.charAt(0).toLowerCase()}${label.slice(1)} — confirmation needed`;
}

export const EVIDENCE_STATE_ICON: Record<AesSupportingEvidence['state'], string> = {
	present: '✔',
	absent: '✘',
	unknown: '?',
};
