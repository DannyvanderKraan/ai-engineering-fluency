import { Hono, type Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { getUserById } from '../db.js';
import {
	deleteCoachingSession,
	getCoachingProposals,
	getCoachingSessions,
} from '../coaching.js';
import { COOKIE_NAME, decodeSession } from '../session.js';
import type { CoachingRecommendation, CoachingSessionSummary } from '../coaching.js';

export const coachingPage = new Hono();

coachingPage.use('*', async (c, next) => {
	c.header('Cache-Control', 'private, no-store');
	await next();
});

coachingPage.get('/coaching', (c) => {
	const user = getSessionUser(c);
	if (!user) return c.redirect('/dashboard');
	const sessions = getCoachingSessions(user.id);
	const proposalsBySession = new Map<string, Array<{
		version: number;
		createdAt: string;
		recommendations: CoachingRecommendation[];
	}>>();
	for (const session of sessions) {
		const proposals = getCoachingProposals(user.id, session.sessionId);
		if (proposals) proposalsBySession.set(session.sessionId, proposals);
	}
	return c.html(renderCoachingPage(user.github_name ?? user.github_login, sessions, proposalsBySession));
});

coachingPage.post('/coaching/sessions/:sessionId/delete', (c) => {
	const user = getSessionUser(c);
	if (!user) return c.redirect('/dashboard');
	if (!isSameOriginPost(c.req.raw)) return c.text('Forbidden', 403);
	const sessionId = c.req.param('sessionId');
	deleteCoachingSession(user.id, sessionId);
	return c.redirect('/coaching?deleted=1', 303);
});

function getSessionUser(c: Context) {
	const value = getCookie(c, COOKIE_NAME);
	const claims = value ? decodeSession(value) : null;
	return claims ? getUserById(claims.sub) : undefined;
}

function isSameOriginPost(request: Request): boolean {
	const origin = request.headers.get('origin');
	const host = request.headers.get('host');
	if (!origin || !host) return false;
	try {
		const originUrl = new URL(origin);
		if (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') return false;
		const configuredOrigin = process.env.BASE_URL;
		const expectedOrigin = configuredOrigin
			? new URL(configuredOrigin).origin
			: new URL(request.url).origin;
		return originUrl.origin === expectedOrigin && originUrl.host.toLowerCase() === host.toLowerCase();
	} catch {
		return false;
	}
}

function escapeHtml(value: unknown): string {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function recommendationHtml(item: CoachingRecommendation): string {
	return `<article class="recommendation">
<h3>${escapeHtml(item.title)}</h3>
<p><strong>Try:</strong> ${escapeHtml(item.recommendation)}</p>
<p><strong>Why:</strong> ${escapeHtml(item.rationale)}</p>
<blockquote><strong>Evidence:</strong> “${escapeHtml(item.evidence)}”</blockquote>
</article>`;
}

function statusLabel(session: CoachingSessionSummary): string {
	if (session.analysisStatus === 'failed') {
		return `Analysis failed (${escapeHtml(session.errorCode ?? 'unknown_error')}). Your transcript remains private; upload a new snapshot or delete this session and upload it again to retry.`;
	}
	if (session.analysisStatus === 'not_configured') {
		return 'Analysis is not configured on this server. Your transcript has not been sent to a model provider.';
	}
	if (session.analysisStatus === 'queued' || session.analysisStatus === 'processing') {
		return 'Analysis is in progress.';
	}
	return 'Analysis complete.';
}

function renderSession(
	session: CoachingSessionSummary,
	proposals: Array<{ version: number; createdAt: string; recommendations: CoachingRecommendation[] }>,
): string {
	const proposalHtml = proposals.map((proposal) => `<section class="proposal">
<h3>Snapshot version ${proposal.version} recommendations</h3>
<p class="muted">Generated ${escapeHtml(proposal.createdAt)}</p>
${proposal.recommendations.map(recommendationHtml).join('')}
</section>`).join('');
	return `<section class="session">
<div class="session-heading"><div>
<h2>Session ${escapeHtml(session.sessionId)}</h2>
<p class="muted">Snapshot version ${session.version} · SHA-256 <code>${escapeHtml(session.contentHash)}</code></p>
<p class="status">${statusLabel(session)}</p>
<p class="muted">${session.contentRetained
		? `Raw transcript retained until ${escapeHtml(session.contentRetainedUntil)} (30 days after upload).`
		: 'Raw transcript has expired and was deleted. Proposals remain until you delete this session.'}</p>
</div>
<form method="post" action="/coaching/sessions/${encodeURIComponent(session.sessionId)}/delete">
<button type="submit">Delete session and proposals</button>
</form></div>
${proposalHtml || '<p class="muted">No coaching proposals are available for this session yet.</p>'}
</section>`;
}

function renderCoachingPage(
	displayName: string,
	sessions: CoachingSessionSummary[],
	proposals: Map<string, Array<{ version: number; createdAt: string; recommendations: CoachingRecommendation[] }>>,
): string {
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Private session coaching</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;max-width:960px;margin:0 auto;padding:24px;background:#0d1117;color:#e6edf3}
a{color:#58a6ff}.muted{color:#8b949e;font-size:.9rem}.session{border:1px solid #30363d;border-radius:8px;padding:20px;margin:20px 0}
.session-heading{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.recommendation{border-left:3px solid #58a6ff;padding:2px 16px;margin:16px 0}
blockquote{margin:8px 0;padding:8px 12px;border-left:2px solid #484f58;color:#c9d1d9}code{overflow-wrap:anywhere}
button{background:#da3633;color:white;border:0;border-radius:5px;padding:9px 12px;cursor:pointer}
@media(max-width:600px){body{padding:14px}.session-heading{display:block}.session-heading form{margin-top:16px}}
</style></head><body>
<header><p><a href="/dashboard">My Dashboard</a> · <a href="/team">Team Insights</a> · <a href="/auth/logout">Sign out</a></p>
<h1>Private session coaching</h1><p>Signed in as ${escapeHtml(displayName)}. Full transcripts and recommendations are visible only to you; they are never included in team or administrator views.</p></header>
<aside><strong>Privacy and retention:</strong> raw session transcripts are kept for up to 30 days. If this server is configured with a SQLite backing-file backup, expired transcript bytes can remain in that backup until its rotation or deletion; database-level expiry cannot erase historical backup copies. Coaching proposals remain until you delete the session. When no model provider is configured, transcripts are not sent anywhere and analysis is unavailable.</aside>
<main>${sessions.length
		? sessions.map((session) => renderSession(session, proposals.get(session.sessionId) ?? [])).join('')
		: '<p>No private session snapshots have been uploaded.</p>'}</main>
</body></html>`;
}
