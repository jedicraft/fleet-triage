import { REPO_REGISTRY } from "./config.js";
import { normalizeVerdict, resolvePolicy } from "./policy.js";
import type {
  FixtureAlert,
  SubagentJsonPayload,
  SubagentTriageResult,
  WebhookFixture,
} from "./types.js";

export function mergePayloadIntoResult(
  alert: FixtureAlert,
  payload: SubagentJsonPayload | null,
  extras: Partial<SubagentTriageResult> &
    Pick<SubagentTriageResult, "runtime" | "prAction">
): SubagentTriageResult {
  const repo = REPO_REGISTRY[alert.repoKey];
  const verdict = normalizeVerdict(payload);
  const confidence = payload?.confidence ?? 0;
  const validationStatus = payload?.validationStatus ?? "failed";
  const humanReviewRequired =
    payload?.humanReviewRequired ?? repo?.humanReviewRequired ?? false;

  const policyId =
    extras.policyId ??
    (repo
      ? resolvePolicy(
          repo,
          verdict,
          validationStatus,
          confidence,
          humanReviewRequired
        )
      : "unknown_escalate");

  return {
    alertId: alert.alertId,
    repoKey: alert.repoKey,
    repoName: payload?.repoName ?? repo?.displayName ?? alert.repoKey,
    testSubject: payload?.testSubject ?? repo?.testSubject ?? "?",
    packageOrPattern:
      payload?.packageOrPattern ??
      alert.dependency?.name ??
      alert.pattern?.name ??
      alert.summary,
    verdict,
    reachable: verdict === "reachable",
    confidence,
    callPath: payload?.callPath ?? [],
    blastRadius: payload?.blastRadius ?? "",
    blastRadiusConsumers: payload?.blastRadiusConsumers ?? [],
    remediationSummary: payload?.remediationSummary ?? "",
    validationStatus,
    policyId,
    prUrl: extras.prUrl,
    prAction: extras.prAction,
    humanReviewRequired:
      humanReviewRequired || policyId === "reachable_human_review",
    status: extras.status ?? (extras.error ? "error" : "verdict"),
    agentId: extras.agentId,
    runId: extras.runId,
    runtime: extras.runtime,
    error: extras.error,
  };
}

