# Combined-chart filters (model vendor, model, editor)

The **Combined** tab of the Efficiency view overlays the indexed efficiency
ratios with weekly lines-of-code output. Unfiltered it answers "is my AI usage
getting more efficient?"; with the filters it answers the follow-up question:
*which* model, model maker, or editor is that coming from.

Three dropdowns — **Model vendor**, **Model** and **Editor** — each default to
**All** and compose as an intersection: picking `Anthropic` + `VS Code` shows the
weeks as they would look if only Anthropic models used inside VS Code existed.

## Model vendor is not the billing source

This is the distinction the tab exists to keep straight.

| Question | Answered by | Example |
|---|---|---|
| Who **made** the model? | `getModelVendor()` — the Combined vendor filter | `claude-sonnet-4.5` → **Anthropic** |
| Who **bills** for the call? | `getBillingGroup()` / `getModelBillingProvider()` — the Chart and Details views | `claude-sonnet-4.5` in VS Code → **GitHub Copilot** |

Copilot-hosted calls are billed as GitHub Copilot whatever model runs them, and a
custom endpoint (BYOK) is billed under the provider name *the user typed* when
registering it. Neither tells you who built the model, so neither is used for the
vendor filter. `getBillingGroup()` behaviour is unchanged by this feature.

The vendor is classified from the **canonical model id** (`getCanonicalModelId()`),
which collapses the id variants that all mean the same model:

- the `copilot/` prefix — `copilot/claude-opus-4-8` and `claude-opus-4.8` are one model
- org-scoped catalog ids — `<uuid>/gpt-5` is `gpt-5`
- custom-endpoint ids — `customendpoint/Acme Corp/mistral-medium-latest` is
  `mistral-medium-latest`, vendor **Mistral AI**; `Acme Corp` is a billing label,
  never a model maker
- dash-vs-dot version spellings and letter case

### Unclassified

A model whose id matches nothing we recognize — an internal or freshly released
model — is filed under **Unclassified** and stays selectable. Sessions that name
no model at all land there too, under the `unknown` model id — including on a day
where the same editor also ran sessions that *did* name a model. That day's
model-less remainder is tracked separately as `editorUnattributed`, so it is not
quietly folded into whichever models happened to be named alongside it. Nothing
is dropped and no vendor is guessed at, so the slices still add up to the
unfiltered totals.

A vendor prefix only matches as a whole token: the next character must be a
separator or a digit, so `gpt-5`, `gpt5` and `o4-mini` classify while
`gptish-internal` and `claudefake` stay Unclassified. Sharing an opening
substring with a known model family is not evidence of who built something.

## Cost basis

The cost the Combined chart uses (and therefore *cost per 1K lines*) is a
**Copilot-equivalent estimate**: token counts priced at Copilot's AI-Credit rates,
the same basis the unfiltered chart already uses, so the series stay comparable as
you change filters. It is not billed spend, and it is not the provider's own API
price for the model.

Cost *is* allocated at each model's own rate, not flat per token: a day's
estimated cost is split across its cells in proportion to each cell's own
estimated cost. A pricier model in a mixed day therefore keeps its price signal,
while the cells of a day still sum back to that day's total.

## How per-model values are attributed

Per-model and per-vendor numbers are **attributed, not directly observed**. The
payload is built as one cell per (day × editor × canonical model), with two
classes of value:

| Value | Source |
|---|---|
| Tokens, estimated cost | Exact per-model usage, normalized against the day's total |
| Edit turns, retries | Exact per-model turn counters |
| Sessions (denominator), interactions, lines of code, active duration, applies, code blocks | Split across the session's models by **token share** |

Token share is the existing contract the Models tab already uses: a session that
spent 60% of its tokens on model A and 40% on model B contributes 0.6 and 0.4
"session-equivalents" respectively, and its duration and lines of code are split
the same way. That is what makes the slices additive — summing every model slice
reproduces the all-model totals, with a mixed-model session counted once, not
once per model. A per-model chart built by re-filtering whole sessions would
double-count exactly those sessions.

Whole-session signals (duration, edit turns, retries, applies, code blocks) land
on the session's **last active day**, the same convention the unfiltered trends
use.

The `All / All / All` selection reproduces the unfiltered series exactly; this is
asserted directly in `vscode-extension/test/unit/efficiencyAnalysis.test.ts`.

## Evidence and sample size

- The status line under the controls names the current selection and the evidence
  behind it: session-equivalents, edit turns, and how many weeks carried activity.
- A selection with fewer than **5 session-equivalents** or fewer than **10 edit
  turns** over the window is marked **low sample** — the lines are a hint, not a
  conclusion.
- A selection with no matching activity shows an explicit empty state with a
  *Clear filters* button. It is never drawn as a flat zero line.
- The weekly **retry rate** keeps its existing gate: a week with fewer than 5 edit
  turns reports no retry rate rather than a ratio its sample cannot support.

## Limitations

- Lines of code is a weak value proxy, and it is *attributed* here rather than
  measured per model — a refactor by one model in a two-model session shows up
  split across both.
- Token share is a proxy for effort, not a measurement of it. A model that
  produced the decisive edit in few tokens is under-credited.
- Anonymous or unrecognized models are grouped, not identified: two different
  unknown models both appear under Unclassified as distinct model ids, but their
  vendor is not resolved.
- The payload covers the trailing **12 weeks** only — the same window the chart
  draws. Longer-horizon questions belong on the Models tab.

## Where the code lives

| Piece | File |
|---|---|
| Canonical model identity, vendor classification | `src/webview/shared/modelUtils.ts` |
| Payload build, filtered weekly aggregation, faceting | `src/efficiencyAnalysis.ts` |
| Payload wiring (host) | `vscode-extension/src/extension.ts` |
| Controls, status, empty/low-sample states, chart | `vscode-extension/src/webview/efficiency/main.ts` |

Everything after the payload is client-side: changing a filter re-slices data
already in the page. No session file is re-read and no message is posted to the
extension host.
