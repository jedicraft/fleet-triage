import path from "node:path";
import dotenv from "dotenv";
import { FLEET_TRIAGE_ROOT, WORKSPACE_ROOT } from "./config.js";
import { runOrchestrator } from "./orchestrator.js";

dotenv.config({ path: path.join(FLEET_TRIAGE_ROOT, ".env") });
dotenv.config({ path: path.join(WORKSPACE_ROOT, ".env") });

function parseArgs(argv: string[]) {
  let mode: "webhook" | "schedule" = "webhook";
  let fixtureName = "scenario-b";
  let dryRun = false;
  let mock = false;
  let canvasOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--mode" && argv[i + 1]) {
      const value = argv[++i];
      if (value === "webhook" || value === "schedule") mode = value;
    } else if (arg === "--fixture" && argv[i + 1]) {
      fixtureName = argv[++i];
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--mock") {
      mock = true;
    } else if (arg === "--canvas-only") {
      dryRun = true;
      mock = true;
      canvasOnly = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return { mode, fixtureName, dryRun, mock, canvasOnly };
}

function printHelp() {
  console.log(`TheCakeIsALieInc fleet reachability triage orchestrator

Usage:
  node dist/index.js [options]

Options:
  --mode webhook|schedule   Trigger mode (default: webhook)
  --fixture <name>          Fixture name for webhook mode (default: scenario-b)
  --dry-run                 Do not open GitHub PRs / mutate remotes
  --mock                    Use canned triage results (no Cursor API calls)
  --canvas-only             Mock + dry-run; regenerate Canvas only (no state write skip if canvas-only)
  -h, --help                Show help

Examples:
  npm run triage:dry
  npm run triage:a
  npm run triage:schedule
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.CURSOR_API_KEY;

  if (!args.mock && !args.canvasOnly && !apiKey) {
    console.error(
      "CURSOR_API_KEY is not set. Add it to .env, or pass --mock / --dry-run --mock."
    );
    process.exit(1);
  }

  await runOrchestrator({
    ...args,
    apiKey,
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
