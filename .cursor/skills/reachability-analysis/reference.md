# Reachability Analysis — Reference

## JSON result schema

Agents must emit exactly one object:

```json
{
  "repoKey": "string",
  "repoName": "string",
  "testSubject": "string",
  "packageOrPattern": "string",
  "verdict": "reachable | not_reachable | unknown",
  "reachable": true,
  "confidence": 0.0,
  "callPath": ["ENTRY", "handler", "sink"],
  "blastRadius": "string",
  "blastRadiusConsumers": ["optional-repo-or-service"],
  "remediationSummary": "string",
  "validationStatus": "passed | failed | human_review_required | skipped | not_applicable",
  "humanReviewRequired": false,
  "policyHint": "reachable_validated_auto_pr | not_reachable_report_only | reachable_human_review | unknown_escalate"
}
```

Notes:

- `reachable` must be `true` only when `verdict` is `reachable`.
- `callPath` is `[]` when not reachable; never fabricate hops.
- `policyHint` is the agent's suggestion; the orchestrator policy engine is authoritative.

## Policy hint mapping

| Situation | policyHint |
|-----------|------------|
| Reachable, tests passed, non-legacy | `reachable_validated_auto_pr` |
| Not reachable | `not_reachable_report_only` |
| Reachable + legacy / low confidence / no tests | `reachable_human_review` |
| Unknown | `unknown_escalate` |

## Entry-point cheat sheet by stack

| Stack | Look for |
|-------|----------|
| Express/TS | `app.use`, `router.`, `app.get/post/...` |
| Django | `urls.py`, views, `management/commands/` |
| Classic ASP | `*.asp` form posts, `#include` |
| Go library | exported funcs; consumers listed in README |
