# GitHub activity cache

The Usage Analysis view has two tabs whose data comes from the GitHub API rather than from local
session logs: **Repository PRs** and **Cloud Agent**. Both are served from a cache in the
extension's global storage so opening a tab is instant and costs no API calls. This document is the
reference for how that cache behaves — what it keeps, who can read it, when it refreshes, and what
it does when it cannot get a complete answer.

Source: `vscode-extension/src/githubActivityCache.ts` (shared policy),
`vscode-extension/src/repoPrCache.ts` (Repository PRs),
`vscode-extension/src/agentTasksCache.ts` (Cloud Agent).

## What is cached, per entity

Before, each cache held only the aggregate snapshot the panel renders, so every refresh after the
TTL expired paid for everything again — including relisting and re-detailing up to 200 cloud-agent
tasks that had not changed. Both caches now also keep a **per-entity record**:

| Cache | Keyed by | Record holds |
|---|---|---|
| Repository PRs | normalized `owner/repo` + PR number | title, URL, `created_at`, exact `updated_at`, open/closed state, merged flag, author login, author and requested-reviewer AI attribution |
| Cloud Agent | `owner/repo` + task ID (`agentTaskCacheKey`) | exact `updated_at`, repository attribution, which listing surfaced it, the pre-aggregated cloud-session totals, and the detail-fetch success/retry state |

Titles are kept for Repository PRs only because the existing AI-detail list displays them.
Deliberately **not** stored anywhere: access tokens, PR bodies or diffs, task prompts, task
titles/descriptions, and session transcripts.

### `updated_at` is the correctness contract

A cached record is reused **only** when the entity's `updated_at`, parsed and canonicalized, matches
the authoritative listing exactly. Anything that changes a PR or a task moves that timestamp, so a
reused record cannot be showing a superseded state. An entity whose `updated_at` is missing or
unparseable is treated as **uncacheable**: it is counted in the current pass but never enters the
cache, so it is recomputed every time rather than reused on a timestamp that cannot be verified.

The cloud-agent task key includes the repository, so a task that moves repositories (or that only
gets attributed once a bare `repository.id` resolves) lands on a different key — its old aggregate
can never be folded into the wrong repository's row.

If billable cloud-agent session data could ever change *without* moving `updated_at`, exact cache
freshness would be impossible. The unit tests in `test/unit/agentSessionsService.test.ts` pin this
contract; treat a failure there as a signal that the assumption no longer holds, not as a flaky test.

## Scope: one identity's data never serves another's

Cache filenames carry a scope segment built from three things
(`buildGitHubActivityScope`):

1. the VS Code mode (`dev` / `prod`, from the cache manager);
2. the normalized GitHub host — `github.com` and a configured `github-enterprise.uri` host are
   different scopes;
3. a **non-reversible SHA-256 hash** of the authenticated account label, truncated to 16 hex
   characters. The login itself is never written to disk or into a filename.

An Enterprise host slug carries a short hash of the exact host alongside the readable part, because
slugging alone is lossy: `ghe.internal.example` and `ghe-internal.example` would otherwise share a
scope, and one host's private snapshots could be served for the other.

So `repoprs_prod.github-com.1a2b3c4d5e6f7a8b.snapshot.json`. Signing out, switching accounts or
repointing the Enterprise host lands on a different file rather than re-serving the previous
identity's private data. Access tokens are never part of the scope and are never stored.

## Retention, bounds and eviction

The caches are local-only conveniences that are always allowed to lose data — an evicted record is
simply refetched. They are bounded three ways:

- **Window pruning.** Only entities in the current 30-day window's listing are kept, after a
  successful reconciliation (see below).
- **Record and byte budgets.** `REPO_PR_RECORD_BUDGET` and `AGENT_TASK_RECORD_BUDGET` cap how many
  records and roughly how many bytes each cache stores. The least recently updated (PRs) or least
  recently seen (tasks) records go first.
- **Inactive-scope-first eviction.** On activation, cache files belonging to accounts/hosts this
  install is not currently signed in as are dropped before anything in the active scope is.

Eviction only ever causes a safe refetch. It can never make an incomplete result look complete,
because the totals on screen are built from the current listing, not from whatever survived
eviction.

## Refresh: hourly TTL, one window, plus a manual refresh

- Each cache is revalidated **at most once an hour**
  (`REPO_PRS_REFRESH_INTERVAL_MS` / `AGENT_TASKS_REFRESH_INTERVAL_MS`), by whichever VS Code window
  wins that cache's file lock. Other windows read the snapshot that window wrote. A heartbeat keeps
  the lock alive so a slow API pass is never mistaken for a stale lock.
- Opening a tab serves the cached snapshot immediately (stale-while-revalidate) and then asks for a
  refresh, which only happens if the snapshot is actually due.
