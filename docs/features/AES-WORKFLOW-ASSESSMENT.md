# AES Workflow Assessment — a team's self-assessment, not a scan

The **`aes` CLI command** renders a team's self-assessment of one delivery workflow against
[GitHub's Agentic Engineering System (AES)](https://github.blog/) framework: three "stocks"
(governance, shared knowledge, customer value) that shape system health over time, three
"activities" (define, deliver, detect) that move work through the system, and three "modes"
(director, performer, assessor) that describe how people and agents contribute.

This is intentionally a **third, separate lens**, alongside the two assessments this repository
already has:

| Lens | Unit of assessment | Where the data comes from |
|---|---|---|
| **Fluency Score** | An individual | Local session logs |
| **Dark Factory Readiness** | A repository | Filesystem + (future) GitHub API scan |
| **AES Workflow Assessment** | A named workflow, which may span several repositories | The team's own answers |

They are never combined into one "AI readiness" score. A workflow crossing several repositories
cannot be answered by a per-repository scan, and questions like "what outcome does this serve" and
"who directs, performs and assesses it" are not observable from files at all — they need a team to
answer them.

## The AES framework, briefly

- **Stocks** — governance, shared knowledge and customer value are what accumulate (or erode) over
  each cycle. Strong stocks let a team delegate more work to agents with confidence; weak stocks
  mean delegation produces fast, confident mistakes instead.
- **Activities** — *define* (decide what should happen), *deliver* (make the change) and *detect*
  (observe what happened) repeat in a loop. What changes between cycles is not the activity, but the
  surrounding governance, shared knowledge, and who — human or agent — is doing the work.
- **Modes** — *director* (sets intent, scope, constraints), *performer* (carries out the work) and
  *assessor* (evaluates the result) describe participation, not job titles. The same person or agent
  can hold different modes across the same activity.
- **The Stock-Adoption matrix** — plots current agent delegation depth against the strength of
  governance and shared knowledge, giving four postures: *healthy agent-native*, *healthy but
  underused*, *underdeveloped foundations*, and *stretched agent-native* (delegating faster than the
  foundations support — the risky, misaligned state). The matrix shows **direction, not a
  threshold to pass**.

## What this feature does *not* do

- It does **not** scan anything. Every stock rating, activity description and mode assignment is
  team-reported.
- It does **not** produce an individual score. `assessedBy` names a team or role, never a person's
  performance.
- It does **not** turn a Dark Factory control observation into an AES conclusion. A Dark Factory
  observation can be attached as {@link AesSupportingEvidence} — e.g. "CI runs your test suite" as
  evidence for the `deliver` activity — but its `present` / `absent` / `unknown` state is carried
  through unchanged, and the AES answer stays whatever the team reported.
- It does **not** yet have a guided input UI. The VS Code section below renders a report; it does
  not yet let a team author one. See [Current limitation](#current-limitation) below.

## Data model

| Type | What it represents |
|---|---|
| `AesWorkflowAssessment` | The whole self-assessment: workflow identity, outcome, activities, modes, stocks, required `decision`, optional supporting evidence and notes. `schemaVersion` allows safe migration as the shape evolves. |
| `AesWorkflowIdentity` | The named workflow being assessed and the repositories it spans. |
| `AesActivityAssessment` / `AesModeAssessment` / `AesStockAssessment` | Team-reported description, delegation level or rating, plus the evidence behind it and whether that rating was actually checked (`confidence`). |
| `AesWorkflowDecision` | The assessment's conclusion: what to delegate now, what to defer, the top actions to take, and what evidence would justify revisiting the decision. |
| `AesSupportingEvidence` | A Dark Factory control observation attached as evidence for one activity or stock — never an automatic conclusion. |
| `AesConfidence` | Whether a stock rating was actually checked (`verified`) or carried forward unconfirmed (`unverified`, the conservative default). |
| `AesPosture` | The four Stock-Adoption matrix quadrants, plus `unclear` when a stock rating is missing. |
| `AesWorkflowReport` | The computed, read-only view: the assessment plus its derived posture, `postureConfidence`, and guidance. |

All defined in `src/types.ts` (`AES_ASSESSMENT_SCHEMA_VERSION` and `Aes*` types).

### Schema v2: a required decision, and rating confidence

`AES_ASSESSMENT_SCHEMA_VERSION` is now `2`. Two things changed from v1:

- `AesWorkflowAssessment.decision` (`AesWorkflowDecision`) is now **required**. Earlier feedback on
  this feature pointed out that a report describing stocks, activities and modes still left a team
  without an answer to "so what do we do now?" — the decision block forces every assessment to state
  what can be delegated today, what is deferred, the top actions, and the evidence that would
  justify reconsidering.
- `AesStockAssessment.confidence` (`AesConfidence`, optional) distinguishes a rating a team actually
  checked (`verified`) from one carried forward without confirming it (`unverified`, the default
  when the field is absent). `buildAesWorkflowReport()` derives `postureConfidence` from this: the
  posture reads as confirmed only when **every** stock is `verified`. Otherwise the displayed label
  is prefixed — e.g. `"Possible stretched agent-native — confirmation needed"` — rather than stating
  a posture more confidently than the evidence behind it supports. This keeps the same honesty rule
  the feature already applies to Dark Factory's `unknown` evidence: a rating nobody checked is a
  lead to verify, not a finding to act on.

## Where the code lives

| Concern | File |
|---|---|
| Types | `src/types.ts` (`Aes*`) |
| Posture classification and report assembly — **pure**, no filesystem or network access | `src/aesWorkflowAssessment.ts` |
| Shared display labels (stocks, activities, modes, ratings, postures) | `src/aesLabels.ts` |
| Plain-text and HTML report rendering — **pure** | `src/aesWorkflowReportRenderer.ts` |
| Fictional example assessment ("FableCart") | `src/aesFableCartFixture.ts` |
| CLI command | `cli/src/commands/aes.ts` |
| Fluency Score webview section — **pure** HTML string building | `vscode-extension/src/webview/maturity/aesSection.ts` |

## Using the CLI command

```bash
# Render the fictional FableCart example (no real assessment yet)
ai-engineering-fluency aes

# Render a real assessment saved as JSON (matching AesWorkflowAssessment)
ai-engineering-fluency aes --file ./my-workflow-assessment.json

# Machine-readable output
ai-engineering-fluency aes --json

# Also write a self-contained HTML report
ai-engineering-fluency aes --html ./aes-report.html
```

## In the VS Code Fluency Score view

The Fluency Score view (`AI Engineering Fluency: Show Fluency Score`) now renders an **AES Workflow
Assessment** section below Dark Factory Readiness. It uses the same pure `buildAesWorkflowReport()`
and label logic as the CLI, so the report a team sees in VS Code and the one generated by
`aes --html` never disagree. A **Decision and next experiment** block is shown directly under the
posture banner, before the stock/activity/mode detail — what to delegate now, what is deferred, the
top actions, and the evidence that would justify reconsidering — so the section reads as a decision
a team can act on, not only a description of where they stand.

There is still no in-product way to author a real assessment, so — exactly like the CLI's default —
this section always renders the fictional FableCart fixture, clearly labelled as an example with a
pointer to the `aes --file <path>` command for rendering a real one. This proves the report format
is usable inside the extension while the guided authoring view (see below) is designed.

## The FableCart fixture

`src/aesFableCartFixture.ts` is a fully-populated, **fictional** assessment for a made-up workflow
("Order status API") that deliberately spans two fictional repositories
(`fablecart/order-service` and `fablecart/storefront-web`) — illustrating why AES assesses a
*workflow*, not a repository. It reads as `stretched-agent-native`: agent-performed, reviewed
delivery already exists, but the customer-value stock is weak (support-ticket impact is never
closed back to the fix), and no independent evaluator agent exists to assess agent-authored
changes. Its governance stock is deliberately marked `confidence: 'unverified'`, since that rating
rests partly on a deployment-approval process and a code-scanning status nobody actually checked —
so the fixture's displayed posture reads as **"Possible stretched agent-native — confirmation
needed"**, not a confirmed verdict. It also carries a `decision`: continue small, bounded
agent-drafted fixes with human review; defer broader autonomous responsibility until the storefront
contract is documented, the unverified controls are checked, and releases are connected to the
support-ticket trend. It exists purely to prove the data model and rendering end-to-end; no such
company exists.

## Current limitation

There is no guided assessment-authoring UI yet — the `aes` CLI command and the VS Code Fluency
Score section both read either the FableCart fixture or a hand-authored JSON file (`--file` for the
CLI; the webview section is fixture-only for now). A guided VS Code view (asking a team for the
intended outcome, the three activities, participation modes, delegation limits, assessment evidence
and post-release signals) and a GitHub Agentic Workflow that drafts findings from supplied evidence
are the natural next steps, once this first, smaller PR (schema, fixture, pure report generator, CLI
command, read-only webview section) has proven the model and output format.

## Limitations inherited from Dark Factory Readiness

Any `AesSupportingEvidence` sourced from the Dark Factory scan carries the same evidence gaps that
scan has today — most notably that **its GitHub API tier is not implemented yet**, so rulesets,
required reviews, environment protection and scanning enablement all resolve to `unknown` there.
Attaching that evidence to an AES assessment does not fix the gap; it surfaces it, exactly as the
Dark Factory report does. See `docs/features/DARK-FACTORY-READINESS.md`.
