import fs from "node:fs/promises";
import path from "node:path";
import { defaultCanvasPath, reportsDir } from "./config.js";
import { policyLabel } from "./policy.js";
import type { FleetReport, SubagentTriageResult } from "./types.js";

function confidenceLabel(value: number): string {
  if (value >= 0.85) return "High";
  if (value >= 0.65) return "Medium";
  return "Low";
}

function pillTone(result: SubagentTriageResult): "success" | "warning" | "info" | "danger" | "neutral" {
  if (result.error) return "danger";
  if (result.status === "already_handled") return "neutral";
  if (result.reachable && result.humanReviewRequired) return "warning";
  if (result.reachable && (result.prAction === "opened" || result.prAction === "suppressed_dry_run"))
    return "success";
  if (!result.reachable) return "info";
  return "neutral";
}

function rowTone(result: SubagentTriageResult): "success" | "warning" | "info" | "danger" | "neutral" {
  return pillTone(result);
}

function verdictLabel(result: SubagentTriageResult): string {
  if (result.error) return "Error";
  if (result.status === "already_handled") return "Already handled";
  if (result.verdict === "unknown") return "Unknown";
  if (result.reachable && result.humanReviewRequired) return "PR + Human review";
  if (result.reachable && result.prAction === "opened") return "PR opened";
  if (result.reachable && result.prAction === "suppressed_dry_run")
    return "Would open PR (dry-run)";
  if (result.reachable) return "Reachable";
  return "Not reachable";
}

