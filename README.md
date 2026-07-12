# fleet-triage

Orchestrator for **TheCakeIsALieInc** fleet reachability triage — Aperture Labs
security demo. Reads mock scanner webhooks (or a scheduled advisory inbox), fans
out one Cursor SDK agent per alert, applies a shared **reachability-analysis**
skill + policy engine, and renders a live Canvas dashboard.

## Narrative

> Scanners detect. Cursor clears the triage queue.

## Fleet layout

```
TheCakeIsALieInc/
├── portal-api              # TS/Express · cloud · reachable → auto PR
├── fulfillment-monolith    # Django-style · local · not reachable → report only
├── benefits-intranet       # Classic ASP · local · PR + needs-human-review
├── shared-crypto-glados    # Go lib · cloud · blast-radius PR
└── fleet-triage            # Orchestrator (this repo)
```

## Quick start

```bash
cp .env.example .env   # set CURSOR_API_KEY; GITHUB_ORG=TheCakeIsALieInc
npm install
npm run build

# Rehearse without API or GitHub mutations
npm run triage:dry

# Webhook scenarios
npm run triage:a          # live agents (needs API key + pushed repos for cloud)
npm run triage:b

# Scheduled advisory sweep
npm run triage:schedule

# Canvas only from mocks
npm run demo:canvas
```

### Dry-run vs mock

| Flag | Agents | GitHub PRs |
|------|--------|------------|
| `--dry-run` | Live (if no `--mock`) | Suppressed |
| `--mock` | Canned expected results | N/A |
| `--dry-run --mock` | Canned | Suppressed (rehearsal default) |

Clear replay state between full demos:

```bash
rm -rf .triage-state
```

## Fixtures

| Fixture | Alerts |
|---------|--------|
| `scenario-a` | portal lodash + monolith yaml |
| `scenario-b` | Full fleet (4 repos) |
| `scenario-c` | Second wave (redirect, dead eval, cookie) |
| `advisory-inbox/pending` | Schedule: pickle + md5 |

## Policy engine

| Policy id | Action |
|-----------|--------|
| `reachable_validated_auto_pr` | Open PR |
| `not_reachable_report_only` | Report only |
| `reachable_human_review` | PR + `needs-human-review` |
| `unknown_escalate` | Report / escalate |
| `already_handled` | Skip (state store) |

## Reachability skill

Source of truth: `.cursor/skills/reachability-analysis/`. Mirrored into every
seed repo. Injected into every agent prompt for deterministic methodology.

## GitHub setup

1. Create org **TheCakeIsALieInc** in GitHub (required once — see [SETUP-GITHUB.md](SETUP-GITHUB.md)).
2. Ensure `gh auth` can create repos in that org.
3. From this directory:

```bash
npm run setup:repos
```

## Demo runbook

1. `rm -rf .triage-state`
2. `npm run triage:dry` — walk the Canvas (risk delta, policy chips, call paths)
3. Re-run `npm run triage:dry` — show already-handled skips
4. `rm -rf .triage-state && npm run build && node dist/index.js --mode webhook --fixture scenario-c --dry-run --mock`
5. `npm run triage:schedule` with `--dry-run --mock` for backlog drain
6. Live (after org + `npm run setup:repos`):  
   `rm -rf .triage-state && node dist/index.js --mode webhook --fixture scenario-a --dry-run`  
   (live agents, no PRs), then drop `--dry-run` for a real PR on cloud repos.

Canvas output defaults to the Round 2 Cursor canvases folder. Override with
`FLEET_CANVAS_PATH`.
