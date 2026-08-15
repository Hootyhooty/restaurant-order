# Branch protection and GitHub Environments

After the first successful CI run on `main`, enable required checks in GitHub:

1. Repository → **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Enable **Require status checks to pass before merging**
4. Enable **Require branches to be up to date before merging**
5. Select required checks:
   - `Frontend (lint + test + build)`
   - `Backend (lint + tests)`
6. Save

PRs cannot merge until both jobs are green.

Deploy jobs (`Deploy staging`, `Deploy production`) run only on **push** to `main`/`master`, not on pull requests. Do not require them for merge.

## Environments (CD)

Create two GitHub Environments (Settings → Environments):

| Environment | Protection | When it runs |
|-------------|------------|----------------|
| `staging` | none | After CI on push to `main` |
| `production` | **Required reviewers** (you) | After staging smoke passes |

### Secrets — `staging`

| Secret | Purpose |
|--------|---------|
| `RENDER_STAGING_BACKEND_HOOK` | Render Deploy Hook URL (POST) |
| `RENDER_STAGING_FRONTEND_HOOK` | Render Deploy Hook URL (POST) |
| `STAGING_API_URL` | Staging API origin, e.g. `https://…onrender.com` |
| `STAGING_FRONTEND_ORIGIN` | Staging frontend origin |
| `STAGING_SMOKE_USERNAME` | Optional smoke login |
| `STAGING_SMOKE_PASSWORD` | Optional smoke login |

### Secrets — `production`

| Secret | Purpose |
|--------|---------|
| `RENDER_PROD_BACKEND_HOOK` | Render Deploy Hook URL (POST) |
| `RENDER_PROD_FRONTEND_HOOK` | Render Deploy Hook URL (POST) |
| `PROD_API_URL` | Production API origin |
| `PROD_FRONTEND_ORIGIN` | Production frontend origin |

Render Dashboard → each service → **Settings** → **Deploy Hook**.

**Turn off auto-deploy** on production (and staging, if you want GitHub to be the only deployer) so a push to `main` cannot go live before smoke + approval.
