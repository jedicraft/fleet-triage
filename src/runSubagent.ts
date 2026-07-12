import { Agent, CursorAgentError } from "@cursor/sdk";
import {
  GITHUB_ORG,
  REPO_REGISTRY,
  githubRepoUrl,
  localRepoPath,
} from "./config.js";
import { mergePayloadIntoResult } from "./dryRun.js";
import { extractJsonPayload } from "./parseResult.js";
import { shouldOpenPr } from "./policy.js";
import { buildSubagentPrompt } from "./prompts.js";
import { loadReachabilitySkillBody } from "./skillLoader.js";
import type { FixtureAlert, SubagentTriageResult } from "./types.js";

export async function runSubagent(
  alert: FixtureAlert,
  apiKey: string,
  dryRun: boolean
): Promise<SubagentTriageResult> {
  const repo = REPO_REGISTRY[alert.repoKey];
  if (!repo) {
    return mergePayloadIntoResult(alert, null, {
      runtime: "local",
      prAction: "none",
      status: "error",
      error: `Unknown repoKey: ${alert.repoKey}`,
    });
  }

  const skillBody = await loadReachabilitySkillBody();
  const prompt = buildSubagentPrompt(repo, alert, skillBody, dryRun);
  const cwd = localRepoPath(repo);
  const allowPr = !dryRun && repo.autoCreatePR;

  try {
    await using agent = await Agent.create({
      apiKey,
      model: { id: "composer-2.5" },
      ...(repo.runtime === "cloud"
        ? {
            cloud: {
              repos: [{ url: githubRepoUrl(repo), startingRef: "main" }],
              autoCreatePR: allowPr,
              skipReviewerRequest: repo.skipReviewerRequest,
            },
          }
        : {
            local: {
              cwd,
              settingSources: ["project"],
            },
          }),
    });

    const run = await agent.send(prompt);
    console.log(
      `[${repo.displayName}] status=analyzing agent=${agent.agentId} run=${run.id} runtime=${repo.runtime} dryRun=${dryRun}`
    );

    let assistantText = "";
    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "text") {
            process.stdout.write(block.text);
            assistantText += block.text;
          }
        }
      }
    }

    const result = await run.wait();
    if (result.status === "error") {
      return mergePayloadIntoResult(alert, null, {
        agentId: agent.agentId,
        runId: run.id,
        runtime: repo.runtime,
        prAction: "none",
        status: "error",
        error: `Run failed (status=error) for ${repo.displayName}`,
      });
    }

    const payload = extractJsonPayload(assistantText);
    const prUrl = result.git?.branches?.find((b) => b.prUrl)?.prUrl;
    const merged = mergePayloadIntoResult(alert, payload, {
      agentId: agent.agentId,
      runId: run.id,
      runtime: repo.runtime,
      prUrl,
      prAction: "none",
      status: "verdict",
    });

    if (dryRun) {
      merged.prAction = shouldOpenPr(merged.policyId, false)
        ? "suppressed_dry_run"
        : "none";
      merged.prUrl = undefined;
      if (merged.validationStatus === "passed") {
        merged.validationStatus = "skipped";
      }
    } else if (prUrl && shouldOpenPr(merged.policyId, false)) {
      merged.prAction = "opened";
      merged.status = "pr_opened";
    } else if (shouldOpenPr(merged.policyId, false) && !prUrl) {
      merged.prAction = "pending";
    } else {
      merged.prAction = "none";
    }

    return merged;
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return mergePayloadIntoResult(alert, null, {
        runtime: repo.runtime,
        prAction: "none",
        status: "error",
        error: `Startup failed: ${err.message} (retryable=${err.isRetryable})`,
      });
    }
    throw err;
  }
}

export function logGithubPrereq(repoKey: string): void {
  const repo = REPO_REGISTRY[repoKey];
  if (!repo || repo.runtime !== "cloud") return;
  console.log(
    `[${repo.displayName}] cloud mode requires ${githubRepoUrl(repo)} on GitHub (org: ${GITHUB_ORG})`
  );
}
