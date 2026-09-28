import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createApp } from '../app.js';
import { closeDb, getDb, upsertUser, type UserRow } from '../db.js';
import { getDatabasePath } from '../config/databaseConfig.js';
import { COOKIE_NAME, encodeSession, makeClaims } from '../session.js';
import {
	getCoachingProviderConfigured,
	hashCoachingContent,
	validateCoachingUpload,
} from '../coaching.js';
import {
	DEFAULT_COACHING_UPLOAD_RATE_MAX,
	MAX_COACHING_UPLOAD_RATE_MAX,
	MAX_COACHING_SESSIONS_PER_USER,
	parseCoachingUploadRateMax,
} from '../config.js';

const app = createApp();
const retainedSentinel = 'FULL_TRANSCRIPT_SECRET_SENTINEL';
const evidence = '{"role":"assistant","content":"The test suite failed twice before I fixed the retry condition."}';
const transcript = `${evidence}\n{"role":"user","content":"${retainedSentinel}"}`;
const detailedRecommendation = `Start by adding a regression test around the retry boundary. ${'Then verify the expected state transition and error handling. '.repeat(20)}`.trim();
const detailedRationale = `The observed failure indicates that retries may exceed the intended boundary. ${'A focused check will distinguish the successful path from repeated failure. '.repeat(18)}`.trim();
const providerSessionId = createHash('sha256').update('provider-session-path').digest('hex');
const previous = {
	localDataDir: process.env.LOCAL_DATA_DIR,
	endpoint: process.env.COACHING_MODEL_ENDPOINT,
	apiKey: process.env.COACHING_MODEL_API_KEY,
	model: process.env.COACHING_MODEL_NAME,
	fetch: globalThis.fetch,
};
let tempDir: string;
let owner: UserRow;
let peer: UserRow;
let admin: UserRow;
let providerFailuresRemaining = 0;
let delayNextProviderRequest: { started: () => void; wait: Promise<void> } | undefined;
const capturedProviderBodies: Array<Record<string, unknown>> = [];

function bearer(user: UserRow): string {
	return user.github_id === owner.github_id ? 'coaching-owner-token'
		: user.github_id === peer.github_id ? 'coaching-peer-token' : 'coaching-admin-token';
}

async function apiRequest(
	path: string,
	user: UserRow = owner,
	options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<Response> {
	const headers = new Headers(options.headers);
	headers.set('Authorization', `Bearer ${bearer(user)}`);
	if (options.body !== undefined) headers.set('Content-Type', 'application/json');
	return app.request(path, {
		method: options.method ?? 'GET',
		headers,
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
	});
}

function uploadBody(content = transcript, sessionId = 'private-session-1') {
	return {
		schemaVersion: 1,
		sessionId,
		content,
		contentHash: hashCoachingContent(content),
	};
}

async function waitForStatus(sessionId: string, status: string, user: UserRow = owner): Promise<Record<string, unknown>> {
	const deadline = Date.now() + 5_000;
	while (Date.now() < deadline) {
		const response = await apiRequest(`/api/coaching/sessions/${sessionId}`, user);
		assert.equal(response.status, 200);
		const value = await response.json() as Record<string, unknown>;
		if (value.analysisStatus === status) return value;
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	throw new Error(`Coaching analysis did not reach ${status}.`);
}

function sessionCookie(user: UserRow): string {
	return `${COOKIE_NAME}=${encodeSession(makeClaims(user.id))}`;
}

before(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'sharing-coaching-'));
	process.env.LOCAL_DATA_DIR = tempDir;
	delete process.env.COACHING_MODEL_ENDPOINT;
	delete process.env.COACHING_MODEL_API_KEY;
	delete process.env.COACHING_MODEL_NAME;

	owner = upsertUser(981001, 'coaching-owner', 'Owner Private Name', null);
	peer = upsertUser(981002, 'coaching-peer', 'Peer Private Name', null);
	admin = upsertUser(981003, 'coaching-admin', 'Admin Private Name', null);
	getDb().prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(admin.id);

	globalThis.fetch = async (input, init) => {
		const url = String(input);
		if (url === 'https://api.github.com/user') {
			const token = new Headers(init?.headers).get('Authorization');
			const identities: Record<string, { id: number; login: string; name: string; avatar_url: string }> = {
				'Bearer coaching-owner-token': { id: owner.github_id, login: owner.github_login, name: owner.github_name!, avatar_url: 'https://example.invalid/owner' },
				'Bearer coaching-peer-token': { id: peer.github_id, login: peer.github_login, name: peer.github_name!, avatar_url: 'https://example.invalid/peer' },
				'Bearer coaching-admin-token': { id: admin.github_id, login: admin.github_login, name: admin.github_name!, avatar_url: 'https://example.invalid/admin' },
			};
			const identity = token ? identities[token] : undefined;
			return new Response(JSON.stringify(identity), { status: identity ? 200 : 401 });
		}
		if (url === 'https://model.example.test/v1/chat/completions') {
			capturedProviderBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
			const delay = delayNextProviderRequest;
			if (delay) {
				delayNextProviderRequest = undefined;
				delay.started();
				await delay.wait;
			}
			if (providerFailuresRemaining > 0) {
				providerFailuresRemaining--;
				return new Response('provider failure containing no application data', { status: 503 });
			}
			return new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							recommendations: [{
								title: '<img src=x onerror=alert(1)>',
								recommendation: detailedRecommendation,
								rationale: detailedRationale,
								evidence,
							}],
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } });
		}
		throw new Error(`Unexpected outbound request to ${url}`);
	};
});

