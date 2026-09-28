import { Hono } from 'hono';
import {
	checkCoachingUploadRateLimit,
	getCoachingUploadRateLimitRetryAfterSeconds,
	requireBearerAuth,
	type AuthVariables,
} from '../auth.js';
import {
	CoachingUploadError,
	createCoachingSnapshot,
	deleteAllCoachingSessions,
	deleteCoachingSession,
	getCoachingProposals,
	getCoachingProviderConfigured,
	getCoachingSession,
	getCoachingSessions,
	getCoachingStatusCounts,
	isValidCoachingSessionId,
	readBoundedJsonBody,
	validateCoachingUpload,
	wakeCoachingWorker,
} from '../coaching.js';
import {
	MAX_COACHING_PENDING_JOBS,
	MAX_COACHING_PENDING_JOBS_PER_USER,
	COACHING_UPLOAD_RATE_MAX,
} from '../config.js';

export const coachingApi = new Hono<{ Variables: AuthVariables }>();

coachingApi.use('*', async (c, next) => {
	c.header('Cache-Control', 'private, no-store');
	await next();
});

coachingApi.get('/sessions', requireBearerAuth, (c) => {
	return c.json({ sessions: getCoachingSessions(c.get('user').id) });
});

coachingApi.get('/sessions/status', requireBearerAuth, (c) => {
	return c.json({ ok: true, ...getCoachingStatusCounts(c.get('user').id) });
});

coachingApi.post('/sessions', requireBearerAuth, async (c) => {
	const user = c.get('user');
	const body = await readBoundedJsonBody(c.req.raw);
	if (body.error === 'too_large') return c.json({ error: 'Request body exceeds the 2 MB session limit.' }, 413);
	if (body.error || body.value === undefined) return c.json({ error: 'Invalid JSON body.' }, 400);

	const validated = validateCoachingUpload(body.value);
	if (typeof validated === 'string') return c.json({ error: validated }, 400);
	if (!checkCoachingUploadRateLimit(user.id)) {
		c.header('Retry-After', String(getCoachingUploadRateLimitRetryAfterSeconds(user.id)));
		return c.json({
			error: `Rate limit exceeded — max ${COACHING_UPLOAD_RATE_MAX} coaching uploads per hour.`,
			code: 'coaching_upload_rate_limit',
		}, 429);
	}

	const providerConfigured = getCoachingProviderConfigured();
	try {
		const created = createCoachingSnapshot(
			user.id,
			validated.sessionId,
			validated.contentHash,
			validated.format,
			validated.content,
			providerConfigured,
		);
		if (created.session.analysisStatus === 'queued') wakeCoachingWorker();
		return c.json({
			ok: true,
			sessionId: created.session.sessionId,
			contentHash: created.session.contentHash,
			version: created.session.version,
			analysisStatus: created.session.analysisStatus,
			unchanged: created.unchanged,
			contentRetainedUntil: created.session.contentRetainedUntil,
		}, created.unchanged ? 200 : 202);
	} catch (error) {
		if (error instanceof CoachingUploadError) {
			const message = error.code === 'analysis_queue_full'
				? `Analysis queue is full (max ${MAX_COACHING_PENDING_JOBS} jobs server-wide and ${MAX_COACHING_PENDING_JOBS_PER_USER} per user).`
				: 'Maximum number of coaching sessions reached.';
			return c.json({ error: message, code: error.code }, error.status);
		}
		throw error;
	}
});

coachingApi.delete('/sessions', requireBearerAuth, (c) => {
	const deletedSessions = deleteAllCoachingSessions(c.get('user').id);
	return c.json({ ok: true, deletedSessions });
});

coachingApi.get('/sessions/:sessionId', requireBearerAuth, (c) => {
	const sessionId = c.req.param('sessionId');
	if (!isValidCoachingSessionId(sessionId)) return c.json({ error: 'Not found' }, 404);
	const session = getCoachingSession(c.get('user').id, sessionId);
	if (!session) return c.json({ error: 'Not found' }, 404);
	return c.json(session);
});

coachingApi.get('/sessions/:sessionId/proposals', requireBearerAuth, (c) => {
	const sessionId = c.req.param('sessionId');
	if (!isValidCoachingSessionId(sessionId)) return c.json({ error: 'Not found' }, 404);
	const proposals = getCoachingProposals(c.get('user').id, sessionId);
	if (proposals === undefined) return c.json({ error: 'Not found' }, 404);
	return c.json({ sessionId, proposals });
});

coachingApi.delete('/sessions/:sessionId', requireBearerAuth, (c) => {
	const sessionId = c.req.param('sessionId');
	if (!isValidCoachingSessionId(sessionId) || !deleteCoachingSession(c.get('user').id, sessionId)) {
		return c.json({ error: 'Not found' }, 404);
	}
	return c.json({ deleted: true });
});
