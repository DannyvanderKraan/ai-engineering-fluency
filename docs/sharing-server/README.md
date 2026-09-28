# Self-Hosted Sharing Server

> **Opt-in & self-hosted** — This feature is entirely optional. Nothing is shared unless
> you deploy your own server and explicitly enable the setting in VS Code. Full-session
> transcripts are sent to an analysis provider only after the user opts in and the server
> operator configures that provider; without those settings they remain on your server.

The sharing server lets you aggregate Copilot token usage across a team on infrastructure
you own. It is a lightweight Node.js API backed by SQLite — run it with Docker on any
machine, point your team's VS Code extensions at it, and get a shared dashboard without
needing an Azure account.

For server coding, testing or customization, follow the
[authoritative data separation contract](../../sharing-server/AGENTS.md).

## What it does

```
┌──────────────────┐         ┌──────────────────┐         ┌────────────────┐
│  VS Code / CLI   │──POST──▶│  Sharing Server   │──read──▶│  Web Dashboard │
│  (auto-uploads)  │ Bearer  │  (your infra)     │ SQLite  │  (GitHub login)│
└──────────────────┘ token   └──────────────────┘         └────────────────┘
```

1. **Upload** — The VS Code extension already holds a GitHub OAuth token (the same one
   used by Copilot). When you enable the sharing server setting, the extension
   automatically uploads daily usage rollups to your server. No new login, no API keys.
2. **Store** — The server validates the GitHub token, identifies the user, and upserts
   the rollup into a local SQLite database.
3. **View** — Team members sign in to the web dashboard with GitHub OAuth and see their
   own usage — input/output tokens, interactions, days active, editor breakdown, and
   usage trends over time.
4. **Compare** — Open **Team Insights** at `/team` to compare your usage with anonymous
   active uploaders without exposing their identities or uploaded detail.
5. **Private coaching (optional)** — A client that separately opts in can send an
   individual full-session transcript to the owner-only coaching API. This data is
   isolated from rollups and team/admin views; it is never sent to an analysis provider
   unless the server operator configures one.

## Dashboard preview

![Sharing server dashboard](../../sharing-server/images/Sharing-server-overview.png)

The web dashboard shows per-user usage summaries with time-range filters (Today /
Last 7 Days / Last 30 Days), an editor breakdown chart, and a token usage trend graph
grouped by editor or model.

## Team Insights

The cookie-authenticated `/team` page offers 7-, 30- and 90-day windows, each
covering exactly N UTC dates including today and excluding future dates.
It shows exact anonymous active-member token/interaction totals, activity-day
counts and a self marker, together with your rank, share of team tokens,
percentile and **Light / Medium / Heavy / Very heavy** relative usage cohort.
Only positive tokens or interactions make a member active; inactive viewers
have no comparison. Trends show the team aggregate and your own usage, never
individual peers' daily series.

Period links (`/team?days=N`) work without JavaScript. The page includes cohort
counts/thresholds and an exact numeric member table, plus expandable daily
team/own totals. The aggregate chart can show team totals or the average per
daily active uploader alongside your own line. CSV and JSON downloads at
`/team/export?days=N&format=csv|json` (choose one format) require the same session
cookie and reuse the safe projection; they cannot reveal additional peer detail.

