import test from 'node:test';
import * as assert from 'node:assert/strict';

import * as vscode from 'vscode';
import { t } from '../../src/l10n';

const mock = (vscode as any).__mock;

// The shim's default l10n.t returns the raw key — exactly what real VS Code
// does for key-based calls on the default (English) display language.

test('l10n: VS Code-provided bundle translation takes precedence', () => {
	mock.setL10nBundle({ 'statusBar.loadingText': 'Chargement…' });
	assert.equal(t('statusBar.loadingText'), 'Chargement…');
	mock.setL10nBundle(null);
});

test('l10n: VS Code bundle args are passed through', () => {
	mock.setL10nBundle({ 'statusBar.analyzingLogs': 'Analyse: {0}%' });
	assert.equal(t('statusBar.analyzingLogs', '42'), 'Analyse: 42%');
	mock.setL10nBundle(null);
});

test('l10n: resolves English from the inlined package.nls.json when VS Code returns the raw key', () => {
	const value = t('statusBar.loadingText');
	assert.notEqual(value, 'statusBar.loadingText');
	assert.ok(value.includes('AI Fluency'), `expected English text, got: ${value}`);
});

test('l10n: inlined fallback formats {0} placeholders', () => {
	assert.equal(t('statusBar.analyzingLogs', '42'), '$(loading~spin) Analyzing Logs: 42%');
});

test('l10n: resolves zh-cn strings when the display language is zh-cn', () => {
	mock.setLanguage('zh-cn');
	assert.equal(t('nav.btnRefresh'), '刷新');
	mock.setLanguage('en');
});

test('l10n: bare language tag zh matches the zh-cn bundle', () => {
	mock.setLanguage('zh');
	assert.equal(t('nav.btnRefresh'), '刷新');
	mock.setLanguage('en');
});

test('l10n: zh-tw does not get the Simplified Chinese bundle', () => {
	mock.setLanguage('zh-tw');
	assert.equal(t('nav.btnRefresh'), 'Refresh');
	mock.setLanguage('en');
});

test('l10n: unknown key returns the key itself and warns once', () => {
	const warnings: string[] = [];
	const originalWarn = console.warn;
	console.warn = (msg: unknown) => { warnings.push(String(msg)); };
	try {
		assert.equal(t('no.such.key.exists'), 'no.such.key.exists');
		t('no.such.key.exists');
	} finally {
		console.warn = originalWarn;
	}
	assert.equal(warnings.length, 1);
	assert.ok(warnings[0].includes('No localization found for key "no.such.key.exists"'));
});

// Keys added for the dialog/toast buttons and insights status bar name
// (PR #1876 follow-up) — guards against raw keys resurfacing in the UI.
test('l10n: dialog button and insights status bar keys resolve in English', () => {
	const expected: Record<string, string> = {
		'statusBar.nameInsights': 'AI Engineering Fluency — Insights',
		'button.openSettings': 'Open Settings',
		'button.openUsageAnalysis': 'Open Usage Analysis',
		'button.openInsightsTab': 'Open Insights tab',
		'button.removeOldExtension': 'Remove Old Extension',
		'button.dismiss': 'Dismiss',
	};
	for (const [key, english] of Object.entries(expected)) {
		assert.equal(t(key), english, `English value for ${key}`);
	}
});

test('l10n: dialog button and insights status bar keys resolve in zh-cn', () => {
	mock.setLanguage('zh-cn');
	try {
		const expected: Record<string, string> = {
			'statusBar.nameInsights': 'AI 工程熟练度 —— 洞察',
			'button.openSettings': '打开设置',
			'button.openUsageAnalysis': '打开使用分析',
			'button.openInsightsTab': '打开洞察标签页',
			'button.removeOldExtension': '删除旧扩展',
			'button.dismiss': '忽略',
		};
		for (const [key, chinese] of Object.entries(expected)) {
			assert.equal(t(key), chinese, `zh-cn value for ${key}`);
		}
	} finally {
		mock.setLanguage('en');
	}
});

test('l10n: clipboard-failure keys resolve in English', () => {
	// Added with the `copyFailed` handler: before it existed the webview posted
	// this and nothing on the extension side listened, so a failed copy was
	// completely silent.
	const expected: Record<string, string> = {
		'usage.copyFailed': 'Could not copy the path to the clipboard.',
		'usage.copyFailed.retry': 'Copy Again',
	};
	for (const [key, english] of Object.entries(expected)) {
		assert.equal(t(key), english, `English value for ${key}`);
	}
});

