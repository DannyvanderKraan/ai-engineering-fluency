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
- It does **not** yet have a guided input UI. See [Current limitation](#current-limitation) below.

## Data model

| Type | What it represents |
|---|---|
| `AesWorkflowAssessment` | The whole self-assessment: workflow identity, outcome, activities, modes, stocks, optional supporting evidence and notes. `schemaVersion` allows safe migration as the shape evolves. |
| `AesWorkflowIdentity` | The named workflow being assessed and the repositories it spans. |
| `AesActivityAssessment` / `AesModeAssessment` / `AesStockAssessment` | Team-reported description, delegation level or rating, plus the evidence behind it. |
| `AesSupportingEvidence` | A Dark Factory control observation attached as evidence for one activity or stock — never an automatic conclusion. |
| `AesPosture` | The four Stock-Adoption matrix quadrants, plus `unclear` when a stock rating is missing. |
| `AesWorkflowReport` | The computed, read-only view: the assessment plus its derived posture and guidance. |

All defined in `src/types.ts` (`AES_ASSESSMENT_SCHEMA_VERSION` and `Aes*` types).

## Where the code lives

| Concern | File |
|---|---|
| Types | `src/types.ts` (`Aes*`) |
| Posture classification and report assembly — **pure**, no filesystem or network access | `src/aesWorkflowAssessment.ts` |
| Plain-text and HTML report rendering — **pure** | `src/aesWorkflowReportRenderer.ts` |
| Fictional example assessment ("FableCart") | `src/aesFableCartFixture.ts` |
| CLI command | `cli/src/commands/aes.ts` |

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

## The FableCart fixture

`src/aesFableCartFixture.ts` is a fully-populated, **fictional** assessment for a made-up workflow
("Order status API") that deliberately spans two fictional repositories
(`fablecart/order-service` and `fablecart/storefront-web`) — illustrating why AES assesses a
*workflow*, not a repository. It reads as `stretched-agent-native`: agent-performed, reviewed
delivery already exists, but the customer-value stock is weak (support-ticket impact is never
closed back to the fix), and no independent evaluator agent exists to assess agent-authored
changes. It exists purely to prove the data model and rendering end-to-end; no such company exists.

## Current limitation

There is no guided assessment UI yet — the `aes` command reads either the FableCart fixture or a
hand-authored JSON file via `--file`. A guided VS Code view (asking a team for the intended outcome,
the three activities, participation modes, delegation limits, assessment evidence and post-release
signals) and a GitHub Agentic Workflow that drafts findings from supplied evidence are the natural
next steps, once this first, smaller PR (schema, fixture, pure report generator, CLI command) has
proven the model and output format.

## Limitations inherited from Dark Factory Readiness

Any `AesSupportingEvidence` sourced from the Dark Factory scan carries the same evidence gaps that
scan has today — most notably that **its GitHub API tier is not implemented yet**, so rulesets,
required reviews, environment protection and scanning enablement all resolve to `unknown` there.
Attaching that evidence to an AES assessment does not fix the gap; it surfaces it, exactly as the
Dark Factory report does. See `docs/features/DARK-FACTORY-READINESS.md`.
