# Change Log

All notable changes to the VS Code extension will be documented in this file.

## [Unreleased]

## [0.18.1]

<!-- Release notes generated using configuration in .github/release.yml at main -->

## What's Changed
### Changes
* feat: add 4 friendly tool name(s) from issue #1846 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1848
* chore(deps): fix Dependabot alerts (undici, fast-uri, js-yaml) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1845
* Add once-daily leader-only background scan for stale git worktrees by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1850
* refactor: decompose _saveConfigAndActivate into focused private helpers by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1849
* feat(localization): Implement webview localization support across multiple components by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1847
* chore: sync model data from rajbos/github-copilot-model-notifier by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1853
* Hide "selected providers" cost row when GitHub Copilot is the only provider by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1851
* feat: group custom endpoint (BYOK) models under their own provider group by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1852
* fix: bump engines.vscode to ^1.134.0 to match @types/vscode by @rajbos with @Copilot in https://github.com/rajbos/ai-engineering-fluency/pull/1859
* fix: stop posh-hook.ps1 from blocking shell startup on usage --json by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1860
* Add visual-view-diff skill for headless webview screenshot testing by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1866
* fix(ci): fall back to pinned Node version when .nvmrc is missing in Copilot setup steps by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1868
* feat(sharing-server): expose a composable app factory and publish to npm by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1863
* feat(efficiency): compare models head-to-head in a new Models tab by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1861
* feat: add PR risk review workflow, skill, and contributor gate by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1869
* ci: use --allow-all-tools instead of --allow-all in Copilot CLI workflows by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1870
* Add weekly download milestone tracker workflow by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1871
* Show untracked Copilot AIC usage and rename billing coverage title by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1872
* feat(cloud-agent): account-wide agent tasks with an hourly cached snapshot by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1875
* test: add unit coverage for billing other-sessions row by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1874
* ci: add test-coverage companion check to CI workflow by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1873
* fix: resolve raw localization keys shown in UI (status bar, output channel, webview nav) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1876
* fix: localize remaining hard-coded dialog buttons and status bar name by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1877
* fix(tools): map ccd_session server name and flag unmapped server names as unknown by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1879
* feat(usage): Corrections tab detecting agent/user correction moments by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1878
* fix: friendly names and cost attribution for model ID variants by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1880
* fix(claude-desktop): discover renamed claude-code-sessions directory by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1884
* fix: tighten fluency radar chart layout to remove wasted vertical space by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1883
* feat(usage): Skill Suggestions from repeated first prompts across sessions by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1893
* fix(insights): count CLI as agentic in mode-diversity insight + split Copilot App usage by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1885
* fix(usage): make repo hygiene analysis robust and keep button layout stable by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1882
* fix(usage): stop Repository PRs and Cloud Agent tabs hanging on Loading by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1881
* feat(usage): add local model leaderboard by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1897
* fix(usage): make worktree notification "Show Me" reliably open the Worktrees tab by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1895
* fix: agent-review suggestions for PR #1895 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1896
* Add weekly agent-skills-eval workflow driven by the Copilot CLI by @rajbos with @Copilot in https://github.com/rajbos/ai-engineering-fluency/pull/1894
* Add configurable model leaderboard bubbles by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1898
* Fix dropped extension-to-webview messages by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1899
* Fix Insights navigation targets by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1900
* Fix correction insight accuracy by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1901
* Harden AI PR detection: gate on user.type, add app mapping and co-author signal by @claude[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1902
* Prevent worktree discovery from stalling on blocked roots by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1906
* Prevent local model leaderboard label overlap by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1907
* Add per-repository Dark Factory readiness scan by @claude[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1905
* Fix discovery progress timer start by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1908
* Add 90-day time window to shared selectors by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1910
* Defer stalled session preloads by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1909
* refactor: decompose startTimerIfEnabled into focused private helpers by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1913
* Speed up iterative VS Code extension compilation by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1911
* Fix recent sessions loading in thin IDE hosts by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1912
* test: cover startTimerIfEnabled skip-reason logging by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1914
* ci(skills-eval): upload the HTML report as its own artifact by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1917
* Fix webview message trust check discarding every extension message by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1919
* chore: sync model data from rajbos/github-copilot-model-notifier by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1918
* Fix potential deadlock in CliBridge inflight-task cleanup by @rajbos with @Copilot in https://github.com/rajbos/ai-engineering-fluency/pull/1915
* skills-eval: report model count and per-skill suggested next steps by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1921
* Fix Repository Hygiene Analysis false positive for missing README by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1924
* Fix label overlap in efficiency frontier chart for tightly clustered bubbles by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1925
* Fix task-category data loss in periodic refresh aggregation (Charts By Task week/month) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1927
* Collapse long-tail models into an "Other models" group in the local leaderboard by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1928
* Fix workspace health matrix dropping non-VS Code editor sessions by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1926
* fix: prevent inline JSON/dict fragments in toolNames.json friendly names by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1933
* fix(cloud-agent): resolve account-wide task repository IDs to owner/repo by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1931
* feat: add 3 friendly tool name(s) from issue #1923 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1936
* Add webview contract, interaction smoke and a one-command release preflight by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1935
* Follow-ups from PR #1919: timeout labelling, stale extension buttons, diagnostics message race by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1920
* fix: include correctionReport in silent Usage Analysis panel refresh by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1934
* chore: sync model data from rajbos/github-copilot-model-notifier by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1939
* fix(toolnames): visible warning on dedup-blocked PRs + camelCase tool-ID matching by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1943
* Add shared task classification pipeline and task-category stacked chart (tokens/cost/sessions) by @rajbos with @Copilot in https://github.com/rajbos/ai-engineering-fluency/pull/1916
* fix(cache): use stable dev-mode cache identifier across debug launches by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1945
* feat: document VS Code Chat's debug log + a Research > TTFT diagnostics tab by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1937
* adding missing leftover files by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1947
* Hide decimals for CO2/water tooltip values at 1000+ by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1948
* fix: avoid CodeQL temp-dir false positive in safeFileRead by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1946
* fix: skip edits whose replacement is the bare NO_EDITS sentinel by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1951
* Stream session discovery per-adapter instead of waiting for all by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1953
* Fix resolveSessionWorkspaceName showing worktree name instead of repo name by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1952
* Clarify cost attribution periods and effects by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1956
* Fix Claude Code interaction-mode misclassification as CLI by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1955
* Add per-repository cleanup for pushed worktrees by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1954
* feat: make corrections actionable by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1957
* Add automatic compaction insights by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1958
* Improve recent session readability by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1959
* fix: agent-review suggestions for PR #1926 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1932
* chore: upgrade fast-uri to 4.1.4 by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1961
* Fix Team Dashboard Azure fallback by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1977
* Preserve Copilot App labels in sharing uploads by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1976
* Pin workflow tool dependencies by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1978
* Show corrections loading state by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1983
* Remove redundant efficiency waterfall by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1984
* Cache TTFT scans by range by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1985
* Efficiency tab: show date ranges, hide empty windows in Models picker by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1988
* Explain Team Server data sharing in the config panel by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1986
* Improve dashboard config card UI (Azure Storage / Team Server) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1987
* Sync Copilot App / Claude (VS Code) editor labels to sharing server by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1989
* Group low-activity workspaces into "Other" on Workspace Health tab by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1991
* Stop tracking generated agent sessions cache artifact by @rajbos with @Copilot in https://github.com/rajbos/ai-engineering-fluency/pull/1990
* Remove compaction highlight border by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1994
* Add editor/vendor/model/HydraFusion pill filters to Recent Sessions table by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1992
* Add privacy-separated Team Insights for sharing-server users by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1996
* Improve worktree cleanup validation by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1995
* Cache Repository PRs snapshot with hourly trickle refresh by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1997
* Fix stale Context Window data by merging pending SQLite WAL frames by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1998
* feat: add 20 friendly tool name(s) from issue #1993 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2001
* Add Kilo Code session tracking (VS Code extension + CLI) by @sedatoztunali in https://github.com/rajbos/ai-engineering-fluency/pull/2000
* Add Kilo Code session tracking by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2002
* perf: speed up Copilot CLI session discovery by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2003
* Hide zero-cost providers in Cost by Provider panel by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2004
* Improve webview loading responsiveness by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2005
* fix: preserve repository PR snapshot when discovery finds no workspace repos by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2006
* Clarify OTel Delta loading state by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2007
* Add What's New view, one-a-day new-feature notifications, and a catalog skill by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2010
* Show every model a session used in Recent Sessions (fixes missing HydraFusion sessions) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2011
* fix(corrections): reduce false positives, add sentiment proxies by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2014
* fix(vscode-extension): pin @types/vscode back to 1.134.0 to keep engines.vscode at ^1.134.0 by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2017
* Add the Scoring Guide view to the Visual Studio and JetBrains hosts by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2019
* feat(corrections): add "Ask Copilot to fix this" prompt generation by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2022
* Fix share card period refresh by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2008
* fix: agent-review suggestions for PR #2008 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2009
* Stop Agent Review from reviewing its own auto-fix PRs by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2023
* feat(efficiency): detect and explain prompt-cache breakage by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2024
* feat: add 1 friendly tool name(s) from issue #2026 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2027
* Make the Corrections tab filtering legible by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2028
* Make worktree cleanup failures actionable by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2030
* docs(visual-studio): correct the Known Limitations list by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2029
* fix(vscode): render share PNG from live radar so it matches the Fluency Score screen by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2035
* Fix Cursor session reads leaking multi-GB WAL temp files (#2033) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2036
* Add session steps overview table to log viewer by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2038
* feat(vscode): count sessions that ran out of context window, not just compaction events by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2039
* Log viewer: show child sub-agent sessions and cost in Session Steps Overview by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2042
* chore: add monthly LOC & test-scenario stats script and workflow by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2040
* feat: add 1 friendly tool name(s) from issue #2037 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2041
* Compact log viewer summary cards; merge timeline info by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2045
* Fix Cost column missing in Session Steps Overview for Auto-routed models by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2047
* Localize all summary card labels in log viewer by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2049
* Apply the 10% Copilot Auto discount to eligible cost estimates by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2050
* fix: agent-review suggestions for PR #2045 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2046
* feat(ci): add dependency-free code duplication detection check by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2043
* feat(details): make Usage by Editor section collapsible with persisted state by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2044
* Repo review follow-ups: coverage gate, generated-file handling, stale agent docs by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/1960
* Show HydraFusion routing legs in the Session Log Viewer by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2052
* boot faster by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2054
* feat(logviewer): consolidate chat session viewer summary panels by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2058
* Add AST-based hardcoded-string checker for webview UI code by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2055
* Add Last 30 Days column to status bar popup stats table by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2056
* Fix low C# CodeQL analysis quality: manual MSBuild for csharp by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2060
* Add scan-hardcoded-strings skill for non-localized UI text inventory by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2053
* fix: re-remediate brace-expansion and js-yaml Dependabot alerts by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2061
* Show HydraFusion leg costs in dollars, link legs to Session Steps Overview by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2059
* Fix hardcoded-strings CI gate broken by #2059 HydraFusion cost UI by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2077
* fix: populate taskCategoryTokens/Sessions/ModelUsage in periodic refresh aggregation by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2062
* Scroll to the specific insight an insight notification names by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2078
* Make the "nearly ran out of context window" insight actionable by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2079
* Format Cost Attribution bar tooltips with locale-aware precise values by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2069
* fix(vscode): reconcile Models tab selections against the active window by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2070
* Improve Cost Attribution model-mix table readability and model names by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2071
* Bump outdated pinned action SHAs in CodeQL workflow by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2064
* Instant cache-only first paint + seed preload queue from cache (issue #2018 fix #2) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2080
* Add beta Mistral Vibe cloud sessions loader to diagnostics Research view by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2057
* Improve session-viewer summary card layout and de-duplicate MCP Tools & Context Refs by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2083
* Report real progress while the Efficiency view loads by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2066
* Fix: Copilot Budget tooltip row now states true remaining budget by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2090
* Fix missing CSS for team dashboard fluency panel and tabs by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2093
* Gate refresh publication on the generation, and close four cache-guard gaps by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2091
* Replace blinking square loading spinner with a rotating square on Team Dashboard by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2096
* Improve readability of the status bar hover popup by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2099
* test: make cross-window tombstone snapshot test deterministic on Windows by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2102
* feat: add 1 friendly tool name(s) from issue #2103 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2105
* ci: cache NuGet/npm/Playwright, add path gates, drop the Node 22 matrix row by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2098
* Cap deferred parse concurrency, skip no-op checkpoints, show real compute progress by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2097
* Copilot memory-files hygiene: analysis, insight card, CLI, and Tools tab UI by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2094
* Add Pre-PR self-review checklist to AGENTS.md by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2110
* Add editorType to blob upload metadata by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2095
* fix(vscode-extension): durable cross-window clear-epoch for the session cache by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2107
* fix(vscode-extension): unblock vsce packaging without raising the VS Code floor by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2109
* feat(copilot): build a graphify code graph in the coding agent setup steps by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2108
* fix: agent-review suggestions for PR #2083 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2084
* fix(ci): stop the PR risk review dying on the prompt file's frontmatter by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2113
* refactor: decompose renderTurnsOverviewTable in logviewer by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2106
* Add direct Repository PRs navigation from the Efficiency Value empty state by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2068
* Count only real human turns in Claude sessions, and explain the Claude Desktop gap by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2114
* fix(vscode): refresh the Efficiency Value tab when Repository PR data lands by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2072
* Add pr-review-readiness skill: detect when GitHub's automatic Copilot PR review has finished by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2104
* Stop the unit suite from stranding fixture directories in vscode-extension/ by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2115
* refactor: optimize caching and session handling for improved performance by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2116
* Pin the diagnostics webview test realm to a fixed locale by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2117
* fix: agent-review suggestions for PR #2117 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2119
* ci: post before/after webview screenshots on every UI PR (gh --attach, tab states, agent setup) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2118
* Bind copilot-setup-steps job to the `copilot` Environment by @rajbos with @Copilot in https://github.com/rajbos/ai-engineering-fluency/pull/2120
* ci: hash-pin the graphify pip install and lock NuGet restores (Scorecard Pinned-Dependencies) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2121
* feat: add 7 friendly tool name(s) from issue #2125 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2126
* Fix preflight check setup by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2127
* chore: bump CLI version for release (0.5.1 -> 0.6.0) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2129
* chore: bump versions for release (VS Code extension, JetBrains plugin, Visual Studio extension) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2128
* fix(jetbrains): update Marketplace change notes for 0.5.0 by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2131
* chore(sharing-server): bump version to v0.2.0 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2130
* security(tests): stop fake session paths pointing at the OS temp dir (CodeQL #102) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2135
* feat(vscode): localize the personalized Insights catalog by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2136
* fix(vscode): recognise VS AppData VSGitHubCopilot sessions (#2137) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2139
* feat: add 5 friendly tool name(s) from issue #2140 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2142
* feat(l10n): unified localization architecture — ADR + steps 1-4, 6 by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2138
* feat(l10n): step 5 — localize tier-2 modules (1/N: What's New catalog) by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2141
* feat: surface Copilot's server-side repository memories by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2134
* fix(ci): stop gh CLI --slurp/--jq crash from silently dropping PR screenshot comments by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2144
* feat(vscode): on-demand Copilot Code Review activity lookup for PRs by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2145
* feat(release-video): local release-video generator by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2146
* Remove the dead Mistral Cloud tab; fix Mistral Vibe cost attribution by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2152
* fix(fixtures): render Skill Suggestions in the usage webview fixture by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2153
* feat: add 30 friendly tool name(s) from issue #2154 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2156
* feat: add 1 friendly tool name(s) from issue #2155 by @github-actions[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2157
* fix(ci): fix Daily Mutation Test workflow's Copilot CLI prompt parsing by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2158
* chore: bump vscode-extension version to 0.18.1 by @rajbos in https://github.com/rajbos/ai-engineering-fluency/pull/2159
### 📦 npm Dependencies
* npm(deps): bump the minor-and-patch-updates group across 2 directories with 4 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1855
* npm(deps-dev): bump @stryker-mutator/core from 9.6.1 to 10.0.0 in /vscode-extension by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1856
* npm(deps): bump the minor-and-patch-updates group across 2 directories with 6 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1887
* npm(deps-dev): Bump the minor-and-patch-updates group across 2 directories with 5 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1980
* npm(deps-dev): bump @types/vscode from 1.134.0 to 1.136.0 in /vscode-extension by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2021
* npm(deps): bump the minor-and-patch-updates group across 2 directories with 4 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2020
* npm(deps-dev): bump @types/vscode from 1.136.0 to 1.137.0 in /vscode-extension by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2087
* npm(deps-dev): Bump the minor-and-patch-updates group across 2 directories with 4 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2086
* npm(deps): Bump the minor-and-patch-updates group across 2 directories with 5 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2111
* npm(deps-dev): Bump @vscode/vsce from 3.9.2 to 4.0.0 in /vscode-extension by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2112
* npm(deps): bump jsdom from 30.0.1 to 30.1.0 in /vscode-extension in the minor-and-patch-updates group across 1 directory by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2123
* npm(deps-dev): bump the minor-and-patch-updates group across 2 directories with 3 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2148
### 📦 GitHub Actions Dependencies
* github-actions(deps): bump the minor-and-patch-updates group with 7 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1857
* github-actions(deps): bump actions/setup-java from 5.7.0 to 6.0.0 by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1892
* github-actions(deps): bump actions/setup-node from 6.4.0 to 7.0.0 by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1891
* github-actions(deps): bump actions/cache/restore from 4.3.0 to 6.1.0 by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1890
* github-actions(deps): bump actions/checkout from 6.0.2 to 7.0.1 by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1889
* github-actions(deps): bump the minor-and-patch-updates group with 6 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1888
* github-actions(deps): Bump actions/cache/save from 4.3.0 to 6.1.0 by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1982
* github-actions(deps): Bump step-security/harden-runner from 2.21.0 to 2.21.1 in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1981
* github-actions(deps): bump the minor-and-patch-updates group with 3 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2089
* github-actions(deps): bump the minor-and-patch-updates group with 6 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2150
### 📦 Other Dependencies
* gradle(deps): bump gradle-wrapper from 9.7.0 to 9.7.1 in /jetbrains-plugin in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1854
* build(deps-dev): bump electron from 43.4.0 to 43.4.1 in /desktop in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1858
* build(deps-dev): bump @types/node from 26.2.0 to 26.3.0 in /cli in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1864
* build(deps-dev): bump @types/node from 26.2.0 to 26.3.0 in /desktop in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1865
* build(deps-dev): bump electron from 43.4.1 to 44.0.0 in /desktop by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1867
* build(deps-dev): Bump @types/node from 26.3.0 to 26.4.0 in /cli in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1903
* build(deps-dev): Bump @types/node from 26.3.0 to 26.4.0 in /desktop in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1904
* build(deps-dev): Bump fast-uri from 3.1.5 to 3.1.7 in /desktop by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1922
* build(deps-dev): Bump @xmldom/xmldom from 0.8.13 to 0.8.15 in /desktop by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1929
* build(deps-dev): Bump the minor-and-patch-updates group across 1 directory with 2 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1941
* build(deps-dev): Bump @types/node from 26.4.0 to 26.4.1 in /cli in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/1940
* chore(deps-dev): bump electron from 44.1.1 to 44.2.0 in /desktop in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2016
* chore(deps): bump js-yaml from 4.3.1 to 4.3.2 in /desktop by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2025
* chore(deps-dev): bump @types/node from 26.4.1 to 26.5.0 in /cli in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2031
* chore(deps-dev): bump @types/node from 26.4.1 to 26.5.0 in /desktop in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2032
* chore(deps-dev): bump electron from 44.2.0 to 44.3.0 in /desktop in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2051
* chore(deps-dev): bump @types/node from 26.5.0 to 26.5.1 in /desktop in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2101
* chore(deps-dev): bump @types/node from 26.5.0 to 26.5.1 in /cli in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2100
* gradle(deps): bump jvm from 2.4.10 to 2.4.20 in /jetbrains-plugin in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2088
* Build(deps): bump tree-sitter from 0.25.2 to 0.26.0 in /.github/requirements by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2122
* gradle(deps): bump the minor-and-patch-updates group in /jetbrains-plugin with 2 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2124
* Chore(deps-dev): bump @types/node from 26.5.1 to 26.6.1 in /cli in the minor-and-patch-updates group by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2132
* Chore(deps-dev): bump the minor-and-patch-updates group in /desktop with 2 updates by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2133
* Chore(deps): bump graphifyy from 0.9.61 to 0.9.63 in /.github/requirements by @dependabot[bot] in https://github.com/rajbos/ai-engineering-fluency/pull/2151

## New Contributors
* @claude[bot] made their first contribution in https://github.com/rajbos/ai-engineering-fluency/pull/1902
* @sedatoztunali made their first contribution in https://github.com/rajbos/ai-engineering-fluency/pull/2000

**Full Changelog**: https://github.com/rajbos/ai-engineering-fluency/compare/jetbrains/v0.4.4...vscode/v0.18.1

### Features
- New "⚡ HydraFusion Routing" section in the Session Log Viewer for Copilot CLI sessions that ran on the `hydrafusion` synthetic model. HydraFusion spends several real models on one prompt — drafting, judging, repairing — then hands back a single answer and a single credit figure; this section reconstructs the legs behind it from the routing decisions the CLI records for its own resume and rewind. It shows how often the router went compound rather than single-model, how often a judge rejected the first answer, what share of credits went on review rather than on the answer you received, which models served which legs and which of them actually supplied answers, where the credits went per phase kind, and a per-turn breakdown with the planned route (including conditional legs that never ran), each leg's verdict, duration and cost, and a marker on the leg whose output you actually read. See [docs/logFilesSchema/hydrafusion-routing-events.md](../docs/logFilesSchema/hydrafusion-routing-events.md)
- The Usage Analysis "Context Window" section now counts *sessions* that ran out of context, not just compaction events: two new rows per period show how many sessions were automatically compacted (out of those with context data) and how many Copilot CLI sessions filled at least 80% of their window without compacting, plus the fullest session's fill percentage. Two new insights go with it — a tip when sessions repeatedly approach the limit, and a celebration when none of them do — and the existing auto-compaction insight now reports the per-session share as well
- The "Some sessions nearly ran out of context window" insight is now actionable: a "Show these N sessions" button opens the Usage Analysis "Recent Sessions" tab over the last 30 days, filtered to exactly the sessions it counted. The same drill-down is available directly in that tab — a new "Context" column shows how full each session's window got (flagged with ⚠️ at 80% or more), and a "🧠 Near context limit" filter pill narrows the list to those sessions. Context fill is now filled in for every lookback period, not only Today
- Worktree cleanup now explains *why* each worktree could not be removed and lets you act on it: every skipped/failed row shows when the folder was last touched, the last commit's age, whether the branch still has a remote (and whether that remote branch was deleted), the ahead/behind push status, and the number of modified/untracked files — plus "💻 Open in VS Code", "📂 Reveal folder" and "🗑️ Delete anyway…" buttons on the row itself
- New "What's New" view (command palette: *AI Engineering Fluency: What's New*) listing the last 5 releases in plain English, plus a one-at-a-time notification that points out a new view/tab/section after an update — at most one a day, at most 3 per release, and never one you already opened yourself. Turn the notifications off with `aiEngineeringFluency.whatsNew.notificationsEnabled`; see [docs/features/WHATS-NEW.md](../docs/features/WHATS-NEW.md)
- New "Research > TTFT" tab in the Diagnostic Report: time-to-first-token averages by day/week/month with a trendline per model, read from VS Code Copilot Chat's own debug log (`attrs.ttft`) — no setup required, see [docs/features/TTFT-TRENDS.md](../docs/features/TTFT-TRENDS.md)
- New "Skill Suggestions" section in the Usage Analysis Tools & Integrations tab: clusters the first prompt of each session to find tasks you keep prompting for manually (candidates for a reusable skill or prompt file), plus a new insight when a task repeats across 3+ sessions
- New "Corrections" tab in the Usage Analysis view: surfaces moments where the agent corrected itself after an error (failed tool calls, immediate edit retries, verbal self-corrections) or you had to correct the agent, grouped per repository over its 25 most recent sessions with detected moments
- New insights that fire when user corrections or tool-error/edit-retry volume in the last 30 days is high, pointing to the Corrections tab
- New "🤖 Ask Copilot to fix this" button per repository in the Corrections tab (plus a matching action on the "you had to correct the agent repeatedly" insight): builds a prompt from that repo's most notable correction examples and sends it to Copilot Chat, asking for concrete workspace-setup improvements (instructions files, custom instructions, prompt files) grounded in what actually went wrong — with a "Copy prompt" fallback for pasting into a different workspace's chat
- Group models from user-configured custom endpoints (BYOK) under their own provider group (e.g. `Mistral (Custom)`) in the Details "Cost by Provider" panel and the provider charts, instead of lumping them into "GitHub Copilot"/"Other"
- Show only the model part of a three-part custom-endpoint model ID (`customendpoint/Mistral/mistral-medium-latest` → `mistral-medium-latest`), and estimate its cost from that model's pricing entry
- Efficiency view, Cost Attribution tab: hovering a factor bar now shows a self-contained tooltip with the previous and current value, their unit and the signed estimated cost effect at full precision (e.g. `Session count: 64 → 73 sessions` / `Estimated cost effect: +$7.3500`), instead of raw ungrouped numbers. Every number on the tab — costs, session counts, blended rates — now formats through the shared locale-aware helpers, so groupings, decimal separators and the USD symbol follow your locale, and a non-zero sub-cent effect renders as `-$0.0037` rather than a misleading `-$0.00`
- The status bar hover popup is easier to read: the Today / Current Month / Last 30 Days columns now have a proper gutter between them (the header row included), "💰 Costs by Provider — Current Month" doubles as its table's header instead of sitting above an empty one, provider costs are right-aligned into a single column, and the "🎯 Copilot Budget" gauge no longer wraps — its tracked amount, untracked (other devices/cloud) amount and remaining budget are three short lines beneath it rather than being crammed onto the gauge row and one run-on sub-row

### Performance
- Opening the Efficiency view no longer jumps to 96% and then sits there. The whole wait used to happen inside a step the progress bar drew as "the last 4%", because the view reported a single "computing" step and then went quiet. The bar now tracks the full-year daily-stats pass file by file — the only one of the view's three passes that parses anything cold, since the other two read strict subsets of the same window straight out of the session cache it fills
- Efficiency builds are serialized, so opening the view and refreshing it can no longer interleave their writes to the shared stat caches and leave the older result behind
- The Efficiency loading screen now reports real progress: per-file counts and editor pills while session logs are parsed, then named sub-steps ("Aggregating daily activity", "Analysing usage patterns", "Reading session signals", "Building efficiency trends") as the aggregation runs. Refreshing the view shows the same progress instead of leaving the old numbers frozen on screen
- Every loading screen's progress bar now moves forward across the step from parsing into computing. The bar is one value with two bands — parsing fills the first 85%, the compute phase the rest — where previously parsing ran to 100% and the compute step set it back to a fixed 96%. Within parsing the bar still tracks the reported percentage in both directions, because session discovery streams in batches and the total it is measured against grows as they arrive; pinning it there would freeze the bar at an early batch's high-water mark instead. This applies to the Details panel and the desktop tray app as well, whose parsing progress now fills 0–85% rather than 0–100% before their compute step takes it to 96%
- The Details/Environmental loading screen no longer parks at a fixed 96% for the whole compute phase on first launch: the main refresh now reports named sub-steps ("Calculating usage statistics", "Analysing usage patterns", "Scoring AI fluency") as it works through them, the same pattern the Efficiency view already used. The Environmental Impact panel, which previously showed no progress at all while waiting on the very same refresh, now receives these updates too
- A scan with many slow-to-parse session files no longer piles up hundreds of them running concurrently in the background. A parse that exceeds the per-file timeout is deferred to keep going without blocking the rest of the scan, but nothing previously capped how many could be in flight at once — on a large cache this meant hundreds of CPU-bound parses competing for the same single-threaded event loop that also delivers progress updates to the loading screen, which is very likely why that screen could look frozen even though work was still happening. The number of concurrently deferred parses is now capped, with new work pausing briefly until a slot frees up
- The cache checkpoint that runs periodically during a long scan no longer saves to disk when nothing has actually changed. It used to fire on a time interval alone, so a scan that was 100% cache hits still triggered a full read-merge-write of the shared snapshot file every ~20 seconds for no effect; it also undercounted real changes (a re-parsed, changed file didn't count toward the threshold) and could run from a follower window, writing that window's deliberately partial cache over the leader's in-progress snapshot. All three are fixed: the checkpoint now only runs the leader, and only when there is something dirty (a new, changed, or deleted entry) to save

### Bug Fixes
- Mistral Vibe sessions no longer overstate cost by ignoring cached input tokens. Vibe records `session_cached_tokens` as the cache-read portion *already included* in `session_prompt_tokens`, and Mistral discounts those heavily (Mistral Medium 3.5: $0.15 vs $1.50 per million) — but the full prompt total was being billed at the input rate, overstating cache-heavy sessions by up to ~5x (one real session: $43.65 instead of $8.22). Cached reads are now reported and priced separately, reproducing Vibe's own `session_cost` exactly
- Mistral Vibe sessions running `glm-5-2` or `devstral-2` no longer contribute $0 to cost totals — neither model had a pricing entry, so all of their usage was silently free. Both are now priced at the rates Vibe itself reports ($1.40/$4.40 and $0.40/$2.00 per million)
- The "🎯 Copilot Budget" tooltip row now states spend and remaining budget against the *combined* tracked + untracked total, matching the percentage shown on its bar — previously the headline "$X / $Y" figure only counted this device's locally-tracked usage, so a reader had to notice the separate "untracked (other devices/cloud)" sub-row and subtract it themselves to find out how much budget was actually left. Remaining budget is listed on its own line under the gauge rather than appended to it
- Clearing the cache no longer leaves any view serving numbers from before the clear. A calculation already running when you cleared would finish afterwards and write its result — computed from the cache you had just emptied — back into the shared statistics, and the next open would reuse it. Each of those cached statistics now records the state it was computed from, and anything produced before a clear is recalculated rather than reused. A refresh that was already in flight no longer gets to *display* its pre-clear result one last time either: it discards its results instead of pushing them to the status bar and the Details, Chart, Usage Analysis, Maturity and Environmental views — insight cards and their notifications included — and the clear waits for it and then runs a real refresh of its own rather than reusing the discarded one. Clearing also now waits for a pre-existing refresh's still-running foreground session-file parses, and for any it has already deferred to the background, before it clears — previously such a parse finishing after the clear (whether it was still on its ordinary pass over a file or had already timed out into the background) could silently repopulate the cache with the exact pre-clear data the clear was meant to remove. (Two gaps remain, tracked separately: clearing does not itself reset the insight badge, which keeps its last counts until the next evaluation replaces them; and the wait for a pre-clear refresh's parses has no deadline of its own — a single session file whose read never settles (e.g. an unresponsive network mount) would leave Clear Cache blocked rather than resurrecting stale data, the same accepted trade-off already made for the deferred-parse reserve pool elsewhere in this cache rework. The gap noted here previously — the on-disk snapshot having no tombstone, so such an in-flight save could put its entries back — is fixed: a cleared cache deletes tombstones too and its on-disk delete is serialized against any write already in flight, in this window or another)
- A cleared cache can no longer be silently undone by another open VS Code window. Previously, clearing the cache only reset *this* window's own memory and deleted its on-disk snapshot — a second window with its own, untouched copy of the pre-clear data could still republish it later (its next checkpoint or refresh save, whenever that happened to run — not just one already in flight at the moment of the clear), or simply keep showing it on screen from its own memory, with nothing telling that window a clear had happened anywhere. A small durable marker file now records every clear; every window checks it before publishing a save (so a save built from pre-clear data is skipped instead of landing on disk) and once per refresh cycle (so an already-open window drops its own stale in-memory data instead of continuing to display it), closing both gaps. The marker is advanced under the same lock, and in the same held critical section, that now serializes the on-disk delete against any write in flight — so a writer blocked on that lock is only ever let through once both the delete and the marker bump have landed, and always sees the fresh marker before it can publish. If the marker write itself fails (e.g. a disk error), Clear Cache no longer reports unconditional success: the command now surfaces a warning that other open windows may not see the clear, instead of silently claiming the cross-window fence held when it did not. The same is true if deleting the on-disk snapshot itself fails for a genuine reason (not just "already gone"): since a failed delete is often a transient file lock rather than a real permissions failure, the clear now falls back to replacing the snapshot with an empty one (the same tmp-file-plus-rename publish path already used elsewhere, which only needs to replace the directory entry) before giving up — only when that also fails does the marker stay un-advanced, for the same "don't tell a window a clear happened when the stale snapshot is still fully present" reason. Either failure path also now bookmarks this window's own mtime tracking against the still-present file, so this window's own very next refresh cannot resurrect the same data it just failed to clear either, independent of any peer. A peer's clear is now also visible to more than just the cache manager's own session cache: it also drops the extension's separate per-view statistics and diagnostics view state, and (if open) rebuilds the Efficiency panel and reloads the Diagnostic Report, the same invalidation a local clear already does — previously only a local clear reached that far, so a peer's clear could leave a reopened view, or an already-open Efficiency or Diagnostic Report panel, rendering pre-clear numbers indefinitely. The very first, provisional "instant paint" a window does from its on-disk cache at startup now also re-checks for a peer's clear immediately before reading that cache, closing a narrow gap where one landing in the brief window after the startup cache load finishes but before that first paint runs would otherwise go undetected and flash stale numbers for the few seconds until the real refresh overwrites them. (A gap remains, tracked separately: a session-file parse that was already in flight in a *peer* window before that peer's clear, and only finishes afterward, is not covered by the wait clearCache() now does for its own window's in-flight parses — it can still land its result straight into that peer's in-memory cache after the peer has otherwise correctly detected and dropped the clear, and get published on that peer's next save. Closing this needs each in-flight parse to carry the epoch active when it started and get rejected on a mismatch when it completes, the same shape of fix as the same-window one above, extended across windows — a separate, larger change. A second gap: this fence only protects peers running this same, updated `CacheManager` — a window still on a previous extension version writes the shared snapshot without ever consulting the epoch file, so its post-clear (to it, ordinary) publish can still land pre-clear data that every up-to-date window will accept, having no way to tell it apart from a legitimate one. Closing this needs the snapshot envelope itself to carry the epoch it was written under, and every loader to reject one older than its own baseline — a cache-version-level protocol change, not an extension of the marker-file check, and one that would invalidate every user's on-disk cache on the next update, so it is deliberately deferred rather than folded in here. A third gap: `deleteSharedSnapshot()` can be stuck retrying the shared cache lock for its whole retry budget (up to 10s) against a peer holding it, before it ever unlinks the snapshot or advances the epoch — a same-process fix now rejects a save or load started in exactly that window on *this* window (a `clearInProgress` counter, checked alongside the epoch and generation), but a *different* window has no way to observe it: nothing durable records "a clear is in flight, not just decided" until the epoch marker itself is written at the very end of that window. A peer's load landing anywhere in that up-to-10-second gap can still merge the still-present pre-clear snapshot undetected. Closing this needs a durable, cross-window "clear intent" signal peers can check before the epoch itself is known to have moved — visible earlier in the sequence than the epoch bump this PR already added, and with its own staleness/dead-owner handling akin to the lock file's — a fourth marker file and lifecycle, not an extension of the existing checks. A fourth: the epoch is a plain float64 number, so it cannot be safely incremented once it reaches `Number.MAX_SAFE_INTEGER` — under real, `Date.now()`-driven usage this needs longer than any deployment will run, but a marker corrupted to exactly that value is a real, if narrow, input. On hitting it, the fix holds the epoch at the ceiling rather than picking a smaller replacement, since falling back to a smaller value would *regress* it below whatever a peer may have already adopted, letting that peer silently treat every later real clear as old — worse than the write simply failing to advance. Properly resolving exhaustion (so a clear that hits this ceiling is still individually detectable) needs a wider representation, such as a `BigInt` or decimal string, everywhere the epoch is read, compared and persisted — a representation change, not an extension of the numeric comparisons this PR's checks already do. A fifth: `clearInProgressCount` is only ever decremented by `deleteSharedSnapshot()`, so `clearAllCachedData()` — a public method — must always be immediately followed by a matching `deleteSharedSnapshot()` call; `clearCache()`, the only production caller, already does this with no `await` in between, so the gap does not occur there today, but nothing in the type system enforces the pairing for any other caller. Calling `clearAllCachedData()` alone (e.g. a future feature wanting only an in-memory reset, or a test) wedges the counter above zero permanently, silently failing every later save and discarding every later load on that instance. Properly closing this needs a single method that owns both halves atomically instead of two independently-callable public methods — a public API change, not just an internal fix, so it is deferred rather than folded in here; a regression test in `cacheManager-snapshot.test.ts` documents the current, accepted shape of this gap. A sixth: `readClearEpoch()` fails open to `0` for both a genuinely missing marker (the normal, expected first-run case, where `0` is correct) and a corrupt/unparseable one (an abnormal case where the real value might be far higher and is simply unknown). Combined with a backward system-clock step on the window doing the bump, this can write a new epoch below a value some peer already legitimately holds — that peer's `persisted <= this.clearEpoch` check then treats this real clear (and any further ones, until the clock catches up) as old. The existing local-epoch floor only protects a window that already observed the higher value itself; a window with no local memory of it (freshly started, or simply new) has nothing to floor against. Properly closing this needs either distinguishing "missing" from "corrupt" and refusing to advance in the latter case (at the cost of leaving the fence permanently disabled until the corruption is manually cleared, since every future clear would hit the same corrupt read) or a redundant, independently-recoverable source of truth for the epoch — both larger trade-offs than this PR's marker-file design, and deliberately not attempted here. This compound precondition (corruption plus a simultaneous backward clock step) is the same class of narrow, accepted residual risk as the two-clears-racing-the-lock gap already noted elsewhere in this entry)
- Every view now declares the language it is actually written in, instead of always claiming English. Screen readers were being told to pronounce translated interface text with English pronunciation rules
- "Last 30 Days" now means the same 30 calendar dates everywhere: the Usage Analysis period totals (tokens, corrections, context pressure, multi-agent trend, and every other "Last 30 Days" statistic) previously started one day earlier than the Recent Sessions tab's `last30` lookback and the chart's rolling 30-day window, so a session active on that extra day could count toward a total without appearing in a same-labelled session list. Both now derive from the same boundary calculation
- Insight notifications now take you to the insight, not just to the tab: the toast's "View" action and the status-bar "💡 N insights" badge scroll the Insights tab to the specific card they named and briefly outline it, instead of leaving you to find it among a dozen look-alike cards. The badge also counts what the Insights tab actually shows: it previously counted from stored state that keeps entries for insights which no longer apply, so it could claim more insights than the tab listed — and miss one whose snooze had just expired
- Fix Cursor session reads filling `%temp%` with multi-GB `cursor-wal-*.db` snapshots when Cursor is running alongside VS Code (#2033): reads Cursor's live `state.vscdb` through a read-only, copy-free connection instead of copying and checkpointing the whole database on every poll; the still-present copy-based fallback now caps the database size it will ever copy, throttles merge attempts per database, and backs off further while a writer looks active. A one-time best-effort sweep on activation reclaims any `cursor-wal-*`/`sqlite-wal-*` temp files stranded by earlier versions
- The worktree cleanup report no longer disappears when the run empties the worktree list — the skipped/failed rows you still have to act on stayed hidden behind the "No worktrees found yet" empty state
- Corrections tab filtering is now readable: the "📈 escalating" badge is a real filter pill (it did nothing when clicked before), active pills are outlined and bold with a "✕" plus a "Clear filter" button, a "Showing X of Y listed correction moments" bar states what the list below is filtered to, each repository header reports how many of its sessions and moments match, and the empty-filter state explains why a counted moment can sit outside the capped detail sample
- Fix the "Efficiency" nav button in the Efficiency view doing nothing when clicked — the view passed no active view to the shared nav bar, so its own button rendered enabled with no click handler instead of being marked as the current page
- Surface a warning when copying a path from the Usage Analysis view fails: the webview reported the failure but nothing on the extension side listened, so a failed copy was completely silent
- Sharing-server sync now reports "Copilot App" and "Claude (VS Code)" as their own editor labels (matching the local Interaction Modes view) instead of lumping them into "Copilot CLI"/"Claude Code" — the team dashboard's "Editors Used" panel previously had no way to show these categories at all, since the synced `editor` field never carried the distinction
- The Efficiency view's "🎁 Value" tab now updates itself when Repository PR data loads in Usage Analysis, instead of keeping its "Connect GitHub and open Usage Analysis → Repository PRs" hint until you pressed Refresh. Only the Value cards are replaced — the selected tab, controls and charts stay as they are — and a result that arrives while the view is still rendering is replayed to the new document. Cloud Agent task loads still leave Value alone, since `aiPrs` counts bot-authored pull requests rather than cloud-agent tasks (#1962)

### Chores
- The personalized Insights catalog is now fully localized, in English and Simplified Chinese. All 53 insights — every title, body sentence and action label — previously shipped as hardcoded English; they now resolve through the extension's localization bundles, with a separate entry per grammatical variant so plural forms and verb agreement translate properly instead of being assembled from English fragments. The English wording is unchanged. `npm run lint:hardcoded-strings` now guards the catalog against new hardcoded text. See [docs/adr/INSIGHTS-CATALOG-LOCALIZATION.md](../docs/adr/INSIGHTS-CATALOG-LOCALIZATION.md)
- New validation tooling: `npm run preflight` runs every check in one pass (see [docs/VALIDATION.md](../docs/VALIDATION.md)), `npm run check:contract` fails the build when a webview message has no handler on the other side, and `npm run check:interaction` clicks every control in every panel headlessly. CI now also renders before/after webview screenshots on pull requests

## [0.17.2] - 2026-08-17

### Features
- 2 additional friendly tool names from community issue #1823 (#1824)

### Bug Fixes
- Recognize Copilot App's `<repo>.worktrees` worktree layout in path/repo detection (#1827)
- Fix Recent Sessions view stuck on "Loading..." for non-Today periods (#1826)
- Fix initial scan showing 0 tokens for today on cold boot with multiple windows and stale refresh-lock recycling (#1825, #1822)

### Chores
- Sync latest model data (#1796)

## [0.17.1] - 2026-07-31

### Bug Fixes
- Fix Efficiency view stuck 'already in flight' after close+reopen (#1797)
- Fix Today stats showing 0 for multi-day adapter sessions with ongoing activity (#1797)

## [0.17.0] - 2026-07-30

### Features
- Efficiency view: are you working more efficiently with AI over time, plus a one-time notification popup pointing users to it (#1791, #1794)
- Cost by Model and Tokens by Provider chart splits (#1781)
- Collapsible By Editor breakdown in Chart view summary (#1785)
- Detect agent-skill usage across Claude Code, Claude Desktop, and Copilot CLI (#1778)
- Show untracked Copilot usage in the API budget bar (#1783)
- 3 additional friendly tool names from community issue #1787 (#1788)
- Model Efficiency section in Usage Analysis: per-model one-shot edit rate, retry rate, self-correction rate, cost per turn, cost per edit, output tokens per turn, and cache hit rate, with sortable columns and period switcher (#1649)
- Insight card that flags models with high edit-retry rates and compares them against your best-performing model (#1649)
- GitHub API requests (PR stats, cloud-agent sessions, Copilot plan info) now honor VS Code's `github-enterprise.uri` setting, so they target a GHE.com or GitHub Enterprise Server host instead of always hitting github.com — matching where the user actually signed in

### Bug Fixes
- Fix `Other` row sorting into the top-N list in Usage by Editor/Models tables (#1786)
- Fix Diagnostics reload being much slower than the initial extension load (#1784)
- Claude Code: attribute multi-day session tokens to the day each turn actually occurred instead of collapsing everything onto the session's start day, and discover subagent/workflow transcripts under `<sessionId>/subagents/**` that were previously silently excluded (#1608)

### Security
- Fix open code-scanning alerts, including a log injection issue sanitized inline (#77-98) (#1790)

### Maintenance
- Decompose `deleteEntitiesForUserDataset` into focused private helpers (#1777)

## [0.13.0] - 2026-07-11

### Features
- Long-context pricing discovery, insights, and Context Window section
- Added friendly tool names from multiple community issues (#1571, #1573, #1577, #1581)
- Clarified provider cost tooltip: unified budget/spend bars, add totals

### Bug Fixes
- Use notifier's real pricing data instead of hardcoded 0.00 stubs

## [0.11.6] - 2026-06-07

### Features
- Track session.truncation events as a negative fluency signal (#1354)
- Add refresh button to log viewer for on-demand session reload (#1349)
- Show context references as a readable table in usage analysis (#1348)
- Add friendly tool names (#1352, #1347)
- Replace premium/standard tier with cost-based model classification (#1345)
- Surface exact Copilot billing cost from nanoAiu data (#1344)

### Bug Fixes
- Use modelUsage input+output sum for Tokens (input+output) display (#1353)

## [0.11.3] - 2026-05-22

### Maintenance
- Patch version bump

## [0.11.2] - 2026-05-22

### Bug Fixes
- fix(vscode): use getConfiguration() with full key for statusBar update() calls (#1046)

## [0.11.1] - 2026-05-22

### Bug Fixes
- fix(vscode): use leaf-key getConfiguration for statusBar settings to fix 'not registered' error (#1044)
- fix: muting unknown tool now instant, skips full stats recalc (#1043)

## [0.11.0] - 2026-05-22

### Features
- Configurable status bar: independently show token counts and/or cost (#1036)
- Added 17+ friendly tool names for Claude in Chrome, Cowork, M365 Connector, and other tools (#1037, #1038, #1039)

### Security
- Added HTML escaping to prevent XSS in configPanel webview

### Maintenance
- Enhanced token tracking: extract all tokens from debug log and update session cache structure (#1040)
- Centralised adapter session path predicates to adapterPredicates.ts (#1034)
- Refactored extension.ts activate() into focused registration helpers (#1035)
- Extracted pathExists helper to utils/fsAsync.ts (#1031)
- Extracted settings validation helpers to backend/settingsValidation.ts (#1030)
- Consolidated path normalisation helpers to utils/pathUtils.ts (#1032)
- Consolidated duplicated webview type definitions to shared/types.ts (#1033)
- Added isNonNegativeInt type guard and safeJsonParse utility (#1029, #1013)
- Extracted registerMessageHandler helper from webview message listeners (#1022)
- Centralised Azure error classification in azureErrorClassifier.ts (#1017)
- Introduced ValidationResult<T> discriminated union for type-safe validation (#1021)
- Extracted Azure Storage endpoint URL builders to shared utility (#1005)
- Multiple additional refactoring improvements for maintainability and type safety

## [0.10.2] - 2026-05-13

### Maintenance
- Internal refactoring and dependency updates

## [0.10.1] - 2026-05-19

### Bug Fixes
- Implement IAnalyzableEcosystem on CopilotCliAdapter to prevent ENOENT errors on virtual session paths (#931)

## [0.10.0] - 2026-05-19

### Features
- Surface Copilot CLI chat-only sessions from session-store.db (#915)
- Add friendly display names for additional tools (#920)
- Persist chart view/period/displayMode selection across navigation (#911)

### Bug Fixes
- Propagate cachedReadTokens/cacheCreationTokens in calculateDailyStats (#907)
- Fix N+1 inefficiency in processing OpenCode sessions (#922)

### Performance
- Apply mtime-based DB caching to crush adapter to fix N+1 inefficiency (#924)
- Eliminate redundant JSON.parse calls in session analysis (#910)

## [0.9.0] - 2026-05-14

### Features
- Add oh-my-posh segment command and Copilot CLI statusline support (#876)
- Post-process SLM output to fix acronym capitalization (MCP, GitHub, etc.) (#880)
- Add SLM-powered job to generate friendly tool names from issues (#875)

### Bug Fixes
- Populate cache tokens from CLI session.shutdown events (#869)
- Pin Ollama install to versioned GitHub release with SHA256 verification (#881)

### Improvements
- Add friendly display names for 50+ tools (#862, #864, #865, #866, #867, #868, #872, #873, #874, #879)

## [0.8.0] - 2026-05-12

### Features
- Team dashboard now supports both Azure and Team Server backends (#854)
- Surface cached tokens from all providers in Details view (#851)
- Extract cached tokens from Copilot Chat debug logs (#851)
- Remove cost estimate row and rename TBB to UBB (#847)
- Add diagnostic logging to Details panel creation to aid blank-panel diagnosis (#845)

### Bug Fixes
- Replace team server iframe with launch card (#854)
- Use PID-based liveness check to break stale cache lock after force-kill (#844)

### Improvements
- Move action buttons to top and reduce report height in diagnostics view (#853)
- Sync latest model data (#852)
- Address npm audit warning
- Exclude `stryker.config.mjs` and `vs-session-sample.json` from VSIX package (#843)

## [0.7.0] - 2026-05-28

### Features
- Add rolling average toggle for Total Tokens and Est. Cost chart views (#836)
- Add Copilot Cloud Agent sessions view (#835)

## [0.5.2] - 2026-05-09

### Security
- Bumped `fast-uri` to ≥3.1.2 to fix GHSA-v39h-62p7-jpjc and GHSA-q3j6-qgpj-74h6

### Improvements
- Added friendly display names for `list_bash`, `read_bash`, and `stop_bash` tools (#822)
- Bumped `fast-xml-builder` dependency (#819)
- Cleaned up legacy code references (#821)

## [0.5.1] - 2026-05-08

### Features
- Show cached input tokens in log viewer summary bar — a "Cached Input" card now appears for Copilot CLI sessions that have `cacheReadTokens` data (#807)

### Improvements
- Added friendly display names for additional tools: ADO MCP, MSSQL, Copilot search/memory tools, `mcp_git_git_log`, `mcp_git_git_show`, and Claude in Chrome MCP tools
- Cleaned up publish script and removed legacy deprecation popup (#809)

## [0.5.0] - 2026-05-06

### Features
- Cost basis toggle moved into Sessions by category panel; chart title updates to reflect active mode
- Added sort indicator to active column header in session table

### Improvements
- Added Mistral AI model pricing and token estimators (#796)
- Added missing friendly names for 17 additional tools (TaskCreate, TaskUpdate, dismiss_deployment_notifications, Claude in Chrome MCP, and 13 others)
- Scatter chart: dark border on dots for readability, crisp rendering, variable circle size restored

### Bug Fixes
- Fixed duplicate loading sessions appearing in the status bar
- Fixed sort indicator wrapping to new line in session table headers

## [0.4.4] - 2026-05-05

### Bug Fixes
- Fixed Cowork (Claude) token over-count caused by duplicate `requestId` entries in `buildTurns` — each request is now counted exactly once (#790)
- Fixed sharing server sync being skipped when Azure Storage sync fails — both backends now sync independently (#789)

## [0.4.3] - 2026-05-05

### Bug Fixes
- Fixed concurrent sync being blocked when VS Code and VS Code Insiders are configured to different server URLs — the sync lock now stores the server URL and treats locks from a different URL as non-blocking (#787)
- Fixed sync to sharing server being skipped when both Azure Storage and the sharing server backends are configured simultaneously — both backends are now synced additively (#787)

## [0.4.2] - 2026-05-05

### Bug Fixes
- Fixed team dashboard showing empty results with Cosmos DB backend — replaced unsupported OData `datetime'...'` filter with `day` field string comparison (#783)
- Fixed `workspaceId` `w:` prefix not being stripped in extension dashboard entity processing (#783)
- Fixed logo image URL in VS Code Marketplace README (#782)

### Improvements
- Team Server diagnostics panel now shows GitHub auth status and a clickable warning banner when backend is configured but GitHub is not authenticated (#783)
- Added friendly display names for 10 additional tools (#784)
- Added friendly names for two missing GitHub MCP (Local) tools (#781)
- Pinned `vsce` and `ovsx` as exact devDependencies for reproducible builds (#785)

## [0.4.1] - 2026-05-05

### Fixes
- Fixed README badges: replaced retired vsmarketplacebadges.dev with shields.io
- Updated all VS Code install links and commands to the current extension ID (`ai-engineering-fluency`)
- Disabled legacy `copilot-token-tracker` VSIX creation and publishing in the release workflow (migration flow complete)

## [0.4.0] - 2026-05-04

### Features and Improvements
- Added Gemini CLI support as a trackable ecosystem
- Added JetBrains IDE Copilot session discovery with ask/agent mode detection, per-turn model tracking, and tooltips for data limits
- Added Copilot PR chat context references detection — surfaces #pr context in session log viewer (#760)
- Added Path Analyzer tab to diagnostics panel (#713)
- Added Editor Mode summary card to log viewer
- Added daily auto-sync of model multipliers from github-copilot-model-notifier (#718)
- Dual-publish VS Code extension under new AI Engineering Fluency marketplace ID (#731)
- Added detection of legacy copilot-token-tracker extension with prompt to uninstall and migration notice
- Added friendly display names for mcp_context7, mcp_microsoftdocs, Slidev, Copilot CLI built-in tools, and JetBrains tools (#723, #726)
- Added missing friendly names for additional tools (#771)
- Surface subagent count in log viewer; fixed subagent tool-result token estimation (#720)
- Added weekly/monthly chart periods and fixed usage analysis routing

### Bug Fixes
- Fixed: only suppress deprecation notice on explicit Dismiss
- Fixed: show correct editor name for eco sessions in diagnostics directory table
- Fixed: eco-session token count in diagnostics matches file viewer
- Fixed: replace hardcoded dark backgrounds in log viewer with theme CSS variables (#716)
- Fixed: populate estimated cost data in chart view for all periods
- Fixed: cost estimate reason display

## [0.3.0] - 2026-04-30

### Features and Improvements
- Added "💰 Est. Cost" view to the chart page: shows estimated daily/weekly/monthly API cost based on per-model token usage and provider pricing data (#703)
- Added first-value onboarding empty-state guidance and Scoring Guide panel (#710)
- Added macOS path support for Claude Desktop Cowork sessions (#714)

### Bug Fixes
- Fixed: show Configure Backend button when backend storage info is unavailable
- Fixed: exclude suppressed tools from unknown tools alert banner

## [0.1.1] - 2026-04-10

### Features and Improvements
- Added GitHub authentication support using VS Code's built-in authentication provider (#182)
- New commands: Authenticate with GitHub and Sign Out from GitHub
- GitHub Auth tab in Diagnostic Report panel showing authentication status
- Foundation for future GitHub-specific features (repository tracking, team collaboration, advanced analytics)
- Added Claude Desktop Cowork session support (#572)
- Added per-tool suppression for unknown tool name notifications (#563)
- Show git branch in status bar when running in debug mode (#576)

### Bug Fixes
- Fixed tracking of token usage from sub-agent calls in Copilot agent mode (#573)
- Fixed long MCP tool names wrapping in session viewer (#574)
- Fixed Copilot CLI session titles showing empty (#575)
- Hide 0-interaction sessions in diagnostics view

### Dependencies
- Bumped basic-ftp (#577)

## [0.1.0]

Release notes: https://github.com/rajbos/ai-engineering-fluency/compare/vscode/v0.0.23...vscode/v0.1.0

## [0.0.27] - 2026-04-07

### Features and Improvements
- Added friendly display names for mcp_gitkraken_git_log_or_diff, copilot_runInTerminal, mcp_laravel-boost_tinker, and Power BI MCP tools (#553, #554, #555)

### Bug Fixes
- Fixed integration test activation timing (#548)

## [0.0.26] - 2026-04-04

### Features and Improvements
- Split usage analysis view into 3 tabs for better navigation (#540)
- Added missing friendly display names for MCP and VS Code tools (#539)

### Bug Fixes
- Fixed loading stalls during session discovery (#545)

## [0.0.24] - 2026-03-28

### Features and Improvements
- Added Claude Code session file support as a usage analysis data source
- Added formatting options to details and log viewer panels
- Added friendly display names for container-tools and github-pull-request tools
- Added friendly display names for additional missing MCP/VS Code tools

## [0.0.23] - 2026-03-26

### Features and Improvements
- Renamed extension to AI Engineering Fluency (was Copilot Token Tracker)
- Added friendly display names for CMakeTools and misc non-MCP tools
- Added friendly display names for Python and Pylance MCP tools
- Improved maturity scoring view with updated labels and layout
- Improved fluency level viewer with updated labels
- Updated details and diagnostics webview panel titles
- Added Visual Studio session file support (shared data layer)
- Added LICENSE file to extension package