export async function writeReportJson(report: FleetReport): Promise<string> {
  const dir = reportsDir();
  await fs.mkdir(dir, { recursive: true });
  const reportPath = path.join(dir, "latest.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  return reportPath;
}

export async function writeCanvas(report: FleetReport): Promise<string> {
  const canvasPath = defaultCanvasPath();
  await fs.mkdir(path.dirname(canvasPath), { recursive: true });

  const reachable = report.results.filter((r) => r.reachable).length;
  const notReachable = report.results.filter(
    (r) => r.verdict === "not_reachable" && !r.error
  ).length;
  const errors = report.results.filter((r) => r.error).length;

  const pieData = [
    { label: "Reachable", value: reachable, tone: "warning" as const },
    { label: "Not reachable", value: notReachable, tone: "success" as const },
    ...(errors > 0
      ? [{ label: "Errors", value: errors, tone: "danger" as const }]
      : []),
  ].filter((d) => d.value > 0);

  const tableRows = report.results.map((r) => ({
    repo: r.repoName,
    subject: r.testSubject,
    pattern: r.packageOrPattern,
    verdict: verdictLabel(r),
    confidence: `${Math.round(r.confidence * 100)}% (${confidenceLabel(r.confidence)})`,
    policy: policyLabel(r.policyId),
    callPath: r.callPath.length ? r.callPath.join(" → ") : "—",
    blast: r.blastRadius || "—",
    consumers: r.blastRadiusConsumers.join(", ") || "—",
    pr: r.prUrl ?? (r.prAction === "suppressed_dry_run" ? "(dry-run suppressed)" : ""),
    pillTone: pillTone(r),
    rowTone: rowTone(r),
    status: r.status,
  }));

  const skippedRows = report.skipped.map((r) => ({
    alertId: r.alertId,
    repo: r.repoName,
    pattern: r.packageOrPattern,
    policy: policyLabel(r.policyId),
  }));

  const pathCards = report.results
    .filter((r) => r.callPath.length > 0 || r.blastRadiusConsumers.length > 0)
    .map((r) => ({
      repo: r.repoName,
      callPath: r.callPath,
      consumers: r.blastRadiusConsumers,
      blast: r.blastRadius,
    }));

  const content = `import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Link,
  PieChart,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

const report = ${JSON.stringify(report, null, 2)} as const;

const pieData = ${JSON.stringify(pieData, null, 2)};

const tableRows = ${JSON.stringify(tableRows, null, 2)};

const skippedRows = ${JSON.stringify(skippedRows, null, 2)};

const pathCards = ${JSON.stringify(pathCards, null, 2)};

export default function FleetTriageReportCanvas() {
  return (
    <Stack gap={20} style={{ padding: 24, maxWidth: 1120, margin: "0 auto" }}>
      <Stack gap={6}>
        <H1>Fleet Reachability Triage</H1>
        <Text tone="secondary">
          TheCakeIsALieInc · Aperture Labs · scanners detect, Cursor clears the triage queue
        </Text>
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          <Pill tone="info">{report.mode}</Pill>
          {report.dryRun ? <Pill tone="warning">dry-run</Pill> : <Pill tone="success">live</Pill>}
          <Pill tone="neutral">{report.fixtureId}</Pill>
        </Row>
      </Stack>

      <Callout tone="info" title="Shared methodology">
        Every agent followed the reachability-analysis skill (entry points → sink →
        static call path → verdict → policy). Same steps on every repo, every time.
      </Callout>

      <Grid columns={4} gap={12}>
        <Stat value={String(report.riskBefore)} label="Risk before" />
        <Stat
          value={String(report.riskAfter)}
          label="Risk after"
          tone={report.riskAfter < report.riskBefore ? "success" : "warning"}
        />
        <Stat value={String(report.summary.reachableCount)} label="Reachable" tone="warning" />
        <Stat value={String(report.summary.prsOpened)} label="PRs opened" tone="success" />
      </Grid>

      <Text tone="secondary" size="small">
        Source: fleet-triage orchestrator · generated {report.generatedAt} · scenario {report.scenario}
      </Text>

      {pieData.length > 0 ? (
        <Card>
          <CardHeader>Verdict mix</CardHeader>
          <CardBody>
            <PieChart data={pieData} donut />
            <Text tone="secondary" size="small">
              Findings by reachability verdict
            </Text>
          </CardBody>
        </Card>
      ) : null}

      <Stack gap={8}>
        <H2>Triage results</H2>
        <Text tone="secondary">
          Policy chips show the orchestrator rule that decided the action.
        </Text>
        <Table
          headers={["Repo", "Finding", "Verdict", "Confidence", "Policy", "PR"]}
          rows={tableRows.map((r) => [
            <Stack gap={2} key={r.repo + r.pattern}>
              <Text weight="semibold">{r.repo}</Text>
              <Text tone="secondary" size="small">{r.subject}</Text>
            </Stack>,
            r.pattern,
            <Pill key="v" tone={r.pillTone}>{r.verdict}</Pill>,
            r.confidence,
            <Pill key="p" tone="neutral">{r.policy}</Pill>,
            r.pr ? (
              r.pr.startsWith("http") ? (
                <Link href={r.pr} key="pr">{r.pr}</Link>
              ) : (
                <Text key="pr" tone="secondary">{r.pr}</Text>
              )
            ) : (
              "—"
            ),
          ])}
          rowTone={tableRows.map((r) => r.rowTone)}
        />
      </Stack>

      {pathCards.length > 0 ? (
        <Stack gap={10}>
          <H2>Call paths and blast radius</H2>
          <Grid columns={2} gap={12}>
            {pathCards.map((card) => (
              <Card key={card.repo + card.blast}>
                <CardHeader>{card.repo}</CardHeader>
                <CardBody>
                  <Stack gap={8}>
                    {card.callPath.length > 0 ? (
                      <Stack gap={4}>
                        <H3>Call path</H3>
                        <Text>{card.callPath.join(" → ")}</Text>
                      </Stack>
                    ) : null}
                    <Stack gap={4}>
                      <H3>Blast radius</H3>
                      <Text>{card.blast || "—"}</Text>
                      {card.consumers.length > 0 ? (
                        <Text tone="secondary" size="small">
                          Consumers: {card.consumers.join(", ")}
                        </Text>
                      ) : null}
                    </Stack>
                  </Stack>
                </CardBody>
              </Card>
            ))}
          </Grid>
        </Stack>
      ) : null}

      {skippedRows.length > 0 ? (
        <Stack gap={8}>
          <H2>Already handled</H2>
          <Text tone="secondary">
            Replay-safe skip queue — these alert IDs were triaged on a prior run.
          </Text>
          <Table
            headers={["Alert ID", "Repo", "Finding", "Policy"]}
            rows={skippedRows.map((r) => [
              r.alertId,
              r.repo,
              r.pattern,
              <Pill key={r.alertId} tone="neutral">{r.policy}</Pill>,
            ])}
          />
        </Stack>
      ) : null}

      <Divider />

      <Stack gap={4}>
        <H3>Per-repo agent status</H3>
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {report.results.map((r) => (
            <Pill key={r.alertId} tone={pillToneLocal(r)}>
              {r.repoName}: {r.status}
            </Pill>
          ))}
        </Row>
      </Stack>
    </Stack>
  );
}

function pillToneLocal(result: typeof report.results[number]) {
  if (result.error) return "danger" as const;
  if (result.reachable && result.humanReviewRequired) return "warning" as const;
  if (result.reachable) return "success" as const;
  return "info" as const;
}
`;

  // Fix: the generated canvas references pillToneLocal and report in helper -
  // simplify by inlining status pills without helper that closes over types poorly.
  const safeContent = content.replace(
    `function pillToneLocal(result: typeof report.results[number]) {
  if (result.error) return "danger" as const;
  if (result.reachable && result.humanReviewRequired) return "warning" as const;
  if (result.reachable) return "success" as const;
  return "info" as const;
}
`,
    ""
  ).replace(
    `{report.results.map((r) => (
            <Pill key={r.alertId} tone={pillToneLocal(r)}>
              {r.repoName}: {r.status}
            </Pill>
          ))}`,
    `{${JSON.stringify(
      report.results.map((r) => ({
        alertId: r.alertId,
        repoName: r.repoName,
        status: r.status,
        tone: pillTone(r),
      }))
    )}.map((r) => (
            <Pill key={r.alertId} tone={r.tone}>
              {r.repoName}: {r.status}
            </Pill>
          ))}`
  );

  await fs.writeFile(canvasPath, safeContent, "utf8");
  return canvasPath;
}
