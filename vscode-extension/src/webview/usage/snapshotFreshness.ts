/**
 * The freshness banner shared by the two GitHub-activity panels (Repository PRs and Cloud Agent).
 *
 * Both panels are served from a cache that is revalidated at most once an hour, by whichever VS
 * Code window holds that cache's lock, so the banner has to be explicit about what the user is
 * actually looking at:
 *
 * - **never fetched** — no snapshot yet; the first refresh will fill it in;
 * - **fresh** — how old it is and when the next refresh is due;
 * - **stale/revalidating** — the TTL has passed, so what is on screen is the cached snapshot while
 *   a refresh happens. Saying so beats silently showing hour-old numbers as if they were live;
 * - **partial** — a listing did not complete or a fetch budget ran out, so the figures below are a
 *   lower bound rather than a total.
 *
 * It always offers **Refresh now**, which asks the host to revalidate immediately. The host applies
 * its own cooldown and cross-window lock, so a click is a request, not a guaranteed API call.
 *
 * Lives in its own module (like `readiness.ts` and `agentSessionsSanitizer.ts`) so these states can
 * be unit tested without rendering the whole Usage Analysis panel.
 */
import { escapeHtml, getTimeSince } from '../shared/formatUtils';

/** The message command the Refresh now button posts to the extension host. */
export const REFRESH_GITHUB_ACTIVITY_COMMAND = 'refreshGitHubActivity';

/** `data-action` the delegated click handler in `main.ts` looks for. */
export const REFRESH_GITHUB_ACTIVITY_ACTION = 'refresh-github-activity';

/** Shared styling for the two GitHub-activity freshness banners. */
const BOX_STYLE = 'margin-bottom:12px; padding:8px 10px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:6px; font-size:11px; color:var(--text-secondary);';

/** The button that asks the host for an immediate revalidation of both GitHub-activity caches. */
const REFRESH_BUTTON = `<button type="button" data-action="${REFRESH_GITHUB_ACTIVITY_ACTION}"
    style="margin-left:8px; padding:2px 8px; font-size:11px; cursor:pointer; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary);"
    title="Revalidate the cached GitHub data now instead of waiting for the next hourly refresh">🔄 Refresh now</button>`;

/** The subset of a snapshot the banner reads — both result shapes structurally satisfy it. */
export interface SnapshotFreshness {
	/** ISO timestamp of the cached snapshot; empty/absent when it has never been fetched. */
	fetchedAt?: string;
	/** How often the host revalidates, so the banner can say when the next refresh is due. */
	refreshIntervalMs?: number;
	/** True when the figures behind this banner are a lower bound. */
	partial?: boolean;
}

/** Which state the banner is in, split out so it can be asserted without parsing HTML. */
export type SnapshotFreshnessState = 'never-fetched' | 'fresh' | 'stale';

/** Classify a snapshot for the banner. A snapshot with no known interval never reads as stale. */
export function snapshotFreshnessState(data: SnapshotFreshness, now: number): SnapshotFreshnessState {
	if (!data.fetchedAt) { return 'never-fetched'; }
	const fetchedMs = Date.parse(data.fetchedAt);
	const intervalMs = data.refreshIntervalMs ?? 0;
	if (!Number.isFinite(fetchedMs) || intervalMs <= 0) { return 'fresh'; }
	return now >= fetchedMs + intervalMs ? 'stale' : 'fresh';
}

/**
 * Render the freshness banner.
 *
 * @param partialNote Panel-specific explanation of *why* the data can be a lower bound.
 * @param now Injected for testing; defaults to the current time.
 */
export function snapshotFreshnessHtml(
	data: SnapshotFreshness,
	options: { partialNote: string },
	now: number = Date.now(),
): string {
	const state = snapshotFreshnessState(data, now);
	if (state === 'never-fetched') {
		return `<div style="${BOX_STYLE}">🕒 <strong>Not fetched yet.</strong> The snapshot is refreshed hourly by the main VS Code window — it will appear here once that first refresh completes.${REFRESH_BUTTON}</div>`;
	}
	const fetchedMs = Date.parse(data.fetchedAt!);
	const intervalMs = data.refreshIntervalMs ?? 0;
	const nextRefresh = Number.isFinite(fetchedMs) && intervalMs > 0
		? new Date(fetchedMs + intervalMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		: 'unknown';
	const status = state === 'stale'
		? `⏳ <strong>Revalidating.</strong> Showing the cached snapshot from <strong>${escapeHtml(getTimeSince(data.fetchedAt!))}</strong> while it is refreshed.`
		: `🕒 Updated <strong>${escapeHtml(getTimeSince(data.fetchedAt!))}</strong> · next refresh after ${escapeHtml(nextRefresh)}.`;
	const partial = data.partial
		? `<div style="margin-top:4px;">⚠️ <strong>Partial data — the figures below are a lower bound.</strong> ${escapeHtml(options.partialNote)}</div>`
		: '';
	return `<div style="${BOX_STYLE}">
    ${status}
    Cached and refreshed at most once an hour, by a single VS Code window, to keep GitHub API usage low.${REFRESH_BUTTON}
    ${partial}
  </div>`;
}

/** Why the Repository PRs figures can be a lower bound. */
export const REPO_PR_PARTIAL_NOTE = 'At least one repository listing did not complete (an error, a timeout, or the page cap), so some pull requests in the window are not counted.';

/** Why the Cloud Agent figures can be a lower bound. */
export const AGENT_SESSIONS_PARTIAL_NOTE = 'Some tasks were not detailed this pass — the task-detail budget was exhausted, or a task listing did not complete.';
