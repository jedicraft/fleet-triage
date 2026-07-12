export type RepoRuntime = "local" | "cloud";

export type PolicyId =
  | "reachable_validated_auto_pr"
  | "not_reachable_report_only"
  | "reachable_human_review"
  | "unknown_escalate"
  | "already_handled";

export type Verdict = "reachable" | "not_reachable" | "unknown";

export type AgentStatus =
  | "queued"
  | "analyzing"
  | "verdict"
  | "pr_opened"
  | "skipped"
  | "already_handled"
  | "error";

export interface RepoDefinition {
  key: string;
  displayName: string;
  testSubject: string;
  localDir: string;
  githubName: string;
  runtime: RepoRuntime;
  autoCreatePR: boolean;
  humanReviewRequired: boolean;
  skipReviewerRequest: boolean;
  legacy: boolean;
}

export interface FixtureAlert {
  alertId: string;
  repoKey: string;
  source: string;
  severity: string;
  summary: string;
  identifiers?: {
    cve?: string[];
    cwe?: string[];
    ghsa?: string;
  };
  dependency?: {
    name: string;
    version: string;
    ecosystem: string;
    path?: string;
  };
  pattern?: {
    name: string;
    language: string;
    component: string;
  };
}

export interface WebhookFixture {
  id: string;
  scenario: string;
  description: string;
  delivery: string;
  createdAt: string;
  alerts: FixtureAlert[];
}

export type ValidationStatus =
  | "passed"
  | "failed"
  | "human_review_required"
  | "skipped"
  | "not_applicable";

export interface SubagentJsonPayload {
  repoKey: string;
  repoName: string;
  testSubject: string;
  packageOrPattern: string;
  verdict?: Verdict;
  reachable: boolean;
  confidence: number;
  callPath?: string[];
  blastRadius: string;
  blastRadiusConsumers?: string[];
  remediationSummary: string;
  validationStatus: ValidationStatus;
  humanReviewRequired: boolean;
  policyHint?: PolicyId;
}

export interface SubagentTriageResult {
  alertId: string;
  repoKey: string;
  repoName: string;
  testSubject: string;
  packageOrPattern: string;
  verdict: Verdict;
  reachable: boolean;
  confidence: number;
  callPath: string[];
  blastRadius: string;
  blastRadiusConsumers: string[];
  remediationSummary: string;
  validationStatus: ValidationStatus;
  policyId: PolicyId;
  prUrl?: string;
  prAction: "opened" | "none" | "pending" | "suppressed_dry_run";
  humanReviewRequired: boolean;
  status: AgentStatus;
  agentId?: string;
  runId?: string;
  runtime: RepoRuntime;
  error?: string;
}

export interface FleetReport {
  scenario: string;
  fixtureId: string;
  description: string;
  mode: "webhook" | "schedule";
  dryRun: boolean;
  generatedAt: string;
  alertCount: number;
  riskBefore: number;
  riskAfter: number;
  results: SubagentTriageResult[];
  skipped: SubagentTriageResult[];
  summary: {
    reposTriaged: number;
    reachableCount: number;
    notReachableCount: number;
    prsOpened: number;
    humanReviewCount: number;
    alreadyHandledCount: number;
    errors: number;
  };
}
