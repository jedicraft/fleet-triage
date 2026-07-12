import type { FixtureAlert, RepoDefinition } from "./types.js";

function formatIdentifiers(alert: FixtureAlert): string {
  const parts: string[] = [];
  if (alert.dependency) {
    parts.push(
      `${alert.dependency.name}@${alert.dependency.version} (${alert.dependency.ecosystem})`
    );
  }
  if (alert.pattern) {
    parts.push(`${alert.pattern.component} (${alert.pattern.language})`);
  }
  if (alert.identifiers?.cve?.length) {
    parts.push(`CVE: ${alert.identifiers.cve.join(", ")}`);
  }
  if (alert.identifiers?.cwe?.length) {
    parts.push(`CWE: ${alert.identifiers.cwe.join(", ")}`);
  }
  return parts.join(" | ");
}

export function buildSubagentPrompt(
  repo: RepoDefinition,
  alert: FixtureAlert,
  skillBody: string,
  dryRun: boolean
): string {
  const packageOrPattern =
    alert.dependency?.name ?? alert.pattern?.name ?? alert.summary;

  const validationInstructions = repo.legacy
    ? `Validation: this Classic ASP repo cannot be compiled or tested on Linux.
- If reachable, propose a conservative mitigating fix (parameterized SQL / safer cookies).
- Set validationStatus to "human_review_required".
- Open a PR labeled needs-human-review when not in dry-run.`
    : repo.key === "fulfillment-monolith"
      ? `Validation: run pytest if available. If not reachable, do NOT change production code or open a PR.
- Set validationStatus to "not_applicable" when unreachable.`
      : repo.key === "shared-crypto-glados"
        ? `Validation: run go test ./... after any fix. Prefer constant-time compare and stronger hashes.
- Set validationStatus to "passed" only if tests pass.
- Call out blastRadiusConsumers including portal-api.`
        : `Validation: run npm test after any fix. Tests must pass before opening a PR.
- Set validationStatus to "passed" only if tests pass.`;

  const prInstructions = dryRun
    ? `DRY-RUN MODE: analyze and report only. Do NOT create branches, commits, or pull requests. Set validationStatus to "skipped" if you would have opened a PR.`
    : repo.autoCreatePR
      ? repo.humanReviewRequired || repo.legacy
        ? `If reachable: open a PR with methodology note ("analyzed per reachability-analysis skill"), call path, and label needs-human-review.`
        : `If reachable and validation passed: open a PR with remediation rationale and methodology note in the description.`
      : `Do NOT open a PR for this repo. Report findings only.`;

  return `You are a fleet vulnerability triage subagent for Aperture Labs Test Subject ${repo.testSubject} (${repo.displayName}).

You MUST follow the reachability-analysis skill below exactly — same methodology every time.

===== BEGIN REACHABILITY-ANALYSIS SKILL =====
${skillBody}
===== END REACHABILITY-ANALYSIS SKILL =====

SECURITY ALERT (mock Dependabot/SAST payload):
- Alert ID: ${alert.alertId}
- Severity: ${alert.severity}
- Summary: ${alert.summary}
- Target: ${formatIdentifiers(alert)}

Your job — in order (skill procedure):
1. REACHABILITY per skill
2. REMEDIATION only if reachable
3. VALIDATION: ${validationInstructions}

PR policy:
${prInstructions}

When finished, reply with ONLY a JSON object (no markdown fences) matching the skill schema, including:
{
  "repoKey": "${repo.key}",
  "repoName": "${repo.displayName}",
  "testSubject": "${repo.testSubject}",
  "packageOrPattern": "${packageOrPattern}",
  "verdict": "reachable" | "not_reachable" | "unknown",
  "reachable": boolean,
  "confidence": number,
  "callPath": ["..."],
  "blastRadius": "string",
  "blastRadiusConsumers": [],
  "remediationSummary": "string",
  "validationStatus": "passed" | "failed" | "human_review_required" | "skipped" | "not_applicable",
  "humanReviewRequired": boolean,
  "policyHint": "reachable_validated_auto_pr" | "not_reachable_report_only" | "reachable_human_review" | "unknown_escalate"
}

Read the repository README and seeded vulnerability documentation before analyzing.`;
}
