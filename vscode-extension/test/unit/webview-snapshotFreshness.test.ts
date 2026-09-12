import test from 'node:test';
import * as assert from 'node:assert/strict';
import {
	AGENT_SESSIONS_PARTIAL_NOTE,
	REFRESH_GITHUB_ACTIVITY_ACTION,
	REFRESH_GITHUB_ACTIVITY_COMMAND,
	REPO_PR_PARTIAL_NOTE,
	snapshotFreshnessHtml,
	snapshotFreshnessState,
} from '../../src/webview/usage/snapshotFreshness';

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-08-29T12:00:00Z');
const FRESH = { fetchedAt: '2026-08-29T11:30:00Z', refreshIntervalMs: HOUR };
const STALE = { fetchedAt: '2026-08-29T10:00:00Z', refreshIntervalMs: HOUR };
const NOTE = { partialNote: REPO_PR_PARTIAL_NOTE };

test('a snapshot that has never been fetched says so and still offers a refresh', () => {
	assert.equal(snapshotFreshnessState({}, NOW), 'never-fetched');
	const html = snapshotFreshnessHtml({}, NOTE, NOW);
	assert.match(html, /Not fetched yet/);
	assert.match(html, new RegExp(`data-action="${REFRESH_GITHUB_ACTIVITY_ACTION}"`));
});

test('a snapshot inside its TTL reports its age and the next refresh time', () => {
	assert.equal(snapshotFreshnessState(FRESH, NOW), 'fresh');
	const html = snapshotFreshnessHtml(FRESH, NOTE, NOW);
	assert.match(html, /Updated/);
	assert.match(html, /next refresh after/);
	assert.ok(!html.includes('Revalidating'));
});

test('a snapshot past its TTL is shown as revalidating, not as live data', () => {
	assert.equal(snapshotFreshnessState(STALE, NOW), 'stale');
	const html = snapshotFreshnessHtml(STALE, NOTE, NOW);
	assert.match(html, /Revalidating/);
	assert.match(html, /Showing the cached snapshot/);
});

test('the TTL boundary counts as stale, matching the host\'s own freshness check', () => {
	const exactlyDue = { fetchedAt: new Date(NOW - HOUR).toISOString(), refreshIntervalMs: HOUR };
	assert.equal(snapshotFreshnessState(exactlyDue, NOW), 'stale');
	const justInside = { fetchedAt: new Date(NOW - HOUR + 1).toISOString(), refreshIntervalMs: HOUR };
	assert.equal(snapshotFreshnessState(justInside, NOW), 'fresh');
});

test('a snapshot with no known refresh interval never claims to be stale', () => {
	const noInterval = { fetchedAt: '2020-01-01T00:00:00Z' };
	assert.equal(snapshotFreshnessState(noInterval, NOW), 'fresh');
	assert.match(snapshotFreshnessHtml(noInterval, NOTE, NOW), /next refresh after unknown/);
});

test('an unparseable fetchedAt degrades to an unknown next refresh rather than throwing', () => {
	const broken = { fetchedAt: 'not-a-date', refreshIntervalMs: HOUR };
	assert.equal(snapshotFreshnessState(broken, NOW), 'fresh');
	assert.match(snapshotFreshnessHtml(broken, NOTE, NOW), /next refresh after unknown/);
});

test('partial data is called out as a lower bound, with the panel-specific reason', () => {
	const html = snapshotFreshnessHtml({ ...FRESH, partial: true }, NOTE, NOW);
	assert.match(html, /lower bound/);
	assert.ok(html.includes('did not complete'), html);

	const agentHtml = snapshotFreshnessHtml({ ...FRESH, partial: true }, { partialNote: AGENT_SESSIONS_PARTIAL_NOTE }, NOW);
	assert.ok(agentHtml.includes('task-detail budget'), agentHtml);
});

test('complete data carries no lower-bound warning', () => {
	assert.ok(!snapshotFreshnessHtml({ ...FRESH, partial: false }, NOTE, NOW).includes('lower bound'));
});

test('the partial note is HTML-escaped, so a hostile note cannot inject markup', () => {
	const html = snapshotFreshnessHtml({ ...FRESH, partial: true }, { partialNote: '<img src=x onerror=alert(1)>' }, NOW);
	assert.ok(!html.includes('<img'), html);
	assert.match(html, /&lt;img/);
});

test('the refresh button posts the command the extension host handles', () => {
	// Guards the contract between this button and `_getAnalysisMessageHandlers()`.
	assert.equal(REFRESH_GITHUB_ACTIVITY_COMMAND, 'refreshGitHubActivity');
	for (const state of [{}, FRESH, STALE]) {
		assert.match(snapshotFreshnessHtml(state, NOTE, NOW), new RegExp(`data-action="${REFRESH_GITHUB_ACTIVITY_ACTION}"`));
	}
});
