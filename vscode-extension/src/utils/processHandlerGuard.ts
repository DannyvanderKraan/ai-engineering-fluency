/**
 * Guard against bundled dependencies installing process-global crash handlers.
 *
 * `@azure/storage-common` ships an Emscripten-compiled CRC64 module
 * (`crc64.js`, pulled in by `@azure/storage-blob`). When that module is
 * instantiated on first blob upload, its Node shell registers:
 *
 *   process.on('uncaughtException', ex => { if (!(ex instanceof ExitStatus)) throw ex; })
 *   process.on('unhandledRejection', reason => { throw reason; })
 *
 * In a standalone CLI that is harmless. Inside the VS Code extension host it is
 * not: the host is shared by every extension in the window, so a rethrowing
 * `unhandledRejection` handler turns *any* extension's stray rejection into a
 * fatal uncaught exception. The same shell also calls `process.exit()` from its
 * `quit_` path (VS Code intercepts that one, but the listeners it cannot).
 *
 * See issue #2137. We cannot patch the dependency, so we remove the two
 * listeners again after the code that installs them has run.
 */

type FatalEvent = 'uncaughtException' | 'unhandledRejection';

const FATAL_EVENTS: readonly FatalEvent[] = ['uncaughtException', 'unhandledRejection'];

/**
 * Snapshot the listeners currently registered for the two process-global crash events.
 * Take this *before* calling into a dependency that may register its own.
 */
export function snapshotFatalHandlers(): Map<FatalEvent, Function[]> {
	const snapshot = new Map<FatalEvent, Function[]>();
	for (const event of FATAL_EVENTS) {
		snapshot.set(event, [...process.listeners(event)]);
	}
	return snapshot;
}

/**
 * Remove every `uncaughtException` / `unhandledRejection` listener that was added
 * since `snapshot` was taken, leaving the host's own handlers untouched.
 * Returns the number of listeners removed (0 in the normal case).
 */
export function removeFatalHandlersAddedSince(snapshot: Map<FatalEvent, Function[]>): number {
	let removed = 0;
	for (const event of FATAL_EVENTS) {
		const before = new Set(snapshot.get(event) ?? []);
		for (const listener of process.listeners(event)) {
			if (before.has(listener)) { continue; }
			process.removeListener(event, listener as (...args: unknown[]) => void);
			removed++;
		}
	}
	return removed;
}

/**
 * Run `fn`, then strip any process-global crash handlers it installed along the way.
 * The cleanup runs whether `fn` resolves or rejects.
 */
export async function withoutLeakedFatalHandlers<T>(
	fn: () => Promise<T>,
	onRemoved?: (count: number) => void
): Promise<T> {
	const snapshot = snapshotFatalHandlers();
	try {
		return await fn();
	} finally {
		const removed = removeFatalHandlersAddedSince(snapshot);
		if (removed > 0) { onRemoved?.(removed); }
	}
}
