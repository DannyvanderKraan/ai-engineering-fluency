/**
 * Unit tests for the `aes` CLI command's assessment loading.
 * Tests cli/src/commands/aes.ts
 */
import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { loadAesAssessment } from '../commands/aes';
import { FABLECART_AES_ASSESSMENT } from '../../../src/aesFableCartFixture';
import { buildAesWorkflowReport } from '../../../src/aesWorkflowAssessment';
import { renderAesReportHtml, renderAesReportText } from '../../../src/aesWorkflowReportRenderer';

test('loadAesAssessment falls back to the FableCart fixture when no --file is given', () => {
	const { assessment, isFixture } = loadAesAssessment(undefined);
	assert.equal(isFixture, true);
	assert.equal(assessment, FABLECART_AES_ASSESSMENT);
});

test('loadAesAssessment reads a JSON assessment file when --file is given', () => {
	const tmpFile = path.join(os.tmpdir(), `aes-test-${Date.now()}.json`);
	fs.writeFileSync(tmpFile, JSON.stringify(FABLECART_AES_ASSESSMENT), 'utf8');
	try {
		const { assessment, isFixture } = loadAesAssessment(tmpFile);
		assert.equal(isFixture, false);
		assert.equal(assessment.workflow.name, FABLECART_AES_ASSESSMENT.workflow.name);
	} finally {
		fs.unlinkSync(tmpFile);
	}
});

test('the CLI can build and render a report from the loaded assessment (text and html)', () => {
	const { assessment } = loadAesAssessment(undefined);
	const report = buildAesWorkflowReport(assessment);
	const text = renderAesReportText(report);
	const html = renderAesReportHtml(report);
	assert.ok(text.includes(assessment.workflow.name));
	assert.ok(html.includes(assessment.workflow.name));
});

// ---------------------------------------------------------------------------
// Validation of untrusted --file input
// ---------------------------------------------------------------------------

function writeTempJson(value: unknown): string {
	const tmpFile = path.join(os.tmpdir(), `aes-test-invalid-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
	fs.writeFileSync(tmpFile, JSON.stringify(value), 'utf8');
	return tmpFile;
}

test('loadAesAssessment rejects a file with the wrong schemaVersion', () => {
	const tmpFile = writeTempJson({ ...FABLECART_AES_ASSESSMENT, schemaVersion: 1 });
	try {
		assert.throws(() => loadAesAssessment(tmpFile), /schemaVersion.*must be 2/s);
	} finally {
		fs.unlinkSync(tmpFile);
	}
});

test('loadAesAssessment rejects a file missing a required field', () => {
	const { decision, ...withoutDecision } = FABLECART_AES_ASSESSMENT;
	void decision;
	const tmpFile = writeTempJson(withoutDecision);
	try {
		assert.throws(() => loadAesAssessment(tmpFile), /`decision` must be an object/);
	} finally {
		fs.unlinkSync(tmpFile);
	}
});

test('loadAesAssessment rejects a file with an invalid enum value', () => {
	const invalid = {
		...FABLECART_AES_ASSESSMENT,
		stocks: {
			...FABLECART_AES_ASSESSMENT.stocks,
			governance: { ...FABLECART_AES_ASSESSMENT.stocks.governance, rating: 'excellent' },
		},
	};
	const tmpFile = writeTempJson(invalid);
	try {
		assert.throws(() => loadAesAssessment(tmpFile), /stocks\.governance\.rating.*must be one of/s);
	} finally {
		fs.unlinkSync(tmpFile);
	}
});

test('loadAesAssessment rejects a non-object file', () => {
	const tmpFile = writeTempJson(['not', 'an', 'object']);
	try {
		assert.throws(() => loadAesAssessment(tmpFile), /expected a JSON object/);
	} finally {
		fs.unlinkSync(tmpFile);
	}
});
