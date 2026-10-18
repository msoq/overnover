# overnover

Turn your own study material into exercises. Upload notes, a worksheet, a screenshot or just describe a topic; the app writes exercises, checks your typed answers (exact match first, then an AI double-check), explains mistakes and brings them back for review on a 1/3/7/14-day schedule. Progress lives in a spreadsheet in each user's own Google Drive.

What was agreed and why: [docs/requirements.md](docs/requirements.md).

## Layout

| Path | What |
| --- | --- |
| `apps/web` | React Router 7 single-page app, deployed to Cloudflare Pages. Talks to Google Sheets directly from the browser. |
| `apps/api` | Hono on a Cloudflare Worker. Passes AI calls to OpenRouter so the key stays secret. No database, no auth. |
| `packages/core` | Shared types, answer matching, the diff for small slips, the review schedule. |
| `infra` | OpenTofu: the Pages project and an optional custom domain, one state per environment in R2. |
| `.github/workflows` | Push to `dev` deploys the dev environment; push to `main` deploys prod. |

## Run it locally

Needs Node 22 and pnpm 10.

```sh
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars   # set MOCK_AI=1, or put a real OPENROUTER_API_KEY
pnpm dev                                          # API on :8787, web on :5173
```

Open http://localhost:5173. Without a Google client ID, progress is kept in the browser instead of a spreadsheet. To try the Google Sheets storage locally, create `apps/web/.env.local` with `VITE_GOOGLE_CLIENT_ID=...` (see `apps/web/.env.example`).

With `MOCK_AI=1` the API returns canned exercises. In the mock, answering `typo` counts as a small slip and any other wrong answer gets mock feedback.

Checks: `pnpm check` (Biome), `pnpm typecheck`, `pnpm test`.

## Branches and deploys

- Work on `dev`. Every push to `dev` deploys to the dev Cloudflare account: `overnover-api-dev` Worker and `overnover-dev` Pages project.
- `pnpm deploy:prod` merges `dev` into `main` and pushes, which deploys to the prod account: `overnover-api` Worker and `overnover-prod` Pages project.
- Each run: checks → `tofu apply` → deploy the Worker and set its OpenRouter key → build the web app against that Worker's URL → deploy to Pages. The workflow log prints the web URL at the end.

## One-time setup

Do these once per environment (dev and prod), since they use separate Cloudflare accounts.

### 1. Cloudflare

1. Copy the **Account ID** (Workers & Pages overview, right-hand side).
2. Open **Workers & Pages** once and pick a `workers.dev` subdomain if asked. The API is served from it.
3. **R2 → Create bucket** named `overnover-tfstate`. (Another name works if you set the `TF_STATE_BUCKET` variable below.)
4. **R2 → Manage API tokens → Create Account API token** with *Object Read & Write* on that bucket. Keep the *Access Key ID* and *Secret Access Key*.
5. **My Profile → API Tokens → Create Token**, start from the *Edit Cloudflare Workers* template and add *Account → Cloudflare Pages → Edit*. If you use a custom domain, also add *Zone → DNS → Edit* for that zone.

### 2. OpenRouter

Create an API key at openrouter.ai/keys. Setting a credit limit on the key is a good idea, since the API has no sign-in.

### 3. Google Cloud (one project is enough for both environments)

1. Create a project, then enable the **Google Sheets API** and the **Google Drive API**.
2. **OAuth consent screen**: External, add the scope `.../auth/drive.file`. While the app is in *Testing*, add each person who will use it as a test user, or publish the app.
3. **Credentials → Create OAuth client ID → Web application**. Authorized JavaScript origins:
   - `https://overnover-prod.pages.dev`
   - `https://overnover-dev.pages.dev`
   - `http://localhost:5173`
   - your custom domain, if any

   Authorized redirect URIs (sign-in happens in the same tab and Google returns to the site root, so keep the trailing slash):
   - `https://overnover-prod.pages.dev/`
   - `https://overnover-dev.pages.dev/`
   - `http://localhost:5173/`
   - your custom domain with a trailing `/`, if any

   If a Pages name was already taken, Cloudflare adds a suffix; use the URL the deploy log prints.

### 4. GitHub

**Settings → Environments**, create `dev` and `prod`, and in each add:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | token from 1.5 |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | from 1.1 |
| Secret | `TF_STATE_ACCESS_KEY_ID` | from 1.4 |
| Secret | `TF_STATE_SECRET_ACCESS_KEY` | from 1.4 |
| Secret | `OPENROUTER_API_KEY` | from 2 |
| Variable | `GOOGLE_CLIENT_ID` | the OAuth client ID from 3 |
| Variable (optional) | `WEB_DOMAIN` | custom domain for the web app, e.g. `study.example.com` |
| Variable (optional) | `CLOUDFLARE_ZONE_ID` | zone of that domain |
| Variable (optional) | `TF_STATE_BUCKET` | only if the bucket isn't `overnover-tfstate` |

Then run **Actions → Deploy dev → Run workflow** (or push to `dev`), and `pnpm deploy:prod` when dev looks right.

## Changing the model

`OPENROUTER_MODEL` in `apps/api/wrangler.toml` (default `anthropic/claude-haiku-5.5`).
