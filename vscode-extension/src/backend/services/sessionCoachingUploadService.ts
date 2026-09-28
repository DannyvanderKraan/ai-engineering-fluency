import * as vscode from 'vscode';
import * as fs from 'fs';
import { createHash, randomUUID } from 'crypto';
import type { SessionDiscovery } from '../../../../src/sessionDiscovery';
import type { OpenCodeDataAccess } from '../../../../src/opencode';
import type { CrushDataAccess } from '../../../../src/crush';
import type { KiloDataAccess } from '../../../../src/kilo';
import type { HermesDataAccess } from '../../../../src/hermes';
import type { DevinCliDataAccess } from '../../../../src/devinCli';
import { CopilotCliStoreAccess } from '../../../../src/copilotCliStore';

const MAX_SESSION_BYTES = 2_000_000;
const SYNC_INTERVAL_MS = 5 * 60_000;
const CONSENT_KEY = 'sessionCoaching.consent';

class UploadRateLimitError extends Error {}

interface Consent {
	endpoint: string;
	startedAt: number;
	existing: string[];
	accountId: string;
	generation: string;
}

interface SessionSnapshot {
	content: string;
	format: string;
	updatedAt: number;
	createdAt: number;
}

export interface CoachingSyncStatus {
	checked: number;
	uploaded: number;
	failed: number;
	completedAt: string;
}

interface SessionSource {
	discovery: SessionDiscovery;
	openCode: OpenCodeDataAccess;
	crush: CrushDataAccess;
	kilo: KiloDataAccess;
	hermes: HermesDataAccess;
	devinCli: DevinCliDataAccess;
	getToken: () => string | undefined;
	getAccountId: () => string | undefined;
	warn: (message: string) => void;
	log: (message: string) => void;
}

function sessionId(path: string): string {
	return createHash('sha256').update(path).digest('hex');
}

function endpoint(): string {
	return vscode.workspace.getConfiguration('aiEngineeringFluency').get<string>('backend.sharingServer.endpointUrl', '').trim().replace(/\/$/, '');
}

