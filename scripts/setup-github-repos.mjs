#!/usr/bin/env node
/**
 * Create TheCakeIsALieInc repos (if missing) and push local seed + orchestrator trees.
 *
 * Requires: gh auth, git, org TheCakeIsALieInc (create in GitHub UI first — see SETUP-GITHUB.md).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fleetRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(fleetRoot, "..");
const org = process.env.GITHUB_ORG ?? "TheCakeIsALieInc";

const repos = [
  "portal-api",
  "fulfillment-monolith",
  "benefits-intranet",
  "shared-crypto-glados",
  "fleet-triage",
];

/** Avoid global git config; NTFS mounts often trip dubious-ownership checks. */
function git(cmd, cwd) {
  const full = `git -c safe.directory=* ${cmd}`;
  console.log(`$ ${full}`);
  execSync(full, { cwd, stdio: "inherit" });
}

function run(cmd, cwd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

function orgExists() {
  try {
    execSync(`gh api orgs/${org} --jq .login`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function ensureRepo(name) {
  try {
    execSync(`gh repo view ${org}/${name}`, { stdio: "pipe" });
    console.log(`exists: ${org}/${name}`);
  } catch {
    console.log(`creating: ${org}/${name}`);
    run(
      `gh repo create ${org}/${name} --private --description "TheCakeIsALieInc reachability demo"`,
      workspaceRoot
    );
  }
}

function pushRepo(name) {
  const dir = path.join(workspaceRoot, name);
  if (!fs.existsSync(dir)) {
    throw new Error(`Missing local dir ${dir}`);
  }
  if (!fs.existsSync(path.join(dir, ".git"))) {
    git("init -b main", dir);
  }
  git("add -A", dir);
  try {
    git(
      '-c user.email="demo@thecakeisaliei.inc" -c user.name="Aperture Labs" commit -m "Initial TheCakeIsALieInc reachability demo seed"',
      dir
    );
  } catch {
    console.log(`(no new commit for ${name})`);
  }
  try {
    git("remote remove origin", dir);
  } catch {
    /* none */
  }
  git(`remote add origin https://github.com/${org}/${name}.git`, dir);
  git("push -u origin main", dir);
}

if (!orgExists()) {
  console.error(`
Org '${org}' was not found (or this token lacks org access).

Create it in GitHub (https://github.com/organizations/plan), then re-run:
  npm run setup:repos

See SETUP-GITHUB.md for details.
`);
  process.exit(1);
}

for (const name of repos) {
  ensureRepo(name);
}
for (const name of repos) {
  pushRepo(name);
}

console.log("\nAll repos pushed to", org);
