# GitHub org setup (TheCakeIsALieInc)

The orchestrator and cloud agents expect repositories under:

`https://github.com/TheCakeIsALieInc/{portal-api,fulfillment-monolith,benefits-intranet,shared-crypto-glados,fleet-triage}`

## One-time: create the org

GitHub does not allow creating organizations with the default `gh` token scopes from this environment. Create the org in the browser:

1. Open https://github.com/organizations/plan
2. Create organization named **TheCakeIsALieInc**
3. Add your user as an owner

Optional token refresh if `gh repo create org/name` still fails:

```bash
gh auth refresh -h github.com -s repo,read:org,workflow
```

## Push all demo repos

From `fleet-triage/`:

```bash
npm run setup:repos
```

This creates missing repos and pushes local `main` for all five trees.

## Verify

```bash
gh repo list TheCakeIsALieInc
```