Cohorts use interpolated p25/p50/p75 of active members' total input + output tokens
with `<=` boundaries. Ties share rank/cohort; percentile is the percentage of
other active uploaders strictly below you, and is undefined without peers.
See the [comparison definitions](../../sharing-server/AGENTS.md#period-and-comparison-semantics)
and [API reference](../../sharing-server/README.md#team-insights) for
`GET /api/team-insights?days=7|30|90` (choose one value; bearer authentication).

**Anonymous labels are not guaranteed anonymity.** Direct identifiers are removed,
but exact totals and small-team comparisons can still re-identify members.
There is no minimum count or suppression. Named admin detail remains on separate
server-authorized admin routes, and personal uploaded rows remain owner-only.
Even admins viewing Team Insights receive the same identity-free projection.

---

## Setup guide

### Prerequisites

- Docker (or Node.js ≥ 22.5 if running without Docker)
- A [GitHub OAuth App](https://github.com/settings/developers) — needed for the web
  dashboard login

### 1. Create a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Application name**: `AI Engineering Fluency` (or any name you like)
   - **Homepage URL**: `https://your-server.example.com`
   - **Authorization callback URL**: `https://your-server.example.com/auth/github/callback`
3. Copy the **Client ID** and generate a **Client Secret**

### 2. Deploy with Docker Compose

Create a `docker-compose.yml`:

```yaml
services:
  sharing-server:
    image: ghcr.io/rajbos/copilot-sharing-server:latest
    ports:
      - "3000:3000"
    environment:
      - GITHUB_CLIENT_ID=your_client_id
      - GITHUB_CLIENT_SECRET=your_client_secret
      - SESSION_SECRET=a_long_random_string_min_32_chars
      - BASE_URL=https://your-server.example.com
      # Optional: restrict to members of a specific GitHub org
      # - ALLOWED_GITHUB_ORG=your-org-name
    volumes:
      - sharing_data:/data
    restart: unless-stopped

volumes:
  sharing_data:
```

> **Tip**: Generate `SESSION_SECRET` with `openssl rand -hex 32`.

Start the server:

```bash
docker compose up -d
```

Verify it's running:

```bash
curl https://your-server.example.com/health
# → {"status":"ok","timestamp":"..."}
```

### 3. Configure the VS Code extension

Add these settings in VS Code (JSON):

```json
{
  "aiEngineeringFluency.backend.sharingServer.enabled": true,
  "aiEngineeringFluency.backend.sharingServer.endpointUrl": "https://your-server.example.com"
}
```

Or search for **AI Engineering Fluency: Sharing Server** in the Settings UI.

That's it. The extension starts uploading daily rollups automatically — no extra
authentication prompt, no API keys. It reuses your existing GitHub session from VS Code.

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_CLIENT_ID` | ✅ | — | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | — | GitHub OAuth App client secret |
| `SESSION_SECRET` | ✅ | — | Random secret for signing session cookies (≥ 32 chars) |
| `BASE_URL` | ✅ | — | Public URL of the server (no trailing slash) |
| `PORT` | ❌ | `3000` | HTTP listen port |
| `DB_PATH` | ❌ | `/data/sharing.db` | SQLite database file path |
| `ALLOWED_GITHUB_ORG` | ❌ | *(any user)* | Restrict uploads and dashboard to members of this GitHub org |
| `COACHING_MODEL_ENDPOINT` | ❌ | — | Full HTTPS OpenAI-compatible chat-completions URL; HTTP is allowed only for localhost/loopback (`127.0.0.0/8`, `::1`). Required with the API key and model before any transcript is sent to a provider. |
| `COACHING_MODEL_API_KEY` | ❌ | — | Server-only provider key; never returned or logged |
| `COACHING_MODEL_NAME` | ❌ | — | Provider model identifier |
| `COACHING_UPLOAD_RATE_MAX` | ❌ | `100` | Full-session POSTs allowed per user per one-hour window (range `1`–`1000`); the extension sends one snapshot per request. |

---

## How authentication works

The sharing server does **not** issue its own API keys.

- **Data uploads** (from the VS Code extension) use a **Bearer token** — the same
  GitHub OAuth token already held by VS Code. The server validates it by calling
  `GET https://api.github.com/user` and caches the result for 10 minutes.
- **Web dashboard** login uses a standard **GitHub OAuth flow** (the OAuth App you
  created in step 1). Users sign in via the browser and receive a signed session cookie.

If `ALLOWED_GITHUB_ORG` is set, both uploads and dashboard access are restricted to
members of that GitHub organization.

---

## Privacy & data

- **Opt-in only** — No data is uploaded unless you explicitly enable the setting and
  provide a server URL.
- **Self-hosted** — The server runs on your infrastructure. Data stays there except for
  GitHub authentication calls and, only when explicitly configured, full-session
  transcript analysis sent to your selected model provider.
- **Identified storage** — Every upload is linked to a GitHub user ID; uploads are
  not anonymous or pseudonymous (unlike the Azure Storage backend). Team Insights
  removes direct peer identifiers at the server response boundary; see the
  [data separation contract](../../sharing-server/AGENTS.md#team-projection)
  for the allowlist and residual re-identification risk.
- **Workspace/machine names** — Included or excluded based on the extension's
  `shareWorkspaceMachineNames` setting (off by default).
- **Rollups only** — The extension sends daily aggregates (tokens, interactions, model
  names), not raw prompts or completions.
- **Separate full-session coaching opt-in** — The private coaching API accepts a raw
  transcript only from a client that explicitly calls it. Full transcripts are stored
  in separate SQLite tables and never appear in rollups, Team Insights, team exports
  or admin dashboards. The server keeps raw snapshots for 30 days and keeps proposals
  until the owner deletes them. Without all three `COACHING_MODEL_*` settings, content
  is not sent to a provider. When configured, analysis is asynchronous, tool-free and
  treats the transcript as untrusted input; returned recommendations must cite verbatim
  evidence from it. Replacing a session snapshot immediately deletes prior raw
  content but preserves proposals from earlier versions; stale in-flight analysis
  cannot recreate proposals for a replaced snapshot.
- **Deletion and backup caveat** — The live SQLite database enables `secure_delete`;
  after coaching-row deletion, the server attempts a passive WAL checkpoint and a
  non-waiting WAL truncation when safe, reducing residual transcript bytes without
  waiting on readers. If a reader prevents it, bytes may remain in the WAL until a
  later checkpoint or database close. This is not a forensic media-erase guarantee.
  Expiring/deleting rows also cannot erase old database backups: if a backing-store
  copy is enabled, transcript bytes can remain there until the operator rotates or
  deletes those copies.
- **Editor attribution** — Each rollup includes the session's editor label. This preserves
  session-specific sources such as `Copilot CLI (App)` separately from terminal
  `Copilot CLI` usage in the personal dashboard. Peer model/editor labels are
  not included in Team Insights.

### Private full-session coaching API

The coaching API uses the same bearer token as daily uploads and keeps ownership
strictly tied to the authenticated server user. `POST /api/coaching/sessions`
accepts only `{ schemaVersion: 1, sessionId, contentHash, content }`, where
`contentHash` is the SHA-256 hex digest of the UTF-8 transcript string. The server
rejects unknown fields, mismatched hashes and content over 2,000,000 UTF-8 bytes.
An unchanged current hash is idempotent; changed content creates the next monotonic
server-side `version`.

The extension's compact route contract is `POST /api/sessions` with
`{ sessionId, format, content, contentHash, sourceUpdatedAt }`; `sessionId` is a
64-character SHA-256 source-path hash, `format` is `json`, `jsonl`, `opencode`,
`crush`, `kilo`, `hermes`, `devin-cli` or `copilot-cli-store`, and `sourceUpdatedAt`
is a canonical UTC ISO timestamp. Transcript content is bounded at 2,000,000 UTF-8
bytes. The declared format is retained and passed to analysis as untrusted metadata;
the server does not parse or rewrite the format-specific payload. The
`copilot-cli-store` export contains the stored session metadata and turns;
original tool events or context absent from that database cannot be recovered.
Oversized sessions are skipped rather than truncated and count as upload failures.
It returns `{ ok: true, sessionId, contentHash, version, analysisStatus, ... }`.
The matching status/proposal routes are `/api/sessions/{sessionId}` and
`/api/sessions/{sessionId}/proposals`; `GET /api/sessions/status` returns
owner-only counts; `DELETE /api/sessions` removes all private coaching data owned
by the authenticated user. The equivalent explicit schema endpoint is
`POST /api/coaching/sessions` with `schemaVersion: 1`.

Each POST, including an unchanged retry, counts toward the configurable per-user
one-hour limit (`COACHING_UPLOAD_RATE_MAX`, default 100, allowed 1–1000). The
window starts with the first accepted upload; requests over the limit receive
HTTP 429 with a `Retry-After` header. The default rate allows up to 100 backfill
POSTs per user in one window, while the separate storage cap allows at most 100
distinct retained sessions per user. Retries or changed snapshots also count as
POSTs; pace requests over the limit across windows or temporarily raise the
setting (up to 1000). Deleting sessions frees distinct-session slots. The rate
counter is process-local, so multi-instance operators need a shared edge limit
for an aggregate per-user cap.

If the provider endpoint, key, or model is missing/invalid, accepted snapshots
return `analysisStatus: "not_configured"` and remain stored without being sent to
any provider or queued for future analysis. This explicit state is visible in
the upload response, status API, and `/coaching`; a new snapshot after provider
configuration is required to request analysis.
Provider endpoints must use HTTPS; HTTP is accepted only for `localhost`,
IPv4 loopback (`127.0.0.0/8`) or IPv6 loopback (`::1`). Insecure remote HTTP,
non-HTTP schemes, and endpoints embedding URL credentials are rejected as
unconfigured, so the server will not send transcript content or the provider
API key to them.
Analysis responses are bounded to 64 KB. Recommendations should be sufficiently
detailed to explain actionable next steps, why they matter and how to verify the
result, with field limits of 160 characters for title, 4,000 for recommendation,
3,000 for rationale and 1,000 for verbatim evidence.

Bearer routes are `GET /api/coaching/sessions`,
`GET /api/coaching/sessions/{sessionId}`,
`GET /api/coaching/sessions/{sessionId}/proposals` and
`DELETE /api/coaching/sessions/{sessionId}`. The private cookie-authenticated
`/coaching` page shows the same owner's status and proposals and supports same-origin
deletion. Uploads follow the configurable per-hour limit above and are capped at
100 distinct retained sessions per user. The analysis queue is bounded at 100 jobs
globally, 3 per user and 2 concurrent provider calls, with at most 3 attempts per job.
Provider settings must all be configured (`COACHING_MODEL_ENDPOINT`,
`COACHING_MODEL_API_KEY`, `COACHING_MODEL_NAME`) before any transcript is sent;
otherwise the status is `not_configured`.

Raw transcripts expire after 30 days, while proposals persist until owner deletion.
The live SQLite database enables secure deletion and non-blocking WAL cleanup after
coaching-row deletion; a busy reader can defer WAL truncation. Neither mechanism
erases historical SQLite backing-store backups, which can retain transcript bytes
until those copies are rotated or deleted. See the complete endpoint and response contract in
the [server README](../../sharing-server/README.md#private-full-session-coaching).

---

## Backup

The entire server state lives in a single SQLite file (`/data/sharing.db` by default).
Back it up with any file copy tool or:

```bash
sqlite3 /data/sharing.db .dump > backup.sql
```

---

## Running without Docker

See the [sharing server README](../../sharing-server/README.md) for instructions on
building from source and running locally with Node.js.

For changes, use the [server validation guidance](../VALIDATION.md#sharing-server)
and the [required privacy regression tests](../../sharing-server/AGENTS.md#required-validation).
Downstream route overrides and exports must preserve the same contract.