test('l10n: clipboard-failure keys resolve in zh-cn', () => {
	mock.setLanguage('zh-cn');
	try {
		const expected: Record<string, string> = {
			'usage.copyFailed': '无法将路径复制到剪贴板。',
			'usage.copyFailed.retry': '重新复制',
		};
		for (const [key, chinese] of Object.entries(expected)) {
			assert.equal(t(key), chinese, `zh-cn value for ${key}`);
		}
	} finally {
		mock.setLanguage('en');
	}
});

// Keys rendered into the share-card PNG export (PR #2035) — guards against raw
// keys resurfacing in the exported image for every locale.
test('l10n: share-card export keys resolve in English', () => {
	const expected: Record<string, string> = {
		'share.exportTitle': 'AI Engineering Fluency Score',
		'share.exportReportLabel': 'Report',
	};
	for (const [key, english] of Object.entries(expected)) {
		assert.equal(t(key), english, `English value for ${key}`);
	}
});

test('l10n: share-card export keys resolve in zh-cn', () => {
	mock.setLanguage('zh-cn');
	try {
		const expected: Record<string, string> = {
			'share.exportTitle': 'AI 工程熟练度评分',
			'share.exportReportLabel': '报告',
		};
		for (const [key, chinese] of Object.entries(expected)) {
			assert.equal(t(key), chinese, `zh-cn value for ${key}`);
		}
	} finally {
		mock.setLanguage('en');
	}
});

test('l10n: usage context-pressure keys resolve in English', () => {
	// These back the two context-pressure rows in the Usage view's Context
	// Window section. A missing key would render a raw
	// `usage.contextPressure.compactedLabel` as the row label.
	const expected: Record<string, string> = {
		'usage.contextPressure.compactedLabel': '🗜️ Sessions compacted',
		'usage.contextPressure.noneCompacted': 'No session ran out of context window in this period',
		'usage.contextPressure.nearLimitLabel': '⚠️ Sessions near the limit',
	};
	for (const [key, english] of Object.entries(expected)) {
		assert.equal(t(key), english, `English value for ${key}`);
	}
	assert.equal(t('usage.contextPressure.ofCount', '3', '12'), '3 of 12');
	assert.equal(t('usage.contextPressure.worstFill', '94'), 'Fullest session reached 94% of its window');
	assert.equal(
		t('usage.contextPressure.compactedShare', '25'),
		'25% of sessions with context data lost earlier turns to automatic compaction',
	);
	assert.match(t('usage.contextPressure.nearLimitTooltip', '80'), /at least 80% of their context window/);
	assert.match(t('usage.contextPressure.compactedTooltip'), /counted per session rather than per compaction event/);
});

test('l10n: usage context-pressure keys resolve in zh-cn', () => {
	mock.setLanguage('zh-cn');
	try {
		const expected: Record<string, string> = {
			'usage.contextPressure.compactedLabel': '🗜️ 已压缩的会话',
			'usage.contextPressure.noneCompacted': '本期间没有会话耗尽上下文窗口',
			'usage.contextPressure.nearLimitLabel': '⚠️ 接近上限的会话',
		};
		for (const [key, chinese] of Object.entries(expected)) {
			assert.equal(t(key), chinese, `zh-cn value for ${key}`);
		}
		// The Chinese phrasing reorders the two counts, so the placeholders are
		// not positional in the same way as English — a plain concatenation
		// would silently produce "3 个中的 12 个".
		assert.equal(t('usage.contextPressure.ofCount', '3', '12'), '12 个中的 3 个');
		assert.equal(t('usage.contextPressure.worstFill', '94'), '最满的会话达到了其窗口的 94%');
	} finally {
		mock.setLanguage('en');
	}
});

