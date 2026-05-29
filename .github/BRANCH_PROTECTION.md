# Branch protection (Day 12)

After the first successful CI run on `main`, enable required checks in GitHub:

1. Repository → **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Enable **Require status checks to pass before merging**
4. Enable **Require branches to be up to date before merging**
5. Select required checks:
   - `Frontend (lint + build)`
   - `Backend (lint + tests)`
6. Save

PRs cannot merge until both jobs are green.
