# CI, release, and deployment workflows

Three workflows live in [`.github/workflows`](../.github/workflows). CI checks
pull requests and `main`; Release turns changesets into versions and git tags;
Deployment turns those tags into platform deploys.

| Workflow   | File          | Trigger                                        | Purpose                              |
| ---------- | ------------- | ---------------------------------------------- | ------------------------------------ |
| CI         | `ci.yaml`     | push / pull request to `main`                  | format, lint, typecheck, test, build |
| Release    | `release.yml` | push to `main`                                 | version PR, then tags                |
| Deployment | `deploy.yml`  | tag push `api@*` / `web@*`, or manual dispatch | deploy the API and the web app       |

## CI (`ci.yaml`)

Runs a single `validate` job on `ubuntu-latest` with a 15 minute timeout:
`format:check`, `lint`, `typecheck`, `test`, `build`. Typecheck writes a dummy
`DATABASE_URL` into `apps/api/.env` so Prisma can resolve its client.

Runs are skipped when the pushed commit author is `github-actions[bot]`, and
concurrency cancels an in-flight run when a new commit lands on the same ref.

## Release (`release.yml`)

Runs on every push to `main`. `changesets/action@v1` opens or updates a
`Version release` pull request; once that PR is merged and no changesets remain,
the action runs `pnpm changeset tag` and creates a GitHub release per tag.

- Versions and tags include the private workspace packages because
  `.changeset/config.json` sets `privatePackages.version` and
  `privatePackages.tag` to `true`.
- `HUSKY=0` is set for the version commit so local hooks do not run.
- The checkout token is `CHANGESET_TOKEN`. It must be a PAT: tags pushed with the
  default `GITHUB_TOKEN` do not trigger the Deployment workflow.
- The repository setting "Allow GitHub Actions to create and approve pull
  requests" must be enabled.

## Deployment (`deploy.yml`)

Triggers on pushes of `api@*` and `web@*` tags, or manually via
`workflow_dispatch` with `target_tag` set to `refs/tags/api@manual` or
`refs/tags/web@manual`. One run at a time; a queued run waits rather than
cancelling.

**`prepare`** checks that the tagged commit is an ancestor of `origin/main` and
resolves which service to deploy by running
[`scripts/ci/resolve-deploy-target.mjs`](../scripts/ci/resolve-deploy-target.mjs)
with `DEPLOY_REF`. It writes `deploy_api` / `deploy_web` job outputs.

**`deploy-api`** runs only when `deploy_api` is `true`:

1. [`scripts/ci/trigger-render.mjs`](../scripts/ci/trigger-render.mjs) posts to
   `RENDER_DEPLOY_HOOK` and writes the returned deploy id to `render_deploy_id`.
2. [`scripts/ci/poll-render.mjs`](../scripts/ci/poll-render.mjs) polls
   `GET /v1/services/{id}/deploys/{deployId}` with `RENDER_API_KEY` until the
   status is `live`, up to 30 attempts at 10 second intervals.

**`deploy-web`** runs when `deploy_web` is `true` and the API job succeeded or was
skipped. It posts to `VERCEL_DEPLOY_HOOK`.

### Release to deploy

1. A pull request containing a changeset merges to `main`.
2. Release opens or updates the `Version release` pull request.
3. Merging that pull request leaves no changesets, so Release runs
   `pnpm changeset tag` and pushes `api@<version>` and `web@<version>`.
4. Each tag starts a Deployment run; `prepare` confirms the tag is on `main`.
5. `deploy-api` triggers and waits for Render; `deploy-web` posts the Vercel hook.

### Required secrets

| Secret               | Used by                   | Notes                                           |
| -------------------- | ------------------------- | ----------------------------------------------- |
| `CHANGESET_TOKEN`    | Release                   | PAT; a `GITHUB_TOKEN` tag push will not deploy. |
| `RENDER_DEPLOY_HOOK` | Deployment (`deploy-api`) | Full deploy hook URL from the Render dashboard. |
| `RENDER_API_KEY`     | Deployment (`deploy-api`) | Read access to the service's deploys.           |
| `RENDER_SERVICE_ID`  | Deployment (`deploy-api`) | `srv-...` id of the API service.                |
| `VERCEL_DEPLOY_HOOK` | Deployment (`deploy-web`) | Deploy hook URL from the Vercel project.        |

### Manual deploy

Run the Deployment workflow from the Actions tab with `target_tag` set to the
package you want to ship. The run deploys `main`, not the tag's commit, because
both platforms build their configured branch.

### Known limitations

- The Render poll budget is five minutes, which is tight for a free-plan build.
- A `202` response from the Render deploy hook carries no deploy id, so a deploy
  that queues behind an in-flight build fails at the poll step.
- `deploy-web` does not wait for or check the Vercel build.
- Migrations are manual; see [deployment.md](./deployment.md).
