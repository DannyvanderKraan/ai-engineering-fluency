import { getWindowData } from './dataLoader';

type PricingEntry = { displayNames?: string[] };

// Build display name map from pricing JSON injected by the extension host as window.__MODEL_PRICING__.
// This is the single source of truth so it stays in sync with the nightly JSON refresh.
const _pricingData = getWindowData<{ pricing: Record<string, PricingEntry> }>('__MODEL_PRICING__');
const _modelNames: Record<string, string> = {};
for (const [modelId, pricing] of Object.entries((_pricingData?.pricing ?? {}) as Record<string, PricingEntry>)) {
    if (pricing.displayNames && pricing.displayNames.length > 0) {
        _modelNames[modelId] = pricing.displayNames[0];
    }
}

/** Suffix appended to the user-chosen provider name so custom endpoints are recognizable as such. */
const CUSTOM_PROVIDER_SUFFIX = ' (Custom)';

/**
 * A model served by a user-configured custom endpoint (BYOK), parsed from its
 * three-part model identifier.
 */
export interface CustomProviderModel {
    /** The host/extension that registered the endpoint, e.g. `customendpoint`, `unify-chat-provider`. */
    source: string;
    /** The provider name the user typed when registering the endpoint, e.g. `Mistral`. */
    providerName: string;
    /** The model identifier sent to the endpoint, e.g. `mistral-medium-latest`. */
    modelId: string;
}

/** URI-decodes a single model-ID segment, falling back to the raw text when it is malformed. */
function decodeSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

/**
 * Parses a custom-endpoint model identifier.
 *
 * Models added through a user-configured endpoint (VS Code "custom endpoint" / BYOK,
 * unify-chat-provider, …) arrive as three slash-separated parts:
 *
 *   `<source>/<user-chosen provider name>/<model id>`
 *   e.g. `customendpoint/Mistral/mistral-medium-latest`
 *
 * Both the provider name and the model id are free text typed by the user, so the
 * two are only split apart when all three parts are present — a plain model id
 * (`gpt-4o`) or a two-part id is left untouched.
 *
 * @returns the parsed parts, or `undefined` when the id is not a three-part custom-endpoint id.
 */
export function parseCustomProviderModel(model: string): CustomProviderModel | undefined {
    const parts = model.split('/');
    if (parts.length !== 3 || parts.some(part => part.trim() === '')) { return undefined; }
    return {
        source: decodeSegment(parts[0]),
        providerName: decodeSegment(parts[1]),
        modelId: decodeSegment(parts[2]),
    };
}

/** Matches a leading `<uuid>/` prefix, e.g. org-scoped Copilot model catalog ids. */
const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;

/**
 * Returns candidate model ids to try when looking up a raw model id in the
 * pricing JSON, most specific first. Handles the id variants seen in session
 * logs that all refer to the same underlying model:
 *
 * - `copilot/` prefix stripping
 * - custom-endpoint ids (`<source>/<provider>/<model>`) → the model part
 * - org-scoped Copilot catalog ids (`<uuid>/<model>`) → the model part
 * - dash-separated version numbers (`claude-opus-4-8` → `claude-opus-4.8`),
 *   applied to each of the above
 */