after(() => {
	closeDb();
	globalThis.fetch = previous.fetch;
	for (const [key, value] of Object.entries({
		LOCAL_DATA_DIR: previous.localDataDir,
		COACHING_MODEL_ENDPOINT: previous.endpoint,
		COACHING_MODEL_API_KEY: previous.apiKey,
		COACHING_MODEL_NAME: previous.model,
	})) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	rmSync(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
});

describe('private full-session coaching HTTP contract', () => {
	test('requires bearer auth and returns no-cache owner-scoped endpoints', async () => {
		for (const path of [
			'/api/coaching/sessions',
			'/api/coaching/sessions/private-session-1',
			'/api/coaching/sessions/private-session-1/proposals',
			'/api/sessions',
			'/api/sessions/status',
		]) {
			const response = await app.request(path);
			assert.equal(response.status, 401);
			assert.equal(response.headers.get('cache-control'), 'private, no-store');
		}

		const missingOrigin = await app.request('/api/coaching/sessions/private-session-1', {
			headers: { Authorization: 'Bearer coaching-owner-token' },
		});
		assert.equal(missingOrigin.status, 404);
	});

	test('validates strict versioned payloads, bounds bytes, hashes snapshots and makes retries idempotent', async () => {
		capturedProviderBodies.length = 0;
		const badVersion = await apiRequest('/api/coaching/sessions', owner, { method: 'POST', body: { ...uploadBody(), schemaVersion: 2 } });
		assert.equal(badVersion.status, 400);
		const extraField = await apiRequest('/api/coaching/sessions', owner, { method: 'POST', body: { ...uploadBody(), githubId: peer.github_id } });
		assert.equal(extraField.status, 400);
		const badHash = await apiRequest('/api/coaching/sessions', owner, { method: 'POST', body: { ...uploadBody(), contentHash: '0'.repeat(64) } });
		assert.equal(badHash.status, 400);
		const tooLarge = await app.request('/api/coaching/sessions', {
			method: 'POST',
			headers: { Authorization: 'Bearer coaching-owner-token', 'Content-Type': 'application/json', 'Content-Length': '2100000' },
			body: '{}',
		});
		assert.equal(tooLarge.status, 413);

		const created = await apiRequest('/api/coaching/sessions', owner, { method: 'POST', body: uploadBody() });
		assert.equal(created.status, 202);
		assert.equal(created.headers.get('cache-control'), 'private, no-store');
		const first = await created.json() as Record<string, unknown>;
		assert.equal(first.version, 1);
		assert.equal(first.analysisStatus, 'not_configured');
		assert.equal(first.contentHash, hashCoachingContent(transcript));
		assert.equal(first.unchanged, false);
		assert.equal(capturedProviderBodies.length, 0, 'unconfigured analysis never sends content to a model provider');

		const duplicate = await apiRequest('/api/coaching/sessions', owner, { method: 'POST', body: uploadBody() });
		assert.equal(duplicate.status, 200);
		assert.deepEqual(await duplicate.json(), {
			ok: true,
			sessionId: 'private-session-1',
			contentHash: hashCoachingContent(transcript),
			version: 1,
			analysisStatus: 'not_configured',
			unchanged: true,
			contentRetainedUntil: first.contentRetainedUntil,
		});

		const updatedContent = `${transcript}\n{"role":"assistant","content":"Updated snapshot."}`;
		const updated = await apiRequest('/api/coaching/sessions', owner, {
			method: 'POST', body: uploadBody(updatedContent),
		});
		assert.equal((await updated.json() as Record<string, unknown>).version, 2);
		const list = await apiRequest('/api/coaching/sessions?user_id=' + peer.id, owner);
		assert.equal(list.status, 200);
		assert.deepEqual((await list.json() as { sessions: Array<Record<string, unknown>> }).sessions.map((s) => s.version), [2]);

		const compact = await apiRequest('/api/sessions', owner, {
			method: 'POST',
			body: {
				sessionId: createHash('sha256').update('extension-session-path').digest('hex'),
				format: 'opencode',
				content: transcript,
				contentHash: hashCoachingContent(transcript),
				sourceUpdatedAt: new Date().toISOString(),
			},
		});
		assert.equal(compact.status, 202);
		const compactResponse = await compact.json() as Record<string, unknown>;
		assert.equal(compactResponse.ok, true);
		assert.equal(compactResponse.version, 1);
		assert.equal(compactResponse.analysisStatus, 'not_configured');
		const extensionSessionId = createHash('sha256').update('extension-session-path').digest('hex');
		assert.equal((await apiRequest(`/api/sessions/${extensionSessionId}`, owner)).status, 200);
		const statusResponse = await apiRequest('/api/sessions/status?user_id=' + peer.id, owner);
		assert.equal(statusResponse.status, 200);
		assert.deepEqual(await statusResponse.json(), {
			ok: true,
			sessions: 2,
			retainedTranscripts: 2,
			proposals: 0,
			queued: 0,
			processing: 0,
			complete: 0,
			failed: 0,
			notConfigured: 2,
		});

		for (const invalidPayload of [
			{
				sessionId: 'not-a-path-hash',
				format: 'json',
				content: transcript,
				contentHash: hashCoachingContent(transcript),
				sourceUpdatedAt: new Date().toISOString(),
			},
			{
				sessionId: 'b'.repeat(64),
				format: 'markdown',
				content: transcript,
				contentHash: hashCoachingContent(transcript),
				sourceUpdatedAt: new Date().toISOString(),
			},
			{
				sessionId: 'c'.repeat(64),
				format: 'json',
				content: transcript,
				contentHash: hashCoachingContent(transcript),
				sourceUpdatedAt: '2026-09-28',
			},
		]) {
			const invalid = await apiRequest('/api/sessions', owner, { method: 'POST', body: invalidPayload });
			assert.equal(invalid.status, 400);
		}

		for (const format of ['json', 'jsonl', 'opencode', 'crush', 'kilo', 'hermes', 'devin-cli', 'copilot-cli-store']) {
			const valid = validateCoachingUpload({
				sessionId: createHash('sha256').update(`path-${format}`).digest('hex'),
				format,
				content: transcript,
				contentHash: hashCoachingContent(transcript),
				sourceUpdatedAt: new Date().toISOString(),
			});
			assert.notEqual(typeof valid, 'string', `format ${format} should be accepted`);
		}
	});

	test('limits valid private-session uploads per owner per hour', async () => {
		assert.equal(DEFAULT_COACHING_UPLOAD_RATE_MAX, 100);
		assert.equal(parseCoachingUploadRateMax('250'), 250);
		assert.equal(parseCoachingUploadRateMax(undefined), DEFAULT_COACHING_UPLOAD_RATE_MAX);
		assert.throws(() => parseCoachingUploadRateMax('0'));
		assert.throws(() => parseCoachingUploadRateMax(String(MAX_COACHING_UPLOAD_RATE_MAX + 1)));
		assert.throws(() => parseCoachingUploadRateMax('not-a-number'));
		for (let i = 0; i < DEFAULT_COACHING_UPLOAD_RATE_MAX; i++) {
			const response = await apiRequest('/api/sessions', admin, {
				method: 'POST',
				body: {
					sessionId: createHash('sha256').update(`rate-limit-session-${i}`).digest('hex'),
					format: 'json',
					content: transcript,
					contentHash: hashCoachingContent(transcript),
					sourceUpdatedAt: new Date().toISOString(),
				},
			});
			assert.equal(response.status, 202);
		}
		const limited = await apiRequest('/api/sessions', admin, {
			method: 'POST',
			body: {
				sessionId: createHash('sha256').update('rate-limit-session-overflow').digest('hex'),
				format: 'json',
				content: transcript,
				contentHash: hashCoachingContent(transcript),
				sourceUpdatedAt: new Date().toISOString(),
			},
		});
		assert.equal(limited.status, 429);
		assert.equal((await limited.json() as Record<string, unknown>).code, 'coaching_upload_rate_limit');
		assert.match(limited.headers.get('retry-after') ?? '', /^\d+$/);
	});

	test('configured provider receives untrusted transcript only on the server, validates evidence, and retries async results', async () => {
		process.env.COACHING_MODEL_ENDPOINT = 'https://model.example.test/v1/chat/completions';
		process.env.COACHING_MODEL_API_KEY = 'test-provider-key';
		process.env.COACHING_MODEL_NAME = 'test-coach-model';
		capturedProviderBodies.length = 0;
		providerFailuresRemaining = 1;
		const analysisFormat = 'devin-cli';
		const response = await apiRequest('/api/sessions', peer, {
			method: 'POST',
			body: {
				sessionId: createHash('sha256').update('provider-session-path').digest('hex'),
				format: analysisFormat,
				content: transcript,
				contentHash: hashCoachingContent(transcript),
				sourceUpdatedAt: new Date().toISOString(),
			},
		});
		assert.equal(response.status, 202);
		assert.equal((await response.json() as Record<string, unknown>).analysisStatus, 'queued');
		const completed = await waitForStatus(providerSessionId, 'complete', peer);
		assert.equal(completed.proposalCount, 1);
		assert.equal(capturedProviderBodies.length, 2, 'a transient provider failure is retried');
		assert.equal(capturedProviderBodies[0]?.model, 'test-coach-model');
		assert.deepEqual(capturedProviderBodies[0]?.tools, undefined);
		const messages = capturedProviderBodies[0]?.messages as Array<{ role: string; content: string }>;
		assert.ok(messages.some((message) => message.role === 'system'
			&& message.content.includes('untrusted data')
			&& message.content.includes('thorough, specific, actionable recommendations')
			&& message.content.includes('concrete next steps')
			&& message.content.includes('how the user can verify the result')
			&& !message.content.includes('concise')));
		assert.ok(messages.some((message) => message.role === 'user'
			&& message.content.includes(retainedSentinel) && message.content.includes(`format (untrusted metadata): ${analysisFormat}`)));

		const proposalsResponse = await apiRequest(`/api/sessions/${providerSessionId}/proposals`, peer);
		assert.equal(proposalsResponse.status, 200);
		const proposalsBody = await proposalsResponse.json() as {
			proposals: Array<{ recommendations: Array<Record<string, unknown>> }>;
		};
		assert.equal(proposalsBody.proposals.length, 1);
		assert.deepEqual(proposalsBody.proposals[0].recommendations[0], {
			title: '<img src=x onerror=alert(1)>',
			recommendation: detailedRecommendation,
			rationale: detailedRationale,
			evidence,
		});

		providerFailuresRemaining = 3;
		capturedProviderBodies.length = 0;
		const failedSessionId = createHash('sha256').update('failed-provider-session-path').digest('hex');
		const failedUpload = await apiRequest('/api/sessions', owner, {
			method: 'POST',
			body: {
				sessionId: failedSessionId,
				format: 'copilot-cli-store',
				content: transcript,
				contentHash: hashCoachingContent(transcript),
				sourceUpdatedAt: new Date().toISOString(),
			},
		});
		assert.equal(failedUpload.status, 202);
		const failed = await waitForStatus(failedSessionId, 'failed');
		assert.equal(failed.errorCode, 'provider_unavailable');
		assert.equal(capturedProviderBodies.length, 3, 'provider attempts are capped at three');
	});

	test('replacing a snapshot deletes older raw content, preserves proposals and ignores stale worker completion', async () => {
		process.env.COACHING_MODEL_ENDPOINT = 'https://model.example.test/v1/chat/completions';
		process.env.COACHING_MODEL_API_KEY = 'test-provider-key';
		process.env.COACHING_MODEL_NAME = 'test-coach-model';
		providerFailuresRemaining = 0;
		const sessionId = createHash('sha256').update('snapshot-replacement-race').digest('hex');
		const upload = (content: string) => apiRequest('/api/sessions', owner, {
			method: 'POST',
			body: {
				sessionId,
				format: 'jsonl',
				content,
				contentHash: hashCoachingContent(content),
				sourceUpdatedAt: new Date().toISOString(),
			},
		});

		assert.equal((await upload(transcript)).status, 202);
		const first = await waitForStatus(sessionId, 'complete');
		assert.equal(first.version, 1);

		let markStarted!: () => void;
		const started = new Promise<void>((resolve) => { markStarted = resolve; });
		let release!: () => void;
		const gate = new Promise<void>((resolve) => { release = resolve; });
		delayNextProviderRequest = { started: markStarted, wait: gate };

		const versionTwoContent = `${transcript}\n{"role":"assistant","content":"Second snapshot."}`;
		assert.equal((await upload(versionTwoContent)).status, 202);
		await started;
		const versionTwoRows = getDb().prepare(`
			SELECT version, content FROM coaching_snapshots snap
			JOIN coaching_sessions session ON session.id = snap.session_id
			WHERE session.user_id = ? AND session.session_key = ?
		`).all(owner.id, sessionId) as Array<{ version: number; content: string }>;
		assert.deepEqual(versionTwoRows.map((row) => row.version), [2]);

		const versionThreeContent = `${transcript}\n{"role":"assistant","content":"Third snapshot."}`;
		assert.equal((await upload(versionThreeContent)).status, 202);
		const latest = await waitForStatus(sessionId, 'complete');
		assert.equal(latest.version, 3);
		release();
		await new Promise((resolve) => setTimeout(resolve, 50));

		const remainingRows = getDb().prepare(`
			SELECT version, content FROM coaching_snapshots snap
			JOIN coaching_sessions session ON session.id = snap.session_id
			WHERE session.user_id = ? AND session.session_key = ?
		`).all(owner.id, sessionId) as Array<{ version: number; content: string }>;
		assert.deepEqual(remainingRows.map((row) => row.version), [3]);
		assert.equal(remainingRows[0]?.content, versionThreeContent);
		const proposalResponse = await apiRequest(`/api/sessions/${sessionId}/proposals`, owner);
		const proposalBody = await proposalResponse.json() as {
			proposals: Array<{ version: number; recommendations: unknown[] }>;
		};
		assert.deepEqual(proposalBody.proposals.map((proposal) => proposal.version), [3, 1]);
		assert.equal(proposalBody.proposals.every((proposal) => proposal.recommendations.length === 1), true);
	});

	test('other users and query selectors cannot read, delete or infer another owner’s snapshots', async () => {
		const ownerStatus = await apiRequest('/api/coaching/sessions/private-session-1?user_id=' + peer.id, owner);
		assert.equal(ownerStatus.status, 200);
		const peerStatus = await apiRequest('/api/coaching/sessions/private-session-1', peer);
		assert.equal(peerStatus.status, 404);
		const crossOwnerDelete = await apiRequest('/api/coaching/sessions/private-session-1', peer, { method: 'DELETE' });
		assert.equal(crossOwnerDelete.status, 404);
		const hiddenProposals = await apiRequest('/api/coaching/sessions/private-session-1/proposals', peer);
		assert.equal(hiddenProposals.status, 404);
	});

	test('private HTML escapes proposals, enforces cookie ownership and retains proposals after transcript expiry', async () => {
		const ownerPage = await app.request('/coaching', { headers: { Cookie: sessionCookie(peer) } });
		assert.equal(ownerPage.status, 200);
		assert.equal(ownerPage.headers.get('cache-control'), 'private, no-store');
		const html = await ownerPage.text();
		assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
		assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
		assert.ok(html.includes('raw session transcripts are kept for up to 30 days.'));
		assert.ok(!html.includes(retainedSentinel));

		const denied = await app.request('/coaching', { headers: { Cookie: sessionCookie(owner) } });
		assert.equal(denied.status, 200);
		assert.ok(!(await denied.text()).includes(`Session ${providerSessionId}</h2>`));

		getDb().prepare("UPDATE coaching_snapshots SET expires_at = datetime('now', '-1 second') WHERE user_id = ?")
			.run(peer.id);
		const status = await apiRequest(`/api/sessions/${providerSessionId}`, peer);
		assert.equal((await status.json() as Record<string, unknown>).contentRetained, false);
		const retainedProposals = await apiRequest(`/api/sessions/${providerSessionId}/proposals`, peer);
		assert.equal((await retainedProposals.json() as { proposals: unknown[] }).proposals.length, 1);
		const expiredPage = await app.request('/coaching', { headers: { Cookie: sessionCookie(peer) } });
		const expiredHtml = await expiredPage.text();
		assert.ok(expiredHtml.includes('Raw transcript has expired and was deleted.'));
		assert.ok(expiredHtml.includes('&lt;img src=x onerror=alert(1)&gt;'));
		assert.ok(!expiredHtml.includes(retainedSentinel));
	});

	test('coaching content never enters team or administrator API and HTML responses', async () => {
		for (const user of [owner, admin]) {
			for (const path of ['/api/team-insights', '/team', '/team/export?format=json', '/admin']) {
				const response = path.startsWith('/api/')
					? await apiRequest(path, user)
					: await app.request(path, { headers: { Cookie: sessionCookie(user) } });
				assert.ok(response.status === 200 || response.status === 302);
				assert.equal(response.headers.get('cache-control'), 'private, no-store');
				assert.ok(!(await response.text()).includes(retainedSentinel), `${path} leaked raw transcript text`);
			}
		}
	});

	test('extension-compatible delete-all path is owner-scoped', async () => {
		const expectedSessionCount = (getDb().prepare(
			'SELECT COUNT(*) AS count FROM coaching_sessions WHERE user_id = ?',
		).get(owner.id) as { count: number }).count;
		const deleted = await apiRequest('/api/sessions', owner, { method: 'DELETE' });
		assert.equal(deleted.status, 200);
		assert.deepEqual(await deleted.json(), { ok: true, deletedSessions: expectedSessionCount });
		assert.deepEqual(await (await apiRequest('/api/sessions', owner)).json(), { sessions: [] });
		assert.equal((await apiRequest(`/api/sessions/${providerSessionId}`, peer)).status, 200);
	});

	test('cookie delete action requires same-origin POST and cascades only the owner’s records', async () => {
		const forbidden = await app.request(`/coaching/sessions/${providerSessionId}/delete`, {
			method: 'POST',
			headers: { Cookie: sessionCookie(peer), Host: 'localhost' },
		});
		assert.equal(forbidden.status, 403);
		const deleted = await app.request(`/coaching/sessions/${providerSessionId}/delete`, {
			method: 'POST',
			headers: { Cookie: sessionCookie(peer), Host: 'localhost', Origin: 'http://localhost' },
		});
		assert.equal(deleted.status, 303);
		assert.equal(deleted.headers.get('location'), '/coaching?deleted=1');
		assert.equal((await apiRequest(`/api/sessions/${providerSessionId}`, peer)).status, 404);
		assert.equal((await apiRequest(`/api/sessions/${providerSessionId}/proposals`, peer)).status, 404);
	});

	test('rejects non-loopback cleartext provider endpoints without sending transcript content', async () => {
		process.env.COACHING_MODEL_API_KEY = 'test-provider-key';
		process.env.COACHING_MODEL_NAME = 'test-coach-model';
		process.env.COACHING_MODEL_ENDPOINT = 'http://model.example.test/v1/chat/completions';
		assert.equal(getCoachingProviderConfigured(), false);
		capturedProviderBodies.length = 0;
		const response = await apiRequest('/api/sessions', peer, {
			method: 'POST',
			body: {
				sessionId: createHash('sha256').update('insecure-provider-endpoint').digest('hex'),
				format: 'json',
				content: transcript,
				contentHash: hashCoachingContent(transcript),
				sourceUpdatedAt: new Date().toISOString(),
			},
		});
		assert.equal(response.status, 202);
		assert.equal((await response.json() as Record<string, unknown>).analysisStatus, 'not_configured');
		assert.equal(capturedProviderBodies.length, 0);

		for (const endpoint of [
			'http://localhost:1234/v1/chat/completions',
			'http://127.0.0.1:1234/v1/chat/completions',
			'http://127.200.1.2:1234/v1/chat/completions',
			'http://[::1]:1234/v1/chat/completions',
			'https://model.example.test/v1/chat/completions',
		]) {
			process.env.COACHING_MODEL_ENDPOINT = endpoint;
			assert.equal(getCoachingProviderConfigured(), true, `${endpoint} should be allowed`);
		}
		for (const endpoint of [
			'http://localhost.example.test/v1/chat/completions',
			'http://192.168.1.10:1234/v1/chat/completions',
			'ftp://model.example.test/v1/chat/completions',
			'https://user:password@model.example.test/v1/chat/completions',
		]) {
			process.env.COACHING_MODEL_ENDPOINT = endpoint;
			assert.equal(getCoachingProviderConfigured(), false, `${endpoint} should be rejected`);
		}
		delete process.env.COACHING_MODEL_ENDPOINT;
		delete process.env.COACHING_MODEL_API_KEY;
		delete process.env.COACHING_MODEL_NAME;
	});

	test('expired snapshots release quota while retaining proposal history', async () => {
		delete process.env.COACHING_MODEL_ENDPOINT;
		delete process.env.COACHING_MODEL_API_KEY;
		delete process.env.COACHING_MODEL_NAME;
		const db = getDb();
		const insertSession = db.prepare(`
			INSERT INTO coaching_sessions
				(user_id, session_key, current_version, content_hash, analysis_status)
			VALUES (?, ?, 1, ?, 'complete')
		`);
		const insertSnapshot = db.prepare(`
			INSERT INTO coaching_snapshots
				(user_id, session_id, version, content_hash, format, content, analysis_status, expires_at)
			VALUES (?, ?, 1, ?, 'json', ?, 'complete', ?)
		`);
		const insertProposal = db.prepare(`
			INSERT INTO coaching_proposals
				(user_id, session_id, version, recommendations_json)
			VALUES (?, ?, 1, ?)
		`);
		for (let i = 0; i < 100; i++) {
			const historicalKey = `expired-history-${i}`;
			const rawContent = i === 0
				? 'COACHING_RAW_DELETE_PHYSICAL_SENTINEL_73eab25c'
				: `expired private transcript ${i}`;
			const contentHash = hashCoachingContent(rawContent);
			const inserted = insertSession.run(peer.id, historicalKey, contentHash);
			const sessionDbId = Number(inserted.lastInsertRowid);
			insertSnapshot.run(peer.id, sessionDbId, contentHash, rawContent, '2000-01-01 00:00:00');
			if (i === 0) {
				insertProposal.run(peer.id, sessionDbId, JSON.stringify([{
					title: 'Saved recommendation',
					recommendation: 'Keep this proposal.',
					rationale: 'It is retained until owner deletion.',
					evidence: 'historical evidence',
				}]));
			}
		}
		assert.equal((db.prepare('PRAGMA secure_delete').get() as { secure_delete: number }).secure_delete, 1);
		const dbPath = getDatabasePath();
		const rawStorePaths = [dbPath, `${dbPath}-wal`];
		const bytesBeforePrune = Buffer.concat(rawStorePaths
			.filter((path) => existsSync(path))
			.map((path) => readFileSync(path)));
		assert.notEqual(bytesBeforePrune.indexOf('COACHING_RAW_DELETE_PHYSICAL_SENTINEL_73eab25c'), -1,
			'fixture confirms raw transcript bytes reached the live SQLite store');

		const sessionId = createHash('sha256').update('post-expiry-new-session').digest('hex');
		const uploaded = await apiRequest('/api/sessions', peer, {
			method: 'POST',
			body: {
				sessionId,
				format: 'json',
				content: transcript,
				contentHash: hashCoachingContent(transcript),
				sourceUpdatedAt: new Date().toISOString(),
			},
		});
		assert.equal(uploaded.status, 202);
		assert.equal((await uploaded.json() as Record<string, unknown>).analysisStatus, 'not_configured');
		const bytesAfterPrune = Buffer.concat(rawStorePaths
			.filter((path) => existsSync(path))
			.map((path) => readFileSync(path)));
		assert.equal(bytesAfterPrune.indexOf('COACHING_RAW_DELETE_PHYSICAL_SENTINEL_73eab25c'), -1,
			'pruned transcript bytes are absent from the live database and WAL after secure delete/checkpoint');
		assert.equal((db.prepare('SELECT COUNT(*) AS count FROM coaching_snapshots WHERE user_id = ?')
			.get(peer.id) as { count: number }).count, 2, 'expired raw snapshots are pruned but current raw data remains');
		assert.equal((db.prepare('SELECT COUNT(*) AS count FROM coaching_sessions WHERE user_id = ?')
			.get(peer.id) as { count: number }).count, 102, 'historical session metadata remains available');
		const historicalProposals = await apiRequest('/api/coaching/sessions/expired-history-0/proposals', peer);
		assert.equal((await historicalProposals.json() as { proposals: unknown[] }).proposals.length, 1);

		const retainedCount = (db.prepare(`
			SELECT COUNT(DISTINCT session_id) AS count
			FROM coaching_snapshots WHERE user_id = ? AND expires_at > datetime('now')
		`).get(peer.id) as { count: number }).count;
		for (let i = 0; i < MAX_COACHING_SESSIONS_PER_USER - retainedCount; i++) {
			const activeContent = `active-${i}`;
			const activeHash = hashCoachingContent(activeContent);
			const inserted = insertSession.run(peer.id, `active-session-${i}`, activeHash);
			insertSnapshot.run(
				peer.id,
				Number(inserted.lastInsertRowid),
				activeHash,
				activeContent,
				'2999-01-01 00:00:00',
			);
		}
		const overCapacity = await apiRequest('/api/sessions', peer, {
			method: 'POST',
			body: {
				sessionId: createHash('sha256').update('over-capacity-session').digest('hex'),
				format: 'json',
				content: transcript,
				contentHash: hashCoachingContent(transcript),
				sourceUpdatedAt: new Date().toISOString(),
			},
		});
		assert.equal(overCapacity.status, 429);
		assert.equal((await overCapacity.json() as Record<string, unknown>).code, 'session_limit_reached');
	});
});
