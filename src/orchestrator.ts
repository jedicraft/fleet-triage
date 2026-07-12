import type { FleetReport, SubagentTriageResult, WebhookFixture } from "./types.js";
import { REPO_REGISTRY } from "./config.js";
import { aggregateReport } from "./aggregate.js";
import {
  alreadyHandledResult,
  mergePayloadIntoResult,
  mockTriageResult,
} from "./dryRun.js";
import { writeCanvas, writeReportJson } from "./generateCanvas.js";
import { loadAdvisoryInbox, loadFixture } from "./loadFixture.js";
import { logGithubPrereq, runSubagent } from "./runSubagent.js";
import { loadHandledAlertIds, markAlertsHandled } from "./triageState.js";

export interface OrchestratorOptions {
  mode: "webhook" | "schedule";
  fixtureName: string;
  dryRun: boolean;
  mock: boolean;
  canvasOnly: boolean;
  apiKey?: string;
}

async function triageAlerts(
  fixture: WebhookFixture,
  options: OrchestratorOptions
): Promise<{ results: SubagentTriageResult[]; skipped: SubagentTriageResult[]; riskBefore: number }> {
  const handled = await loadHandledAlertIds();
  const pending = fixture.alerts.filter((a) => !handled.has(a.alertId));
  const skipped = fixture.alerts
    .filter((a) => handled.has(a.alertId))
    .map((a) => alreadyHandledResult(a));

  // Each pending alert is an open finding before triage.
  const riskBeforeCount = pending.length;

  if (pending.length === 0) {
    console.log("All alerts already handled — nothing new to triage.\n");
    return { results: [], skipped, riskBefore: 0 };
  }

  if (options.mock || options.canvasOnly) {
    const results = pending.map((alert) => {
      console.log(`[${alert.repoKey}] status=queued → analyzing (mock)`);
      const result = mockTriageResult(alert, fixture, options.dryRun);
      console.log(
        `[${alert.repoKey}] status=verdict reachable=${result.reachable} policy=${result.policyId}`
      );
      return result;
    });
    return { results, skipped, riskBefore: riskBeforeCount };
  }

  if (!options.apiKey) {
    throw new Error("CURSOR_API_KEY is required for live agent runs (omit --mock)");
  }

  for (const alert of pending) {
    logGithubPrereq(alert.repoKey);
  }

  const settled = await Promise.allSettled(
    pending.map(async (alert) => {
      console.log(`[${alert.repoKey}] status=queued alert=${alert.alertId}`);
      return runSubagent(alert, options.apiKey!, options.dryRun);
    })
  );

  const results: SubagentTriageResult[] = settled.map((outcome, index) => {
    if (outcome.status === "fulfilled") return outcome.value;
    const alert = pending[index];
    const repo = REPO_REGISTRY[alert.repoKey];
    const message =
      outcome.reason instanceof Error
        ? outcome.reason.message
        : String(outcome.reason);
    return mergePayloadIntoResult(alert, null, {
      runtime: repo?.runtime ?? "local",
      prAction: "none",
      status: "error",
      error: message,
    });
  });

  return { results, skipped, riskBefore: riskBeforeCount };
}

export async function runOrchestrator(
  options: OrchestratorOptions
): Promise<{ report: FleetReport; reportPath: string; canvasPath: string }> {
  const fixture =
    options.mode === "schedule"
      ? await loadAdvisoryInbox()
      : await loadFixture(options.fixtureName);

  console.log(`\nMode: ${options.mode}`);
  console.log(`Loaded: ${fixture.id} (${fixture.scenario})`);
  console.log(`${fixture.description}`);
  console.log(
    `Flags: dryRun=${options.dryRun} mock=${options.mock || options.canvasOnly}\n`
  );

  const { results, skipped, riskBefore } = await triageAlerts(fixture, options);
  const report = aggregateReport(fixture, results, skipped, {
    mode: options.mode,
    dryRun: options.dryRun,
    riskBefore,
  });

  // Persist handled IDs for successful non-error triage (including dry-run mocks)
  const newlyHandled = results
    .filter((r) => !r.error)
    .map((r) => r.alertId);
  if (newlyHandled.length > 0 && !options.canvasOnly) {
    await markAlertsHandled(newlyHandled);
  }

  const reportPath = await writeReportJson(report);
  const canvasPath = await writeCanvas(report);

  console.log("\n--- Fleet triage complete ---");
  console.log(`Risk before → after: ${report.riskBefore} → ${report.riskAfter}`);
  console.log(`Repos triaged: ${report.summary.reposTriaged}`);
  console.log(`Reachable:     ${report.summary.reachableCount}`);
  console.log(`Not reachable: ${report.summary.notReachableCount}`);
  console.log(`PRs opened:    ${report.summary.prsOpened}`);
  console.log(`Human review:  ${report.summary.humanReviewCount}`);
  console.log(`Already handled: ${report.summary.alreadyHandledCount}`);
  if (report.summary.errors > 0) {
    console.log(`Errors:        ${report.summary.errors}`);
  }
  console.log(`Report JSON:   ${reportPath}`);
  console.log(`Canvas:        ${canvasPath}`);

  return { report, reportPath, canvasPath };
}
