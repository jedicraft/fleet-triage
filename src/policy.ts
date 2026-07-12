import type {
  PolicyId,
  RepoDefinition,
  SubagentJsonPayload,
  ValidationStatus,
  Verdict,
} from "./types.js";

export function normalizeVerdict(
  payload: SubagentJsonPayload | null
): Verdict {
  if (!payload) return "unknown";
  if (payload.verdict) return payload.verdict;
  if (payload.reachable) return "reachable";
  return "not_reachable";
}

export function resolvePolicy(
  repo: RepoDefinition,
  verdict: Verdict,
  validationStatus: ValidationStatus,
  confidence: number,
  humanReviewRequired: boolean
): PolicyId {
  if (verdict === "unknown") return "unknown_escalate";
  if (verdict === "not_reachable") return "not_reachable_report_only";

  const needsHuman =
    repo.legacy ||
    repo.humanReviewRequired ||
    humanReviewRequired ||
    validationStatus === "human_review_required" ||
    confidence < 0.65;

  if (needsHuman) return "reachable_human_review";

  if (validationStatus === "passed" && repo.autoCreatePR) {
    return "reachable_validated_auto_pr";
  }

  if (repo.autoCreatePR && validationStatus !== "failed") {
    return "reachable_validated_auto_pr";
  }

  return "reachable_human_review";
}

export function shouldOpenPr(policyId: PolicyId, dryRun: boolean): boolean {
  if (dryRun) return false;
  return (
    policyId === "reachable_validated_auto_pr" ||
    policyId === "reachable_human_review"
  );
}

export function policyLabel(policyId: PolicyId): string {
  switch (policyId) {
    case "reachable_validated_auto_pr":
      return "reachable + tests → auto PR";
    case "not_reachable_report_only":
      return "not reachable → report only";
    case "reachable_human_review":
      return "reachable → PR + human review";
    case "unknown_escalate":
      return "unknown → escalate";
    case "already_handled":
      return "already triaged → skip";
  }
}
