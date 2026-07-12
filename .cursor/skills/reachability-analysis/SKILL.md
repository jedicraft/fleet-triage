---
name: reachability-analysis
description: >-
  Deterministic vulnerability reachability triage for fleet security alerts.
  Use when analyzing whether a SAST/SCA finding is reachable from a real entry
  point, proposing remediation, and emitting structured triage JSON.
---

# Reachability Analysis

Apply this methodology identically on every repository and every alert. Do not
improvise alternate workflows. Static analysis only — never execute exploits.

## Procedure (strict order)

### 1. Inventory entry points

Enumerate real program entries for this stack:

- HTTP routes / controllers / handlers
- Message/queue consumers and scheduled workers
- CLI commands, management commands, batch scripts wired in production
- Legacy form pages and includes that still serve traffic

Ignore test-only harnesses unless the alert explicitly targets tests.

### 2. Identify the sink

Locate the exact vulnerable API, function, or dependency usage named by the
alert (package version, CWE pattern, file/symbol). Confirm it exists in-tree.

### 3. Trace reachability

Statically connect entry points to the sink via calls, imports, includes, and
obvious data flow (request body/query → helper → sink).

- Record the **call path** as an ordered list of symbols/files.
- If no path from a live entry exists, verdict is `not_reachable`.
- If evidence is incomplete (opaque dynamic dispatch, missing sources), use
  `unknown` — never invent a path.

### 4. Verdict and confidence

| Verdict | When |
|---------|------|
| `reachable` | Concrete path from a live entry to the sink |
| `not_reachable` | Sink exists but only dead/offline/batch-only code with no live entry |
| `unknown` | Cannot confirm either way with available evidence |

Confidence rubric (0–1):

- **0.85–1.0** — Clear static path in a well-supported modern stack
- **0.65–0.84** — Plausible path with minor gaps
- **0.40–0.64** — Legacy or partial evidence; prefer human review if reachable
- **< 0.40** — Thin evidence; prefer `unknown` over a forced boolean

Lower confidence for Classic ASP / VBScript / COBOL-era code is expected and
honest — do not inflate scores.

### 5. Blast radius

Describe impact if exploited: auth boundary, data sensitivity, and whether a
shared library affects multiple consumers. For shared libraries, list known
consumers from README or import graphs.

### 6. Remediation (only if `reachable`)

Propose/implement a fix appropriate to the repo:

- Modern services with tests: fix + run tests
- Monoliths: fix only if reachable; if not reachable, **do not** change prod code
- Legacy / no CI: conservative mitigating fix; require human review

### 7. Validation

Set `validationStatus` honestly:

- `passed` — automated tests ran and passed after fix
- `failed` — tests ran and failed
- `human_review_required` — no reliable automated tests (legacy)
- `not_applicable` — not reachable; no code change
- `skipped` — dry-run or policy forbade mutation

### 8. Emit JSON only

When finished, output **one** JSON object matching the schema in
[reference.md](reference.md). No markdown fences. No prose after the JSON.

## Hard rules

1. Same steps, every repo, every time.
2. No exploit payloads in production code paths.
3. Do not open a PR when verdict is `not_reachable` or `unknown`.
4. Mention that analysis followed the `reachability-analysis` skill in any PR body.