test('l10n: every Efficiency Combined-filter key resolves in English', () => {
	const expected: Record<string, string> = {
		"efficiency.combined.filtersLegend": "Filter the Combined chart",
		"efficiency.combined.vendorLabel": "Model vendor",
		"efficiency.combined.modelLabel": "Model",
		"efficiency.combined.editorLabel": "Editor",
		"efficiency.combined.optionAll": "All",
		"efficiency.combined.clearFilters": "Clear filters",
		"efficiency.combined.selectionAll": "All editors, all vendors, all models",
		"efficiency.combined.empty": "No sessions match this combination in the last 12 weeks. Widen or clear the filters to see the chart again.",
		"efficiency.combined.noActivity": "No AI activity recorded in the last 12 weeks, so there is nothing to chart yet.",
		"efficiency.combined.chartLabel": "Indexed efficiency ratios and weekly lines-of-code output for the current selection",
		"efficiency.combined.summaryCaption": "Combined chart values by week for the current selection",
		"efficiency.combined.weekColumn": "Week",
		"efficiency.combined.attribution": "Per-model and per-vendor numbers are attributed, not directly observed: token totals and counters are exact per model, while session duration, lines of code, applies, interactions and the session denominator are split by each model’s share of the session’s tokens. Cost is a Copilot-equivalent estimate for comparison across filters, not billed spend — the model vendor (who built the model) and the billing source (who charges for the call) are different things. Models we cannot place appear under Unclassified rather than being guessed at or dropped.",
		"efficiency.combined.seriesCostPerKloc": "Cost per 1K lines (index)",
		"efficiency.combined.seriesTokensPerSession": "Tokens per session (index)",
		"efficiency.combined.seriesTurnsPerSession": "Turns per session (index)",
		"efficiency.combined.seriesActiveMinutes": "Active min per session (index)",
		"efficiency.combined.seriesRetryRate": "Retry rate (index)",
		"efficiency.combined.seriesLoc": "Lines changed (output)",
		"efficiency.combined.axisIndex": "Index (first week = 100)",
		"efficiency.combined.axisLoc": "Lines changed",
	};
	for (const [key, text] of Object.entries(expected)) {
		assert.equal(t(key), text, `English value for ${key}`);
	}
	// Templated keys are asserted through their formatted output, so a
	// reordered or dropped placeholder is caught rather than hidden.
	assert.equal(t("efficiency.combined.lowSample", "a0", "a1"), "Low sample: this selection has fewer than a0 session-equivalents or fewer than a1 edit turns. Read the lines as a hint, not a conclusion.");
	assert.equal(t("efficiency.combined.selectionPart", "a0", "a1"), "a0: a1");
	assert.equal(t("efficiency.combined.status", "a0", "a1", "a2", "a3"), "a0 — a1 session-equivalents and a2 edit turns across a3 active weeks.");
	assert.equal(t("efficiency.combined.statusEmpty", "a0"), "a0 — no matching activity in the last 12 weeks.");
});

test('l10n: every Efficiency Combined-filter key resolves in zh-cn', () => {
	mock.setLanguage('zh-cn');
	try {
		const expected: Record<string, string> = {
			"efficiency.combined.filtersLegend": "筛选组合图表",
			"efficiency.combined.vendorLabel": "模型厂商",
			"efficiency.combined.modelLabel": "模型",
			"efficiency.combined.editorLabel": "编辑器",
			"efficiency.combined.optionAll": "全部",
			"efficiency.combined.clearFilters": "清除筛选",
			"efficiency.combined.selectionAll": "全部编辑器、全部厂商、全部模型",
			"efficiency.combined.empty": "最近 12 周内没有会话符合此组合。请放宽或清除筛选条件以重新查看图表。",
			"efficiency.combined.noActivity": "最近 12 周内没有记录到 AI 活动，因此暂无可绘制的图表。",
			"efficiency.combined.chartLabel": "当前选择的指数化效率比率与每周代码行数产出",
			"efficiency.combined.summaryCaption": "当前选择下按周列出的组合图表数值",
			"efficiency.combined.weekColumn": "周",
			"efficiency.combined.attribution": "按模型和厂商划分的数值是归因结果，而非直接观测：令牌总量和计数器按模型精确统计，而会话时长、代码行数、应用次数、交互次数以及会话分母则按各模型在会话令牌中的占比拆分。成本是用于跨筛选条件比较的 Copilot 等效估算值，并非实际账单支出——模型厂商（谁构建了模型）与计费来源（谁为该调用收费）是不同的概念。无法归类的模型会显示为 Unclassified，而不会被猜测归类或被丢弃。",
			"efficiency.combined.seriesCostPerKloc": "每千行代码成本（指数）",
			"efficiency.combined.seriesTokensPerSession": "每会话令牌数（指数）",
			"efficiency.combined.seriesTurnsPerSession": "每会话轮次数（指数）",
			"efficiency.combined.seriesActiveMinutes": "每会话活跃分钟数（指数）",
			"efficiency.combined.seriesRetryRate": "重试率（指数）",
			"efficiency.combined.seriesLoc": "代码行变更量（产出）",
			"efficiency.combined.axisIndex": "指数（首周 = 100）",
			"efficiency.combined.axisLoc": "代码行变更量",
		};
		for (const [key, text] of Object.entries(expected)) {
			assert.equal(t(key), text, `zh-cn value for ${key}`);
		}
		// Templated keys are asserted through their formatted output, so a
		// reordered or dropped placeholder is caught rather than hidden.
		assert.equal(t("efficiency.combined.lowSample", "a0", "a1"), "样本过少：此选择的会话当量少于 a0 个，或编辑轮次少于 a1 次。这些折线仅供参考，不能作为结论。");
		assert.equal(t("efficiency.combined.selectionPart", "a0", "a1"), "a0：a1");
		assert.equal(t("efficiency.combined.status", "a0", "a1", "a2", "a3"), "a0 — 在 a3 个活跃周内共 a1 个会话当量和 a2 次编辑轮次。");
		assert.equal(t("efficiency.combined.statusEmpty", "a0"), "a0 — 最近 12 周内没有匹配的活动。");
	} finally {
		mock.setLanguage('en');
	}
});

