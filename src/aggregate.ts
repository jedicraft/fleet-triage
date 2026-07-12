import type {
  FleetReport,
  SubagentTriageResult,
  WebhookFixture,
} from "./types.js";

function remainingRisk(results: SubagentTriageResult[]): number {
  return results.filter(
    (r) =>
      r.error ||
      r.verdict === "unknown" ||
      (r.reachable &&
        r.prAction !== "opened" &&
        r.prAction !== "suppressed_dry_run")
  ).length;
}

export function aggregateReport(
  fixture: WebhookFixture,
  results: SubagentTriageResult[],
  skipped: SubagentTriageResult[],
  options: { mode: "webhook" | "schedule"; dryRun: boolean; riskBefore: number }
): FleetReport {
  const active = results.filter((r) => r.status !== "already_handled");

  return {
    scenario: fixture.scenario,
    fixtureId: fixture.id,
    description: fixture.description,
    mode: options.mode,
    dryRun: options.dryRun,
    generatedAt: new Date().toISOString(),
    alertCount: fixture.alerts.length,
    riskBefore: options.riskBefore,
    riskAfter: remainingRisk(active),
    results: active,
    skipped,
    summary: {
      reposTriaged: new Set(active.map((r) => r.repoKey)).size,
      reachableCount: active.filter((r) => r.reachable).length,
      notReachableCount: active.filter(
        (r) => r.verdict === "not_reachable" && !r.error
      ).length,
      prsOpened: active.filter((r) => r.prAction === "opened").length,
      humanReviewCount: active.filter((r) => r.humanReviewRequired).length,
      alreadyHandledCount: skipped.length,
      errors: active.filter((r) => r.error).length,
    },
  };
}