function isSecureEndpoint(server: string): boolean {
	try {
		const url = new URL(server);
		return !url.username && !url.password && !url.hash
			&& (url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
	} catch {
		return false;
	}
}

export class SessionCoachingUploadService implements vscode.Disposable {
	private readonly cliStore = new CopilotCliStoreAccess();
	private timer: NodeJS.Timeout | undefined;
	private syncing = false;
	private controller: AbortController | undefined;

	constructor(private readonly context: vscode.ExtensionContext, private readonly source: SessionSource) {}

	private consent(): Consent | undefined {
		return this.context.globalState.get<Consent>(CONSENT_KEY);
	}

	private enabled(): boolean {
		return vscode.workspace.getConfiguration('aiEngineeringFluency').get<boolean>('backend.sharingServer.sessionCoachingEnabled', false) === true
			&& !!this.consent() && !!endpoint() && this.consent()?.endpoint === endpoint()
			&& !!this.source.getAccountId() && this.consent()?.accountId === this.source.getAccountId();
	}

	start(): void {
		this.stop();
		if (!this.consent() || vscode.workspace.getConfiguration('aiEngineeringFluency')
			.get<boolean>('backend.sharingServer.sessionCoachingEnabled', false) !== true) { return; }
		this.timer = setInterval(() => { void this.sync().catch(e => this.source.warn(`Session coaching upload failed: ${String(e)}`)); }, SYNC_INTERVAL_MS);
		void this.sync().catch(e => this.source.warn(`Session coaching upload failed: ${String(e)}`));
	}

	private stop(): void {
		if (this.timer) { clearInterval(this.timer); }
		this.timer = undefined;
		this.controller?.abort();
	}

	async setEnabled(enabled: boolean): Promise<void> {
		if (!enabled) {
			this.stop();
			await vscode.workspace.getConfiguration('aiEngineeringFluency').update('backend.sharingServer.sessionCoachingEnabled', false, vscode.ConfigurationTarget.Global);
			await this.context.globalState.update(CONSENT_KEY, undefined);
			return;
		}
		const server = endpoint();
		if (!isSecureEndpoint(server)) {
			throw new Error('Full-session sharing requires an HTTPS team server (or localhost).');
		}
		if (this.enabled()) { return; }
		const accountId = this.source.getAccountId();
		if (!accountId) { throw new Error('Sign in to GitHub before enabling full-session sharing.'); }
		const files = await this.source.discovery.getCopilotSessionFiles();
		if (this.source.discovery.lastDiscoveryHadError) { throw new Error('Session discovery was incomplete; consent was not enabled. Retry when local sessions are available.'); }
		const existing = files.map(sessionId);
		await this.context.globalState.update(CONSENT_KEY, { endpoint: server, startedAt: Date.now(), existing, accountId, generation: randomUUID() });
		await vscode.workspace.getConfiguration('aiEngineeringFluency').update('backend.sharingServer.sessionCoachingEnabled', true, vscode.ConfigurationTarget.Global);
		this.start();
	}

	isEnabled(): boolean {
		return this.enabled();
	}

	async backfill(): Promise<void> {
		if (!this.enabled()) { throw new Error('Enable full-session sharing first.'); }
		await this.sync(true);
	}

	async deleteOwnData(): Promise<void> {
		const server = this.consent()?.endpoint ?? endpoint();
		const token = this.source.getToken();
		if (!isSecureEndpoint(server) || !token) { throw new Error('Configure a secure server and sign in to GitHub first.'); }
		if (this.consent() && this.consent()?.accountId !== this.source.getAccountId()) {
			throw new Error('Sign in to the GitHub account that enabled session sharing before deleting its data.');
		}
		const response = await fetch(`${server}/api/sessions`, {
			method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) { throw new Error(`Server deletion failed: HTTP ${response.status}`); }
		await this.setEnabled(false);
		await this.context.globalState.update('sessionCoaching.lastStatus', undefined);
	}

	private async readSession(path: string): Promise<SessionSnapshot> {
		const virtual = await this.readVirtualSession(path);
		if (virtual) { return virtual; }
		if (path.includes('.db#')) { throw new Error('unsupported virtual session format'); }
		const handle = await fs.promises.open(path, 'r');
		try {
			const stat = await handle.stat();
			if (stat.size > MAX_SESSION_BYTES) { throw new Error('session exceeds the upload size limit'); }
			return {
				content: await handle.readFile({ encoding: 'utf8' }),
				format: path.endsWith('.jsonl') ? 'jsonl' : 'json',
				updatedAt: stat.mtimeMs,
				createdAt: stat.birthtimeMs || stat.mtimeMs,
			};
		} finally {
			await handle.close();
		}
	}

	private async readVirtualSession(path: string): Promise<SessionSnapshot | undefined> {
		if (this.source.openCode.isOpenCodeDbSession(path)) { return this.readOpenCode(path); }
		if (this.source.kilo.isKiloDbSession(path)) { return this.readKilo(path); }
		if (this.source.crush.isCrushSessionFile(path)) { return this.readCrush(path); }
		if (this.source.hermes.isHermesSessionFile(path)) { return this.readHermes(path); }
		if (this.source.devinCli.isDevinCliSessionFile(path)) { return this.readDevin(path); }
		if (this.cliStore.isCliStoreSession(path)) { return this.readCliStore(path); }
		return undefined;
	}

	private async readOpenCode(path: string): Promise<SessionSnapshot> {
		const session = await this.source.openCode.readOpenCodeDbSession(this.source.openCode.getOpenCodeSessionId(path)!);
		if (typeof session?.time?.created !== 'number') { throw new Error('session creation time is unavailable'); }
		const messages = await this.source.openCode.getOpenCodeMessagesForSession(path);
		const records = await Promise.all(messages.map(async message => ({
			message, parts: await this.source.openCode.getOpenCodePartsForMessage(message.id),
		})));
		return { content: JSON.stringify({ session, records }), format: 'opencode', updatedAt: Date.now(), createdAt: session.time.created };
	}

	private async readKilo(path: string): Promise<SessionSnapshot> {
		const session = await this.source.kilo.readKiloDbSession(this.source.kilo.getKiloSessionId(path)!);
		if (typeof session?.time?.created !== 'number') { throw new Error('session creation time is unavailable'); }
		const messages = await this.source.kilo.getKiloMessagesForSession(path);
		const records = await Promise.all(messages.map(async message => ({
			message, parts: await this.source.kilo.getKiloPartsForMessage(message.id),
		})));
		return { content: JSON.stringify({ session, records }), format: 'kilo', updatedAt: Date.now(), createdAt: session.time.created };
	}

	private async readCrush(path: string): Promise<SessionSnapshot> {
		const [session, messages] = await Promise.all([
			this.source.crush.readCrushSession(path), this.source.crush.getCrushMessages(path),
		]);
		const createdAt = typeof session?.created_at === 'number' ? session.created_at * 1000 : Date.parse(session?.created_at);
		if (!Number.isFinite(createdAt)) { throw new Error('session creation time is unavailable'); }
		return { content: JSON.stringify({ session, messages }), format: 'crush', updatedAt: Date.now(), createdAt };
	}

	private async readHermes(path: string): Promise<SessionSnapshot> {
		const [session, messages] = await Promise.all([
			this.source.hermes.readSession(path), this.source.hermes.getMessages(path),
		]);
		if (!session?.started_at) { throw new Error('session creation time is unavailable'); }
		return { content: JSON.stringify({ session, messages }), format: 'hermes', updatedAt: Date.now(), createdAt: session.started_at * 1000 };
	}

	private async readDevin(path: string): Promise<SessionSnapshot> {
		const [session, messages, toolCalls] = await Promise.all([
			this.source.devinCli.readSession(path), this.source.devinCli.getMessageNodes(path), this.source.devinCli.getToolCalls(path),
		]);
		if (!session?.created_at) { throw new Error('session creation time is unavailable'); }
		return { content: JSON.stringify({ session, messages, toolCalls }), format: 'devin-cli', updatedAt: Date.now(), createdAt: session.created_at * 1000 };
	}

	private async readCliStore(path: string): Promise<SessionSnapshot> {
		const [session, turns] = await Promise.all([this.cliStore.readSession(path), this.cliStore.getTurns(path)]);
		const createdAt = Date.parse(session?.created_at ?? '');
		if (!Number.isFinite(createdAt)) { throw new Error('session creation time is unavailable'); }
		return { content: JSON.stringify({ session, turns }), format: 'copilot-cli-store', updatedAt: Date.now(), createdAt };
	}

	private async uploadOne(path: string, consent: Consent, token: string, backfill: boolean, signal: AbortSignal): Promise<boolean> {
		const id = sessionId(path);
		if (!backfill && consent.existing.includes(id)) { return false; }
		const { content, format, updatedAt, createdAt } = await this.readSession(path);
		if (!backfill && createdAt <= consent.startedAt) { return false; }
		if (!content || Buffer.byteLength(content, 'utf8') > MAX_SESSION_BYTES) {
			throw new Error('session exceeds the upload size limit or is empty');
		}
		const contentHash = createHash('sha256').update(content).digest('hex');
		const marker = `sessionCoaching.sent.${createHash('sha256').update(consent.endpoint + consent.accountId + consent.generation + id).digest('hex')}`;
		if (this.context.globalState.get<string>(marker) === contentHash) { return false; }
		if (signal.aborted || !this.enabled()) { return false; }
		const response = await fetch(`${consent.endpoint}/api/sessions`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ sessionId: id, format, content, contentHash, sourceUpdatedAt: new Date(updatedAt).toISOString() }),
			signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
		});
		if (response.status === 429) { throw new UploadRateLimitError('server rate limit reached; remaining sessions will be retried later'); }
		await this.confirmUpload(response);
		if (signal.aborted || !this.enabled()) { return false; }
		await this.context.globalState.update(marker, contentHash);
		this.source.log('Session coaching: uploaded one session snapshot');
		return true;
	}

	private async confirmUpload(response: Response): Promise<void> {
		const result: unknown = response.ok ? await response.json() : undefined;
		if (!response.ok || !result || typeof result !== 'object' || (result as { ok?: unknown }).ok !== true) {
			throw new Error(`server did not confirm session storage (HTTP ${response.status})`);
		}
	}

	private isStopped(consent: Consent, signal: AbortSignal): boolean {
		return signal.aborted || !this.enabled() || this.consent()?.generation !== consent.generation;
	}

	private async processFile(path: string, consent: Consent, token: string, backfill: boolean, signal: AbortSignal, status: CoachingSyncStatus): Promise<boolean> {
		status.checked++;
		try {
			if (await this.uploadOne(path, consent, token, backfill, signal)) { status.uploaded++; }
		} catch (error) {
			if (signal.aborted) { return false; }
			status.failed++;
			this.source.warn(`Session coaching: skipped a session: ${String(error)}`);
			if (error instanceof UploadRateLimitError) { return false; }
		}
		return true;
	}

	async sync(backfill = false): Promise<void> {
		if (this.syncing || !this.enabled()) { return; }
		const consent = this.consent()!;
		const token = this.source.getToken();
		if (!token) { this.source.warn('Session coaching upload: GitHub sign-in required'); return; }
		this.syncing = true;
		const controller = new AbortController();
		this.controller = controller;
		const status: CoachingSyncStatus = { checked: 0, uploaded: 0, failed: 0, completedAt: '' };
		try {
			const files = await this.source.discovery.getCopilotSessionFiles();
			if (this.source.discovery.lastDiscoveryHadError) { throw new Error('Session discovery was incomplete; not uploading a partial result.'); }
			for (const path of files) {
				if (this.isStopped(consent, controller.signal)) { return; }
				if (!await this.processFile(path, consent, token, backfill, controller.signal, status)) { break; }
			}
		} finally {
			try {
				if (!controller.signal.aborted) {
					status.completedAt = new Date().toISOString();
					await this.context.globalState.update('sessionCoaching.lastStatus', status);
				}
			} finally {
				this.syncing = false;
				this.controller = undefined;
			}
		}
	}

	dispose(): void {
		this.stop();
		this.cliStore.dispose();
	}
}