test("l10n: what's-new notification keys resolve in English", () => {
	// The two buttons on the one-a-day new-feature notification. A missing key
	// here would put a raw `whatsNew.takeMeThere` on the button, which is the
	// kind of thing nobody notices until a user reports it.
	const expected: Record<string, string> = {
		'whatsNew.takeMeThere': 'Take me there',
		'whatsNew.seeAll': 'See what else is new',
	};
	for (const [key, english] of Object.entries(expected)) {
		assert.equal(t(key), english, `English value for ${key}`);
	}
});

test("l10n: what's-new notification keys resolve in zh-cn", () => {
	mock.setLanguage('zh-cn');
	try {
		const expected: Record<string, string> = {
			'whatsNew.takeMeThere': '带我去看看',
			'whatsNew.seeAll': '查看其他新增内容',
		};
		for (const [key, chinese] of Object.entries(expected)) {
			assert.equal(t(key), chinese, `zh-cn value for ${key}`);
		}
	} finally {
		mock.setLanguage('en');
	}
});

// Log viewer summary card labels (PR #2045 follow-up) — guards against raw
// keys resurfacing in the log viewer summary cards for every locale.
test('l10n: log viewer summary card labels resolve in English', () => {
	const expected: Record<string, string> = {
		'logviewer.summary.interactions': 'Interactions',
		'logviewer.summary.editorMode': 'Editor Mode',
		'logviewer.summary.estimatedTokens': 'Estimated Tokens',
		'logviewer.summary.actualTokens': 'Actual Tokens',
		'logviewer.summary.modelTurns': 'Model Turns',
		'logviewer.summary.inputTokens': 'Input Tokens',
		'logviewer.summary.outputTokens': 'Output Tokens',
		'logviewer.summary.cachedInput': 'Cached Input',
		'logviewer.summary.thinkingTokens': 'Thinking Tokens',
		'logviewer.summary.thinkingEffort': 'Thinking Effort',
		'logviewer.summary.subAgents': 'Sub-Agents',
		'logviewer.summary.contextTruncated': 'Context Truncated',
		'logviewer.summary.sessionHierarchy': 'Session Hierarchy',
		'logviewer.summary.toolCalls': 'Tool Calls',
		'logviewer.summary.mcpTools': 'MCP Tools',
		'logviewer.summary.contextRefs': 'Context Refs',
		'logviewer.summary.fileName': 'File Name',
		'logviewer.summary.editor': 'Editor',
		'logviewer.summary.editorSource': 'Source',
		'logviewer.summary.mcpAndContextRefs': 'MCP Tools & Context Refs',
		'logviewer.summary.noModeData': 'No mode data',
		'logviewer.summary.fileSize': 'File Size',
		'logviewer.summary.modified': 'Modified',
		'logviewer.summary.timeline': 'Timeline',
		'logviewer.summary.started': 'Started',
		'logviewer.summary.lastActivity': 'Last activity',
	};
	for (const [key, english] of Object.entries(expected)) {
		assert.equal(t(key), english, `English value for ${key}`);
	}
});