export function getModelLookupCandidates(model: string): string[] {
	const candidates: string[] = [];
	const add = (id: string) => { if (id && !candidates.includes(id)) { candidates.push(id); } };
	const addWithVersionVariant = (id: string) => {
		add(id);
		// Some logs emit version numbers dash-separated (claude-opus-4-8) where the
		// pricing JSON uses dots (claude-opus-4.8). Only convert the first
		// digit-dash-digit run so date suffixes (…-4-5-20251001) stay intact.
		add(id.replace(/(\d+)-(\d+)(?=-|$)/, '$1.$2'));
	};

	const base = model.replace(/^copilot\//, '');
	addWithVersionVariant(base);
	const custom = parseCustomProviderModel(base);
	if (custom) { addWithVersionVariant(custom.modelId); }
	if (UUID_PREFIX.test(base)) { addWithVersionVariant(base.replace(UUID_PREFIX, '')); }
	return candidates;
}

/**
 * Returns the provider group for a custom-endpoint model — the user-chosen provider
 * name marked as custom, e.g. `Mistral (Custom)` for
 * `customendpoint/Mistral/mistral-medium-latest`.
 *
 * @returns `undefined` for models that do not come from a custom endpoint.
 */
export function getCustomProviderGroup(model: string): string | undefined {
    const parsed = parseCustomProviderModel(model);
    return parsed ? `${parsed.providerName}${CUSTOM_PROVIDER_SUFFIX}` : undefined;
}

/** Whether a provider/billing group name was produced by `getCustomProviderGroup`. */
export function isCustomProviderGroup(group: string): boolean {
    return group.endsWith(CUSTOM_PROVIDER_SUFFIX);
}

/**
 * Returns a human-friendly display name for a given model identifier.
 *
 * Custom-endpoint ids are reduced to their model part (the user-chosen provider
 * name is surfaced separately as a provider group), so
 * `customendpoint/Mistral/mistral-medium-latest` displays as the friendly name of
 * `mistral-medium-latest`. Org-scoped catalog ids (`<uuid>/model`) and
 * dash/dot version variants are resolved via `getModelLookupCandidates`.
 *
 * If the model ID is not in the pricing JSON, it falls back to URI-decoding
 * the raw ID (e.g. unify-chat-provider names contain %20-encoded segments),
 * with known prefix forms (custom endpoint, org UUID) stripped.
 */
export function getModelDisplayName(model: string): string {
    for (const candidate of getModelLookupCandidates(model)) {
    	if (_modelNames[candidate]) { return _modelNames[candidate]; }
    }
    const custom = parseCustomProviderModel(model);
    if (custom) { return custom.modelId; }
    if (UUID_PREFIX.test(model)) { return model.replace(UUID_PREFIX, ''); }
    return decodeSegment(model);
}

// ---------------------------------------------------------------------------
// Canonical model identity and underlying model vendor
// ---------------------------------------------------------------------------

/**
 * Canonical id standing in for "this usage names no model".
 *
 * The capital letter is load-bearing: {@link getCanonicalModelId} lowercases
 * everything it returns, so no real model id can ever canonicalize onto this
 * marker. A lowercase word could — a custom endpoint's free-text model part
 * passes straight through, so `customendpoint/Acme/unknown` really would produce
 * `unknown` and become indistinguishable from model-less activity.
 */
export const UNKNOWN_MODEL_ID = 'Unattributed';

/**
 * Vendor bucket for models we cannot place. Deliberately *not* a guess: an
 * unrecognized model stays visible under this label instead of being dropped or
 * filed under a vendor it may not come from.
 */
export const UNCLASSIFIED_VENDOR = 'Unclassified';

/**
 * Canonical identity used when a model has to be *grouped* rather than merely
 * displayed: the same underlying model reached through `copilot/`, an
 * org-scoped catalog id, a custom endpoint, or a dash-vs-dot version spelling
 * collapses onto one key.
 *
 * Prefers the id the pricing JSON knows (so `copilot/claude-opus-4-8` and
 * `claude-opus-4.8` land on the same canonical id); otherwise falls back to the
 * most-stripped candidate, lowercased so casing differences between editors do
 * not split a model in two.
 *
 * Returns {@link UNKNOWN_MODEL_ID} for sessions that name no model at all.
 */
export function getCanonicalModelId(model: string): string {
	// Lowercase *before* the lookup, not just after: the candidate builder strips
	// `copilot/` case-sensitively, so `COPILOT/claude-opus-4.8` would otherwise
	// keep its wrapper and never meet plain `claude-opus-4.8`.
	const raw = (model ?? '').trim().toLowerCase();
	if (!raw) { return UNKNOWN_MODEL_ID; }
	// Most-normalized candidate first. `getModelLookupCandidates` lists the raw
	// spelling before its dash-to-dot variant, so scanning forwards would hand
	// `claude-sonnet-4-6` and `claude-sonnet-4.6` different canonical ids the day
	// the pricing catalog happens to carry both spellings — the alias collapse
	// this function promises has to be independent of what pricing knows.
	const candidates = getModelLookupCandidates(raw);
	for (let i = candidates.length - 1; i >= 0; i--) {
		if (_modelNames[candidates[i]]) { return candidates[i].toLowerCase(); }
	}
	const fallback = candidates.length > 0 ? candidates[candidates.length - 1] : raw;
	return decodeSegment(fallback).toLowerCase();
}

/**
 * Canonical-id prefix → the company that *makes* the model, checked in order.
 *
 * This is deliberately a different question from {@link
 * import('../../chartDataBuilder').getModelBillingProvider} / `getBillingGroup`,
 * which answer "who bills for this call" — Copilot-hosted calls bill as GitHub
 * Copilot whatever model runs them, and custom endpoints bill under the
 * provider name the user typed. Neither tells you who built the model, so
 * neither may be used as the meaning of a model-vendor filter.
 */
const MODEL_VENDOR_PREFIXES: Array<[string, string]> = [
	['anthropic', 'Anthropic'],
	['claude', 'Anthropic'],
	['chatgpt', 'OpenAI'],
	['codex', 'OpenAI'],
	['davinci', 'OpenAI'],
	['gpt', 'OpenAI'],
	['o1', 'OpenAI'],
	['o3', 'OpenAI'],
	['o4', 'OpenAI'],
	['gemini', 'Google'],
	['gemma', 'Google'],
	['google', 'Google'],
	['codestral', 'Mistral AI'],
	['devstral', 'Mistral AI'],
	['magistral', 'Mistral AI'],
	['ministral', 'Mistral AI'],
	['mistral', 'Mistral AI'],
	['pixtral', 'Mistral AI'],
	['goldeneye', 'xAI'],
	['grok', 'xAI'],
	['raptor', 'xAI'],
	['codellama', 'Meta'],
	['llama', 'Meta'],
	['deepseek', 'DeepSeek'],
	['kimi', 'Moonshot AI'],
	['moonshot', 'Moonshot AI'],
	['glm', 'Zhipu AI'],
	['qwen', 'Alibaba'],
	['qwq', 'Alibaba'],
	['mai-', 'Microsoft'],
	['phi-', 'Microsoft'],
	['command-', 'Cohere'],
	['sonar', 'Perplexity'],
	['minimax', 'MiniMax'],
];

/**
 * The company that makes the model behind a raw model id — *not* who bills for
 * it. Classified from the canonical model id, so a custom endpoint's
 * user-typed provider label ("Acme" in `customendpoint/Acme/mistral-large`)
 * never becomes a vendor: only the model part (`mistral-large`) is read.
 *
 * @returns the vendor name, or {@link UNCLASSIFIED_VENDOR} when the id matches
 *          nothing we recognize.
 */
export function getModelVendor(model: string): string {
	const canonical = getCanonicalModelId(model);
	if (canonical === UNKNOWN_MODEL_ID) { return UNCLASSIFIED_VENDOR; }
	const match = MODEL_VENDOR_PREFIXES.find(([prefix]) => matchesVendorPrefix(canonical, prefix));
	return match ? match[1] : UNCLASSIFIED_VENDOR;
}

/**
 * Whether a canonical id starts with a vendor prefix *as a whole token*.
 *
 * A bare `startsWith` would read `gptish-internal` as OpenAI's and `claudefake`
 * as Anthropic's, which is exactly the guessing this classifier exists to avoid:
 * only a version or variant separator (or a digit, as in `gpt5`) may follow the
 * prefix. Anything else is a different word, and stays Unclassified.
 */
function matchesVendorPrefix(canonical: string, prefix: string): boolean {
	if (!canonical.startsWith(prefix)) { return false; }
	if (canonical.length === prefix.length) { return true; }
	return /[-._/0-9]/.test(canonical.charAt(prefix.length));
}
