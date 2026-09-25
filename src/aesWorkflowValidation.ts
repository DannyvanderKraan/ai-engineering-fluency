/**
 * Runtime validation for `AesWorkflowAssessment` values read from untrusted
 * input — today, the CLI's `aes --file <path>` argument.
 *
 * `AesWorkflowAssessment` is team-authored JSON, not a scan result: nothing
 * stops a hand-edited or out-of-date file from having the wrong
 * `schemaVersion`, a missing required field, or a rating outside its enum.
 * A blind `JSON.parse(...) as AesWorkflowAssessment` cast would let any of
 * those reach `buildAesWorkflowReport()` and either crash somewhere deep in
 * the renderer or — worse — silently misclassify a posture from `undefined`
 * fields. `validateAesWorkflowAssessment()` rejects all of that up front,
 * with a message that names exactly what was wrong.
 *
 * There is no migration logic yet, so any `schemaVersion` other than the
 * current {@link AES_ASSESSMENT_SCHEMA_VERSION} is rejected outright rather
 * than guessed at.
 */
import { ACTIVITIES, AES_ASSESSMENT_SCHEMA_VERSION, MODES, STOCKS } from './aesWorkflowAssessment';
import type {
	AesConfidence,
	AesDelegationLevel,
	AesMaturityRating,
	AesWorkflowAssessment,
	DarkFactoryControlState,
} from './types';

const MATURITY_RATINGS: readonly AesMaturityRating[] = ['strong', 'developing', 'weak', 'unknown'];
const CONFIDENCE_VALUES: readonly AesConfidence[] = ['verified', 'unverified'];
const DELEGATION_LEVELS: readonly AesDelegationLevel[] = [
	'human-only',
	'agent-assisted',
	'agent-performed-reviewed',
	'agent-performed-autonomous',
];
const EVIDENCE_STATES: readonly DarkFactoryControlState[] = ['present', 'absent', 'unknown'];
const EVIDENCE_INFORMS_TARGETS: readonly string[] = [...ACTIVITIES, ...STOCKS];

function fail(message: string): never {
	throw new Error(`Invalid AES workflow assessment: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.length === 0) { fail(`\`${path}\` must be a non-empty string.`); }
	return value as string;
}

function requireOptionalString(value: unknown, path: string): string | undefined {
	if (value === undefined) { return undefined; }
	return requireString(value, path);
}

function requireEnum<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
	if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
		fail(`\`${path}\` must be one of: ${allowed.join(', ')} (got ${JSON.stringify(value)}).`);
	}
	return value as T;
}

function validateStringArray(value: unknown, path: string): string[] {
	if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
		fail(`\`${path}\` must be an array of strings.`);
	}
	return value as string[];
}

function validateStock(value: unknown, path: string): void {
	if (!isRecord(value)) { fail(`\`${path}\` must be an object.`); }
	requireEnum(value.rating, MATURITY_RATINGS, `${path}.rating`);
	requireString(value.evidence, `${path}.evidence`);
	if (value.confidence !== undefined) { requireEnum(value.confidence, CONFIDENCE_VALUES, `${path}.confidence`); }
	if (value.signalsConsidered !== undefined) { validateStringArray(value.signalsConsidered, `${path}.signalsConsidered`); }
}

function validateActivity(value: unknown, path: string): void {
	if (!isRecord(value)) { fail(`\`${path}\` must be an object.`); }
	requireString(value.description, `${path}.description`);
	requireEnum(value.delegation, DELEGATION_LEVELS, `${path}.delegation`);
	requireString(value.signal, `${path}.signal`);
	requireOptionalString(value.notes, `${path}.notes`);
}

function validateMode(value: unknown, path: string): void {
	if (!isRecord(value)) { fail(`\`${path}\` must be an object.`); }
	requireEnum(value.delegation, DELEGATION_LEVELS, `${path}.delegation`);
	requireOptionalString(value.notes, `${path}.notes`);
	if (value.antiPatternsObserved !== undefined) {
		validateStringArray(value.antiPatternsObserved, `${path}.antiPatternsObserved`);
	}
}

function validateSupportingEvidence(value: unknown, index: number): void {
	const path = `supportingEvidence[${index}]`;
	if (!isRecord(value)) { fail(`\`${path}\` must be an object.`); }
	requireString(value.repo, `${path}.repo`);
	requireString(value.controlId, `${path}.controlId`);
	requireString(value.controlLabel, `${path}.controlLabel`);
	requireEnum(value.state, EVIDENCE_STATES, `${path}.state`);
	requireOptionalString(value.detail, `${path}.detail`);
	requireEnum(value.informs, EVIDENCE_INFORMS_TARGETS, `${path}.informs`);
}

/**
 * Validate an untrusted parsed-JSON value as an {@link AesWorkflowAssessment}.
 * Throws a descriptive `Error` on the first problem found; returns the same
 * value, narrowed, when it passes.
 */
export function validateAesWorkflowAssessment(candidate: unknown): AesWorkflowAssessment {
	if (!isRecord(candidate)) { fail('expected a JSON object.'); }

	if (candidate.schemaVersion !== AES_ASSESSMENT_SCHEMA_VERSION) {
		fail(
			`\`schemaVersion\` must be ${AES_ASSESSMENT_SCHEMA_VERSION} (got ${JSON.stringify(candidate.schemaVersion)}). ` +
			'There is no migration for older or newer assessment files yet.',
		);
	}

	const workflow = candidate.workflow;
	if (!isRecord(workflow)) { fail('`workflow` must be an object.'); }
	requireString(workflow.name, 'workflow.name');
	requireString(workflow.description, 'workflow.description');
	const repositories = validateStringArray(workflow.repositories, 'workflow.repositories');
	if (repositories.length === 0) { fail('`workflow.repositories` must list at least one repository.'); }

	requireString(candidate.assessedAt, 'assessedAt');
	requireOptionalString(candidate.assessedBy, 'assessedBy');

	const outcome = candidate.outcome;
	if (!isRecord(outcome)) { fail('`outcome` must be an object.'); }
	requireString(outcome.customerValue, 'outcome.customerValue');
	requireString(outcome.customers, 'outcome.customers');

	const activities = candidate.activities;
	if (!isRecord(activities)) { fail('`activities` must be an object.'); }
	for (const activity of ACTIVITIES) { validateActivity(activities[activity], `activities.${activity}`); }

	const modes = candidate.modes;
	if (!isRecord(modes)) { fail('`modes` must be an object.'); }
	for (const mode of MODES) { validateMode(modes[mode], `modes.${mode}`); }

	const stocks = candidate.stocks;
	if (!isRecord(stocks)) { fail('`stocks` must be an object.'); }
	for (const stock of STOCKS) { validateStock(stocks[stock], `stocks.${stock}`); }

	const decision = candidate.decision;
	if (!isRecord(decision)) { fail('`decision` must be an object.'); }
	requireString(decision.delegateNow, 'decision.delegateNow');
	requireString(decision.deferred, 'decision.deferred');
	validateStringArray(decision.topActions, 'decision.topActions');
	requireString(decision.evidenceToReconsider, 'decision.evidenceToReconsider');

	if (candidate.supportingEvidence !== undefined) {
		if (!Array.isArray(candidate.supportingEvidence)) { fail('`supportingEvidence` must be an array.'); }
		candidate.supportingEvidence.forEach((item, index) => validateSupportingEvidence(item, index));
	}

	requireOptionalString(candidate.notes, 'notes');

	return candidate as unknown as AesWorkflowAssessment;
}