export function mockTriageResult(
  alert: FixtureAlert,
  _fixture: WebhookFixture,
  dryRun: boolean
): SubagentTriageResult {
  const repo = REPO_REGISTRY[alert.repoKey];
  const mocks: Record<string, SubagentJsonPayload> = {
    "alert-portal-lodash": {
      repoKey: "portal-api",
      repoName: "portal-api",
      testSubject: "#042",
      packageOrPattern: "lodash",
      verdict: "reachable",
      reachable: true,
      confidence: 0.93,
      callPath: [
        "POST /api/settings/preferences",
        "settingsRouter",
        "applyPreferenceDefaults",
        "lodash.defaultsDeep",
      ],
      blastRadius: "Unauthenticated prototype pollution of the portal API process",
      blastRadiusConsumers: [],
      remediationSummary: "Upgrade lodash to >=4.17.21 and harden merge inputs",
      validationStatus: dryRun ? "skipped" : "passed",
      humanReviewRequired: false,
      policyHint: "reachable_validated_auto_pr",
    },
    "alert-portal-redirect": {
      repoKey: "portal-api",
      repoName: "portal-api",
      testSubject: "#042",
      packageOrPattern: "open-redirect",
      verdict: "reachable",
      reachable: true,
      confidence: 0.9,
      callPath: ["GET /api/go", "redirectRouter", "res.redirect(next)"],
      blastRadius: "Open redirect for phishing against portal users",
      blastRadiusConsumers: [],
      remediationSummary: "Allowlist redirect targets before res.redirect",
      validationStatus: dryRun ? "skipped" : "passed",
      humanReviewRequired: false,
      policyHint: "reachable_validated_auto_pr",
    },
    "alert-portal-dead-eval": {
      repoKey: "portal-api",
      repoName: "portal-api",
      testSubject: "#042",
      packageOrPattern: "legacy-token-deserialize",
      verdict: "not_reachable",
      reachable: false,
      confidence: 0.88,
      callPath: [],
      blastRadius: "None via HTTP — dead helper not imported",
      blastRadiusConsumers: [],
      remediationSummary: "No production change; document dead code for cleanup backlog",
      validationStatus: "not_applicable",
      humanReviewRequired: false,
      policyHint: "not_reachable_report_only",
    },
    "alert-mono-yaml": {
      repoKey: "fulfillment-monolith",
      repoName: "fulfillment-monolith",
      testSubject: "#017",
      packageOrPattern: "unsafe-yaml-load",
      verdict: "not_reachable",
      reachable: false,
      confidence: 0.91,
      callPath: [],
      blastRadius: "Offline batch only — not exposed on HTTP views",
      blastRadiusConsumers: [],
      remediationSummary: "Report only; optional SafeLoader hardening in batch path later",
      validationStatus: "not_applicable",
      humanReviewRequired: false,
      policyHint: "not_reachable_report_only",
    },
    "alert-mono-pickle": {
      repoKey: "fulfillment-monolith",
      repoName: "fulfillment-monolith",
      testSubject: "#017",
      packageOrPattern: "pickle-cache",
      verdict: "not_reachable",
      reachable: false,
      confidence: 0.9,
      callPath: [],
      blastRadius: "Batch cache helper only — no HTTP route",
      blastRadiusConsumers: [],
      remediationSummary: "Report only",
      validationStatus: "not_applicable",
      humanReviewRequired: false,
      policyHint: "not_reachable_report_only",
    },
    "alert-legacy-sqli": {
      repoKey: "benefits-intranet",
      repoName: "benefits-intranet",
      testSubject: "#003",
      packageOrPattern: "sqli-enrollment",
      verdict: "reachable",
      reachable: true,
      confidence: 0.58,
      callPath: [
        "POST forms/enroll.asp",
        "Request.Form(empId)",
        "SQL string concat",
      ],
      blastRadius: "SQL injection against HR enrollment database",
      blastRadiusConsumers: [],
      remediationSummary: "Mitigating parameterized query + input length checks",
      validationStatus: "human_review_required",
      humanReviewRequired: true,
      policyHint: "reachable_human_review",
    },
    "alert-legacy-cookie": {
      repoKey: "benefits-intranet",
      repoName: "benefits-intranet",
      testSubject: "#003",
      packageOrPattern: "weak-session-cookie",
      verdict: "reachable",
      reachable: true,
      confidence: 0.55,
      callPath: ["login.asp POST", "SetSessionCookie", "Response.Cookies"],
      blastRadius: "Session token theft via non-HttpOnly cookie",
      blastRadiusConsumers: [],
      remediationSummary: "Set HttpOnly and Secure flags on SessionToken cookie",
      validationStatus: "human_review_required",
      humanReviewRequired: true,
      policyHint: "reachable_human_review",
    },
    "alert-crypto-hmac": {
      repoKey: "shared-crypto-glados",
      repoName: "shared-crypto-glados",
      testSubject: "#088",
      packageOrPattern: "insecure-hmac-compare",
      verdict: "reachable",
      reachable: true,
      confidence: 0.92,
      callPath: ["hmac.Equal export", "string =="],
      blastRadius: "Timing side-channel on MAC verify across consumers",
      blastRadiusConsumers: ["portal-api"],
      remediationSummary: "Replace == with subtle.ConstantTimeCompare on decoded bytes",
      validationStatus: dryRun ? "skipped" : "passed",
      humanReviewRequired: false,
      policyHint: "reachable_validated_auto_pr",
    },
    "alert-crypto-md5": {
      repoKey: "shared-crypto-glados",
      repoName: "shared-crypto-glados",
      testSubject: "#088",
      packageOrPattern: "md5-token",
      verdict: "reachable",
      reachable: true,
      confidence: 0.9,
      callPath: ["TokenMD5 export", "md5.Sum"],
      blastRadius: "Weak token hash used by library consumers",
      blastRadiusConsumers: ["portal-api"],
      remediationSummary: "Deprecate TokenMD5; migrate callers to SHA-256",
      validationStatus: dryRun ? "skipped" : "passed",
      humanReviewRequired: false,
      policyHint: "reachable_validated_auto_pr",
    },
  };

  const payload = mocks[alert.alertId] ?? {
    repoKey: alert.repoKey,
    repoName: repo?.displayName ?? alert.repoKey,
    testSubject: repo?.testSubject ?? "?",
    packageOrPattern: alert.summary,
    verdict: "unknown" as const,
    reachable: false,
    confidence: 0.3,
    callPath: [],
    blastRadius: "Unknown",
    blastRadiusConsumers: [],
    remediationSummary: "No mock mapped for this alertId",
    validationStatus: "skipped" as const,
    humanReviewRequired: false,
    policyHint: "unknown_escalate" as const,
  };

  const policyId =
    repo
      ? resolvePolicy(
          repo,
          payload.verdict ?? "unknown",
          payload.validationStatus,
          payload.confidence,
          payload.humanReviewRequired
        )
      : "unknown_escalate";

  const wouldOpen =
    policyId === "reachable_validated_auto_pr" ||
    policyId === "reachable_human_review";

  return mergePayloadIntoResult(alert, payload, {
    runtime: repo?.runtime ?? "local",
    prAction: dryRun
      ? wouldOpen
        ? "suppressed_dry_run"
        : "none"
      : wouldOpen
        ? "opened"
        : "none",
    prUrl:
      !dryRun && wouldOpen
        ? `https://github.com/TheCakeIsALieInc/${repo?.githubName}/pull/1`
        : undefined,
    status: "verdict",
    policyId,
  });
}

export function alreadyHandledResult(
  alert: FixtureAlert
): SubagentTriageResult {
  const repo = REPO_REGISTRY[alert.repoKey];
  return {
    alertId: alert.alertId,
    repoKey: alert.repoKey,
    repoName: repo?.displayName ?? alert.repoKey,
    testSubject: repo?.testSubject ?? "?",
    packageOrPattern:
      alert.dependency?.name ?? alert.pattern?.name ?? alert.summary,
    verdict: "not_reachable",
    reachable: false,
    confidence: 1,
    callPath: [],
    blastRadius: "",
    blastRadiusConsumers: [],
    remediationSummary: "Skipped — alert already triaged",
    validationStatus: "skipped",
    policyId: "already_handled",
    prAction: "none",
    humanReviewRequired: false,
    status: "already_handled",
    runtime: repo?.runtime ?? "local",
  };
}