- The freshness banner on both tabs offers **Refresh now** — including on the error state, which is
  exactly when a retry is wanted. It bypasses the hourly TTL but still respects the cross-window
  lock and a short cooldown (`GITHUB_ACTIVITY_MANUAL_REFRESH_COOLDOWN_MS`), so repeated clicking
  cannot spend the rate limit. The cooldown is enforced twice: per window in memory, and — once the
  lock is held — against the snapshot's own `fetchedAt`, which is what makes it reach across
  windows that cannot see each other's clicks.

A refresh is incremental: the authoritative listing still runs (it is the only way to discover new,
changed, removed, archived and moved entities), but per-entity work is only redone for entities that
are new, changed, uncacheable, or whose previous detail fetch failed. For the Cloud Agent tab that
is the expensive half — the detail budget is now spent on recently invalidated work instead of on
everything.

## Partial results are never silently presented as totals

Reconciliation may delete a cached record **only after a listing that is known to have enumerated
fully**. A page cap, a timeout or an error is not authoritative: the record is retained, and the
result is marked partial.

| Situation | Effect |
|---|---|
| Listing completed | Records not in the listing are removed; totals are complete |
| Listing hit its page cap (5 pages) | Records retained for the cache; repo/tab marked partial (lower bound) |
| Listing errored or timed out | Pages collected before the failure are still counted; records retained; per-repo error shown; tab marked partial |
| Cloud-agent detail budget exhausted | Undetailed tasks stay "owed"; tab marked partial |
| Cloud-agent detail call failed | No aggregate stored for that task — a failure is never remembered as zero usage; the task's row and the tab are marked partial; retried next pass, with its consecutive-failure count |
| Both listings disagree about a task's repository | The repo-scoped listing wins the row attribution, but the task is treated as uncacheable for that pass — a stale aggregate can never land on the wrong repository |

**Retained records are cached, not counted.** A record kept only because the listing was incomplete
stays in the cache so the next pass can reuse it, but it is deliberately left out of the numbers on
screen: it might name a PR that has since been deleted, and counting it would turn the advertised
lower bound into a possible overcount. A retained record whose PR has aged out of the 30-day window
is dropped outright rather than carried forward.

The banner states which of these applies: *not fetched yet*, *updated N ago / next refresh at …*,
*revalidating* (TTL passed, showing the cached snapshot), and an explicit **partial data — the
figures below are a lower bound** line with the reason.

## Clearing and sign-out

- **Clear Cache** (`aiEngineeringFluency.clearCache`) removes every scope's Repository PRs and Cloud
  Agent cache files, the in-memory snapshots and the freshness state. It never signs the user out.
- **Sign out from GitHub** additionally purges the signing-out identity's scope specifically, so
  nothing can serve that account's data afterwards.

Both also drop this window's in-memory snapshots *and* the retained webview-replay messages, so
recreating the Usage Analysis panel cannot repopulate it from data that was just discarded. The
cleanup covers the `*.snapshot.json.<pid>.tmp` files an interrupted atomic write can leave behind,
which hold a complete envelope.

Neither touches the session-parsing caches' lock files or another window's coordination state. One
known limit: a *different* VS Code window that already holds an in-memory snapshot keeps showing it
until its next revalidation notices the file is gone — the stale display is transient, but it is not
invalidated across windows synchronously.

### Identity changes mid-flight

The in-memory snapshots are tagged with the scope they were collected under. Switching account or
Enterprise host discards them rather than publishing the previous identity's repository names and
counts to the new session. A collection pass that spans a sign-out, a switch or a Clear Cache has
its result discarded instead of written — otherwise it would recreate a deliberately deleted file
under an identity that is no longer signed in.

## Migration

The Cloud Agent cache schema went from **v2 to v3** when per-task records were added. A v2 snapshot
held aggregate totals only, and per-task records cannot be recovered from an aggregate — attributing
it back to individual tasks would be invention, not migration. A v2 file is therefore ignored and
rebuilt by the next background refresh, exactly as a first-ever run does: one full (already
budgeted) pass, then incremental passes afterwards.

The Repository PRs cache did **not** need a version bump: its rendered payload is unchanged and the
per-PR records are purely additive, so a snapshot *at the new path* keeps rendering while it has no
records and simply gains them on the next revalidation.

Both caches do, however, get a **one-time invalidation from the scoping change itself**. Snapshots
written before this change live at the unscoped `repoprs_prod.snapshot.json` /
`agenttasks_prod.snapshot.json`; the new path carries the account and host, so the legacy file is
never read. That is deliberate — an unscoped file cannot be shown to belong to the account now
signed in, and serving it would be exactly the cross-identity leak the scoping exists to prevent.
The cost is one refetch per install; the legacy files are then reclaimed by inactive-scope eviction.

Note that the two GitHub-activity **locks** are scoped the same way as the snapshots they protect.
A mode-only lock would let a window signed in as one account block a window signed in as another
from refreshing its own, independent snapshot.

## Related

- [CLOUD-AGENT-COST.md](CLOUD-AGENT-COST.md) — what the Cloud Agent tab measures and where the
  numbers come from.
- [../VALIDATION.md](../VALIDATION.md) — the checks to run after touching this code.
