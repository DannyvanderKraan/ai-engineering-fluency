import './vscode-shim-register';
import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import * as vscode from 'vscode';
import { SessionCoachingUploadService } from '../../src/backend/services/sessionCoachingUploadService';

test('session coaching uploads only newly created sessions and confirms storage', async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coaching-upload-'));
	const oldPath = path.join(dir, 'old.jsonl');
	const newPath = path.join(dir, 'new.jsonl');
	fs.writeFileSync(oldPath, '{"type":"user.message","data":{"content":"old"}}\n');
	fs.writeFileSync(newPath, '{"type":"user.message","data":{"content":"new"}}\n');
	const state = new Map<string, unknown>();
	const server = 'https://team.example.test';
	state.set('sessionCoaching.consent', {
		endpoint: server,
		startedAt: Date.now() - 1_000,
		existing: [createHash('sha256').update(oldPath).digest('hex')],
		accountId: 'github-user-1', generation: 'first-consent',
	});
	const context = {
		globalState: {
			get: (key: string) => state.get(key),
			update: async (key: string, value: unknown) => { state.set(key, value); },
		},
	} as unknown as vscode.ExtensionContext;
	const originalConfig = vscode.workspace.getConfiguration;
	const originalFetch = global.fetch;
	const requests: Array<{ url: string; body: Record<string, string> }> = [];
	let switchEnabled = true;
	let activeAccount = 'github-user-1';
	(vscode.workspace as any).getConfiguration = () => ({
		get: (key: string) => key === 'backend.sharingServer.sessionCoachingEnabled' ? switchEnabled : server,
		update: async (_key: string, enabled: boolean) => { switchEnabled = enabled; },
	});
	global.fetch = async (url, options) => {
		requests.push({ url: String(url), body: JSON.parse(String(options?.body)) });
		return new Response(JSON.stringify({ ok: true }), { status: 200 });
	};
	const source = {
		discovery: { getCopilotSessionFiles: async () => [oldPath, newPath] },
		openCode: { isOpenCodeDbSession: () => false },
		kilo: { isKiloDbSession: () => false },
		crush: { isCrushSessionFile: () => false },
		hermes: { isHermesSessionFile: () => false },
		devinCli: { isDevinCliSessionFile: () => false },
		getToken: () => 'test-token',
		getAccountId: () => activeAccount,
		warn: () => {},
		log: () => {},
	} as unknown as ConstructorParameters<typeof SessionCoachingUploadService>[1];
	const service = new SessionCoachingUploadService(context, source);
	try {
		await service.sync();
		assert.equal(requests.length, 1);
		assert.equal(requests[0].url, `${server}/api/sessions`);
		assert.equal(requests[0].body.format, 'jsonl');
		assert.match(requests[0].body.content, /new/);
		assert.equal(requests[0].body.contentHash, createHash('sha256').update(requests[0].body.content).digest('hex'));
		await service.sync();
		assert.equal(requests.length, 1, 'unchanged snapshot is not sent twice');
		await service.backfill();
		assert.equal(requests.length, 2, 'explicit backfill includes pre-consent sessions');
		assert.match(requests[1].body.content, /old/);
		activeAccount = 'github-user-2';
		fs.writeFileSync(newPath, '{"type":"user.message","data":{"content":"different account"}}\n');
		await service.sync(true);
		assert.equal(requests.length, 2, 'consent does not transfer to a different GitHub account');
		activeAccount = 'github-user-1';
		await service.setEnabled(false);
		await service.sync();
		assert.equal(requests.length, 2, 'disabling consent stops uploads');
		switchEnabled = true;
		state.set('sessionCoaching.consent', {
			endpoint: server, startedAt: Date.now(), existing: [], accountId: 'github-user-1', generation: 'second-consent',
		});
		await service.backfill();
		assert.equal(requests.length, 4, 'new consent can backfill sessions even after their previous uploads were deleted');
	} finally {
		service.dispose();
		global.fetch = originalFetch;
		(vscode.workspace as any).getConfiguration = originalConfig;
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test('session coaching does not mark unconfirmed uploads delivered', async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coaching-retry-'));
	const file = path.join(dir, 'session.json');
	fs.writeFileSync(file, '{"requests":[]}');
	const state = new Map<string, unknown>([['sessionCoaching.consent', {
		endpoint: 'https://team.example.test', startedAt: Date.now() - 1000, existing: [], accountId: 'github-user-1', generation: 'retry-consent',
	}]]);
	const context = { globalState: {
		get: (key: string) => state.get(key),
		update: async (key: string, value: unknown) => { state.set(key, value); },
	} } as unknown as vscode.ExtensionContext;
	const originalConfig = vscode.workspace.getConfiguration;
	const originalFetch = global.fetch;
	(vscode.workspace as any).getConfiguration = () => ({
		get: (key: string) => key === 'backend.sharingServer.sessionCoachingEnabled' ? true : 'https://team.example.test',
	});

	let attempts = 0;
	const warnings: string[] = [];
	global.fetch = async () => {
		attempts++;
		return new Response(JSON.stringify(attempts === 1 ? { ok: false } : { ok: true }));
	};
	const service = new SessionCoachingUploadService(context, {
		discovery: { getCopilotSessionFiles: async () => [file] },
		openCode: { isOpenCodeDbSession: () => false },
		kilo: { isKiloDbSession: () => false },
		crush: { isCrushSessionFile: () => false },
		hermes: { isHermesSessionFile: () => false },
		devinCli: { isDevinCliSessionFile: () => false },
		getToken: () => 'test-token', getAccountId: () => 'github-user-1',
		warn: (message: string) => warnings.push(message), log: () => {},
	} as unknown as ConstructorParameters<typeof SessionCoachingUploadService>[1]);
	try {
		await service.sync();
		await service.sync();
		assert.equal(attempts, 2);
		assert.equal(warnings.length, 1);
	} finally {
		service.dispose();
		global.fetch = originalFetch;
		(vscode.workspace as any).getConfiguration = originalConfig;
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test('session coaching exports virtual database sessions with message parts', async () => {
	const virtual = 'C:\\sessions\\opencode.db#ses_new';
	const state = new Map<string, unknown>([['sessionCoaching.consent', {
		endpoint: 'https://team.example.test', startedAt: Date.now() - 1000,
		existing: [], accountId: 'github-user-1', generation: 'virtual-consent',
	}]]);
	const context = { globalState: {
		get: (key: string) => state.get(key),
		update: async (key: string, value: unknown) => { state.set(key, value); },
	} } as unknown as vscode.ExtensionContext;
	const originalConfig = vscode.workspace.getConfiguration;
	const originalFetch = global.fetch;
	(vscode.workspace as any).getConfiguration = () => ({
		get: (key: string) => key === 'backend.sharingServer.sessionCoachingEnabled' ? true : 'https://team.example.test',
	});

	const contents: string[] = [];
	global.fetch = async (_url, options) => {
		contents.push(JSON.parse(String(options?.body)).content);
		return new Response(JSON.stringify({ ok: true }));
	};
	const service = new SessionCoachingUploadService(context, {
		discovery: { getCopilotSessionFiles: async () => [virtual] },
		openCode: {
			isOpenCodeDbSession: () => true, getOpenCodeSessionId: () => 'ses_new',
			readOpenCodeDbSession: async () => ({ time: { created: Date.now() } }),
			getOpenCodeMessagesForSession: async () => [{ id: 'message1', role: 'assistant' }],
			getOpenCodePartsForMessage: async () => [{ type: 'tool', text: 'detailed tool result' }],
		},
		kilo: { isKiloDbSession: () => false },
		crush: { isCrushSessionFile: () => false },
		hermes: { isHermesSessionFile: () => false },
		devinCli: { isDevinCliSessionFile: () => false },
		getToken: () => 'test-token', getAccountId: () => 'github-user-1', warn: () => {}, log: () => {},
	} as unknown as ConstructorParameters<typeof SessionCoachingUploadService>[1]);
	try {
		await service.sync();
		assert.equal(contents.length, 1);
		assert.match(contents[0], /detailed tool result/);
	} finally {
		service.dispose();
		global.fetch = originalFetch;
		(vscode.workspace as any).getConfiguration = originalConfig;
	}
});

test('session coaching stops a batch after a server rate limit and records the failure', async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coaching-rate-'));
	const paths = [path.join(dir, 'one.json'), path.join(dir, 'two.json')];
	for (const file of paths) { fs.writeFileSync(file, '{"requests":[]}'); }
	const state = new Map<string, unknown>([['sessionCoaching.consent', {
		endpoint: 'https://team.example.test', startedAt: Date.now() - 1000,
		existing: [], accountId: 'github-user-1', generation: 'rate-consent',
	}]]);
	const context = { globalState: {
		get: (key: string) => state.get(key),
		update: async (key: string, value: unknown) => { state.set(key, value); },
	} } as unknown as vscode.ExtensionContext;
	const originalConfig = vscode.workspace.getConfiguration;
	const originalFetch = global.fetch;
	(vscode.workspace as any).getConfiguration = () => ({
		get: (key: string) => key === 'backend.sharingServer.sessionCoachingEnabled' ? true : 'https://team.example.test',
	});

	let attempts = 0;
	global.fetch = async () => { attempts++; return new Response(null, { status: 429 }); };
	const service = new SessionCoachingUploadService(context, {
		discovery: { getCopilotSessionFiles: async () => paths },
		openCode: { isOpenCodeDbSession: () => false },
		kilo: { isKiloDbSession: () => false },
		crush: { isCrushSessionFile: () => false },
		hermes: { isHermesSessionFile: () => false },
		devinCli: { isDevinCliSessionFile: () => false },
		getToken: () => 'test-token', getAccountId: () => 'github-user-1', warn: () => {}, log: () => {},
	} as unknown as ConstructorParameters<typeof SessionCoachingUploadService>[1]);
	try {
		await service.sync();
		assert.equal(attempts, 1);
		assert.deepEqual(state.get('sessionCoaching.lastStatus'), {
			checked: 1, uploaded: 0, failed: 1,
			completedAt: (state.get('sessionCoaching.lastStatus') as { completedAt: string }).completedAt,
		});
	} finally {
		service.dispose();
		global.fetch = originalFetch;
		(vscode.workspace as any).getConfiguration = originalConfig;
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test('session coaching deletion targets the consented server after its URL changes', async () => {
	const state = new Map<string, unknown>([['sessionCoaching.consent', {
		endpoint: 'https://original.example.test', startedAt: Date.now(),
		existing: [], accountId: 'github-user-1', generation: 'delete-consent',
	}]]);
	const context = { globalState: {
		get: (key: string) => state.get(key),
		update: async (key: string, value: unknown) => { state.set(key, value); },
	} } as unknown as vscode.ExtensionContext;
	const originalConfig = vscode.workspace.getConfiguration;
	const originalFetch = global.fetch;
	let enabled = true;
	(vscode.workspace as any).getConfiguration = () => ({
		get: (key: string) => key === 'backend.sharingServer.sessionCoachingEnabled' ? enabled : 'https://new.example.test',
		update: async (_key: string, value: boolean) => { enabled = value; },
	});
	const requests: string[] = [];
	global.fetch = async (url) => {
		requests.push(String(url));
		return new Response(JSON.stringify({ ok: true }));
	};
	const service = new SessionCoachingUploadService(context, {
		getToken: () => 'test-token', getAccountId: () => 'github-user-1',
		warn: () => {}, log: () => {},
	} as unknown as ConstructorParameters<typeof SessionCoachingUploadService>[1]);
	try {
		await service.deleteOwnData();
		assert.deepEqual(requests, ['https://original.example.test/api/sessions']);
		assert.equal(enabled, false);
		assert.equal(state.get('sessionCoaching.consent'), undefined);
	} finally {
		service.dispose();
		global.fetch = originalFetch;
		(vscode.workspace as any).getConfiguration = originalConfig;
	}
});
