/**
 * Centralized configuration constants for the sharing server.
 * Centralizes rate limits, cache TTLs, and other tunable parameters
 * so they can be adjusted in one place for deployment flexibility.
 */

// ── Auth / Token Cache ────────────────────────────────────────────────────────

/** How long (ms) a successfully validated GitHub token is cached. */
export const TOKEN_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** How long (ms) an invalid/rejected token is cached (negative cache). */
export const NEGATIVE_CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Maximum number of entries in each in-memory auth/rate-limit map
 * (token cache, negative cache, upload rate map, IP rate map).
 * Caps memory growth when an attacker rotates tokens or spoofed IPs;
 * oldest entries are evicted first once the cap is reached.
 */
export const AUTH_MAP_MAX_ENTRIES = 10_000;

/** How often (ms) expired entries are swept from the auth/rate-limit maps. */
export const AUTH_MAP_SWEEP_INTERVAL_MS = 60 * 1000; // 1 minute

// ── Rate Limits ───────────────────────────────────────────────────────────────

/** Maximum upload requests allowed per user per UPLOAD_RATE_WINDOW_MS. */
export const UPLOAD_RATE_MAX = 100;

/** Duration (ms) of the per-user upload rate limit window. */
export const UPLOAD_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Default maximum coaching-session snapshots accepted from one user per hour. */
export const DEFAULT_COACHING_UPLOAD_RATE_MAX = 100;

/** Upper bound for the configurable per-user coaching upload limit. */
export const MAX_COACHING_UPLOAD_RATE_MAX = 1_000;

export function parseCoachingUploadRateMax(value: string | undefined): number {
	if (value === undefined || value.trim() === '') return DEFAULT_COACHING_UPLOAD_RATE_MAX;
	const normalized = value.trim();
	const parsed = Number(normalized);
	if (!/^\d+$/.test(normalized) || !Number.isSafeInteger(parsed)
		|| parsed < 1 || parsed > MAX_COACHING_UPLOAD_RATE_MAX) {
		throw new Error(`COACHING_UPLOAD_RATE_MAX must be an integer between 1 and ${MAX_COACHING_UPLOAD_RATE_MAX}.`);
	}
	return parsed;
}

/** Maximum coaching-session snapshots accepted from one user per hour. */
export const COACHING_UPLOAD_RATE_MAX = parseCoachingUploadRateMax(process.env.COACHING_UPLOAD_RATE_MAX);

/** Maximum bytes in a single raw coaching-session upload. */
export const MAX_COACHING_SESSION_BYTES = 2_000_000; // 2 MB

/** Maximum number of distinct coaching sessions retained per user. */
export const MAX_COACHING_SESSIONS_PER_USER = 100;

/** Maximum queued or active coaching analyses across the server. */
export const MAX_COACHING_PENDING_JOBS = 100;

/** Maximum queued or active coaching analyses for a single user. */
export const MAX_COACHING_PENDING_JOBS_PER_USER = 3;

/** Maximum requests allowed per IP per IP_RATE_WINDOW_MS (pre-auth). */
export const IP_RATE_MAX = 200;

/** Duration (ms) of the per-IP rate limit window. */
export const IP_RATE_WINDOW_MS = 60 * 1000; // 1 minute

// ── Session / OAuth ───────────────────────────────────────────────────────────

/** How long (seconds) a session cookie remains valid. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Max age (seconds) for the OAuth state CSRF cookie. */
export const OAUTH_STATE_MAX_AGE_SECONDS = 300; // 5 minutes

// ── API Validation ────────────────────────────────────────────────────────────

/** Maximum field lengths for upload entry string fields. */
export const MAX_STRING_LENGTHS = {
	model: 128,
	workspaceId: 256,
	workspaceName: 256,
	machineId: 256,
	machineName: 256,
	datasetId: 128,
	editor: 100,
} as const;

/** Maximum allowed value for token counts per upload entry. */
export const MAX_TOKEN_VALUE = 2_000_000_000; // 2B tokens — large agent sessions can exceed 100M in one day

/** Maximum number of entries allowed in a single upload request. */
export const MAX_ENTRIES_PER_UPLOAD = 500;

// ── Database / Backup ─────────────────────────────────────────────────────────

/** How often (ms) the database is backed up to Azure Files. */
export const BACKUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
