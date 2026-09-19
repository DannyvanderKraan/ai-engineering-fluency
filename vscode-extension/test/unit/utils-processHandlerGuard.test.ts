import { test } from 'node:test';
import * as assert from 'node:assert';
import {
	snapshotFatalHandlers,
	removeFatalHandlersAddedSince,
	withoutLeakedFatalHandlers,
} from '../../src/utils/processHandlerGuard';

/**
 * Regression cover for issue #2137: a bundled dependency (the Azure SDK's Emscripten
 * CRC64 module) registers rethrowing `uncaughtException` / `unhandledRejection`
 * listeners on the shared extension host process.
 */

const rethrow = (reason: unknown): never => { throw reason; };

test('removeFatalHandlersAddedSince: removes listeners added after the snapshot', () => {
	const snapshot = snapshotFatalHandlers();
	process.on('unhandledRejection', rethrow);
	process.on('uncaughtException', rethrow);

	const removed = removeFatalHandlersAddedSince(snapshot);

	assert.equal(removed, 2);
	assert.ok(!process.listeners('unhandledRejection').includes(rethrow));
	assert.ok(!process.listeners('uncaughtException').includes(rethrow));
});

test('removeFatalHandlersAddedSince: leaves pre-existing listeners alone', () => {
	const preExisting = (): void => { /* the host's own handler */ };
	process.on('unhandledRejection', preExisting);
	try {
		const snapshot = snapshotFatalHandlers();
		const removed = removeFatalHandlersAddedSince(snapshot);

		assert.equal(removed, 0);
		assert.ok(process.listeners('unhandledRejection').includes(preExisting));
	} finally {
		process.removeListener('unhandledRejection', preExisting);
	}
});

test('withoutLeakedFatalHandlers: strips handlers installed by the wrapped work', async () => {
	let reported = 0;
	const value = await withoutLeakedFatalHandlers(async () => {
		process.on('unhandledRejection', rethrow);
		return 'done';
	}, count => { reported = count; });

	assert.equal(value, 'done');
	assert.equal(reported, 1);
	assert.ok(!process.listeners('unhandledRejection').includes(rethrow));
});

test('withoutLeakedFatalHandlers: strips handlers even when the wrapped work throws', async () => {
	await assert.rejects(
		withoutLeakedFatalHandlers(async () => {
			process.on('uncaughtException', rethrow);
			throw new Error('upload failed');
		}),
		/upload failed/
	);

	assert.ok(!process.listeners('uncaughtException').includes(rethrow));
});

test('withoutLeakedFatalHandlers: does not report when nothing was installed', async () => {
	let called = false;
	await withoutLeakedFatalHandlers(async () => undefined, () => { called = true; });
	assert.equal(called, false);
});
