import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RepoDefinition } from "./types.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const FLEET_TRIAGE_ROOT = path.resolve(moduleDir, "..");
export const WORKSPACE_ROOT = path.resolve(FLEET_TRIAGE_ROOT, "..");

export const GITHUB_ORG = process.env.GITHUB_ORG ?? "TheCakeIsALieInc";

export const REPO_REGISTRY: Record<string, RepoDefinition> = {
  "portal-api": {
    key: "portal-api",
    displayName: "portal-api",
    testSubject: "#042",
    localDir: "portal-api",
    githubName: "portal-api",
    runtime: "cloud",
    autoCreatePR: true,
    humanReviewRequired: false,
    skipReviewerRequest: true,
    legacy: false,
  },
  "fulfillment-monolith": {
    key: "fulfillment-monolith",
    displayName: "fulfillment-monolith",
    testSubject: "#017",
    localDir: "fulfillment-monolith",
    githubName: "fulfillment-monolith",
    runtime: "local",
    autoCreatePR: false,
    humanReviewRequired: false,
    skipReviewerRequest: true,
    legacy: false,
  },
  "benefits-intranet": {
    key: "benefits-intranet",
    displayName: "benefits-intranet",
    testSubject: "#003",
    localDir: "benefits-intranet",
    githubName: "benefits-intranet",
    runtime: "local",
    autoCreatePR: true,
    humanReviewRequired: true,
    skipReviewerRequest: true,
    legacy: true,
  },
  "shared-crypto-glados": {
    key: "shared-crypto-glados",
    displayName: "shared-crypto-glados",
    testSubject: "#088",
    localDir: "shared-crypto-glados",
    githubName: "shared-crypto-glados",
    runtime: "cloud",
    autoCreatePR: true,
    humanReviewRequired: false,
    skipReviewerRequest: true,
    legacy: false,
  },
};

export function localRepoPath(repo: RepoDefinition): string {
  return path.resolve(WORKSPACE_ROOT, repo.localDir);
}

export function githubRepoUrl(repo: RepoDefinition): string {
  return `https://github.com/${GITHUB_ORG}/${repo.githubName}`;
}

export function fixturesDir(): string {
  return path.join(FLEET_TRIAGE_ROOT, "fixtures");
}

export function advisoryInboxDir(): string {
  return path.join(FLEET_TRIAGE_ROOT, "advisory-inbox");
}

export function reportsDir(): string {
  return path.join(FLEET_TRIAGE_ROOT, "reports");
}

export function triageStateDir(): string {
  return path.join(FLEET_TRIAGE_ROOT, ".triage-state");
}

export function skillDir(): string {
  return path.join(
    FLEET_TRIAGE_ROOT,
    ".cursor",
    "skills",
    "reachability-analysis"
  );
}

export function defaultCanvasPath(): string {
  if (process.env.FLEET_CANVAS_PATH) {
    return path.resolve(process.env.FLEET_CANVAS_PATH);
  }
  return path.join(
    "/home/jedicraft/.cursor/projects/ntfs-Documents-Cursor-Projects-InfoSec-Proj-Round-2/canvases",
    "fleet-triage-report.canvas.tsx"
  );
}