test('l10n: log viewer summary card labels resolve in zh-cn', () => {
	mock.setLanguage('zh-cn');
	try {
		const expected: Record<string, string> = {
			'logviewer.summary.interactions': '交互次数',
			'logviewer.summary.editorMode': '编辑器模式',
			'logviewer.summary.estimatedTokens': '预计令牌数',
			'logviewer.summary.actualTokens': '实际令牌数',
			'logviewer.summary.modelTurns': '模型轮次',
			'logviewer.summary.inputTokens': '输入令牌',
			'logviewer.summary.outputTokens': '输出令牌',
			'logviewer.summary.cachedInput': '缓存输入',
			'logviewer.summary.thinkingTokens': '思考令牌',
			'logviewer.summary.thinkingEffort': '思考强度',
			'logviewer.summary.subAgents': '子代理',
			'logviewer.summary.contextTruncated': '上下文截断',
			'logviewer.summary.sessionHierarchy': '会话层级',
			'logviewer.summary.toolCalls': '工具调用',
			'logviewer.summary.mcpTools': 'MCP 工具',
			'logviewer.summary.contextRefs': '上下文引用',
			'logviewer.summary.fileName': '文件名',
			'logviewer.summary.editor': '编辑器',
			'logviewer.summary.editorSource': '来源',
			'logviewer.summary.mcpAndContextRefs': 'MCP 工具与上下文引用',
			'logviewer.summary.noModeData': '无模式数据',
			'logviewer.summary.fileSize': '文件大小',
			'logviewer.summary.modified': '修改时间',
			'logviewer.summary.timeline': '时间线',
			'logviewer.summary.started': '开始',
			'logviewer.summary.lastActivity': '最后活动',
		};
		for (const [key, chinese] of Object.entries(expected)) {
			assert.equal(t(key), chinese, `zh-cn value for ${key}`);
		}
	} finally {
		mock.setLanguage('en');
	}
});

// HydraFusion Routing section (log viewer) and its Session Steps Overview integration
// (hardcoded-strings baseline fix) — guards against these strings resurfacing in English
// for zh-CN users.
test('l10n: HydraFusion Routing labels resolve in English', () => {
	const expected: Record<string, string> = {
		'hydrafusion.table.cost': 'Cost',
		'hydrafusion.turn.costTooltip': 'Cost for this turn',
		'hydrafusion.turn.jumpToStepTooltip': 'Jump to step #{0} in the Session Steps Overview below',
		'hydrafusion.turn.jumpToStepLabel': '⤵ step #{0}',
		'hydrafusion.turnsPanel.subtitle': 'Expand a turn to see each leg, what it decided, and what it cost. ● marks the leg whose output you actually received; ✗ marks a leg a judge rejected. The same legs also appear under their step in the Session Steps Overview below.',
		'hydrafusion.overview.toggleLegsAriaLabel': 'Toggle HydraFusion legs for step #{0}',
		'hydrafusion.overview.showLegsTooltip': 'Show the HydraFusion legs behind this step',
		'hydrafusion.overview.legsCaption': '⚡ HydraFusion legs for step #{0} — total',
		'hydrafusion.overview.modelChangedTooltip': 'Model changed from the previous step',
		'hydrafusion.overview.expandHint': '⚡ expand a step to see the HydraFusion legs behind it',
	};
	for (const [key, english] of Object.entries(expected)) {
		assert.equal(t(key), english, `English value for ${key}`);
	}
});

test('l10n: HydraFusion Routing labels resolve in zh-cn', () => {
	mock.setLanguage('zh-cn');
	try {
		const expected: Record<string, string> = {
			'hydrafusion.table.cost': '成本',
			'hydrafusion.turn.costTooltip': '本轮成本',
			'hydrafusion.turn.jumpToStepTooltip': '跳转到下方会话步骤概览中的步骤 #{0}',
			'hydrafusion.turn.jumpToStepLabel': '⤵ 步骤 #{0}',
			'hydrafusion.turnsPanel.subtitle': '展开某一轮以查看每个环节，它的判定结果及花费。● 标记你实际收到输出的环节；✗ 标记被评审判定拒绝的环节。相同的环节也会出现在下方会话步骤概览中对应的步骤下。',
			'hydrafusion.overview.toggleLegsAriaLabel': '切换步骤 #{0} 的 HydraFusion 环节',
			'hydrafusion.overview.showLegsTooltip': '显示此步骤背后的 HydraFusion 环节',
			'hydrafusion.overview.legsCaption': '⚡ 步骤 #{0} 的 HydraFusion 环节 — 共计',
			'hydrafusion.overview.modelChangedTooltip': '模型较上一步骤有变化',
			'hydrafusion.overview.expandHint': '⚡ 展开步骤以查看其背后的 HydraFusion 环节',
		};
		for (const [key, chinese] of Object.entries(expected)) {
			assert.equal(t(key), chinese, `zh-cn value for ${key}`);
		}
	} finally {
		mock.setLanguage('en');
	}
});
