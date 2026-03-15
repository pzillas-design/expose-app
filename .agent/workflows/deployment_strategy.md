---
description: How to deploy changes across environments
---

## Branch Strategy

- **staging** → `staging.expose.ae` (Auto-deploy) - For testing new features
- **main** → `expose.ae` (Manual deploy only) - Production
- **beta** → `beta.expose.ae` (Manual deploy only) - Old version for users

## Default: Deploy to Staging Only

**All changes should ONLY be pushed to `staging` by default.**

```bash
git checkout staging
git add -A
git commit -m "your message"
git push origin staging
```

> [!IMPORTANT]
> **NEVER** automatically push to `main` or `beta`. These require explicit manual deployment.

---

## Database Environments (Supabase v5 vs v6)

Currently, the application runs on two different Supabase projects:
- **Production (v5)**: `nwxamngfnysostaefxif` (Used by `main` and `beta` branches)
- **Staging/Preview (v6)**: `rhocpnetpxficxnrprsq` (Used by `staging` branch)

This separation is managed via **Vercel Environment Variables**:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are strictly bound to either the `Production` or `Preview` environment in Vercel.
- When Vercel builds `main`, it injects the v5 keys.
- When Vercel builds `staging`, it injects the v6 keys.

### Upgrading `main` to v6 (Future)
When the v6 database is ready for production, follow these steps to migrate `main`:
1. Open the Vercel Dashboard for `expose-app`.
2. Go to **Settings > Environment Variables**.
3. Locate the v6 variables (which are currently set to `Preview`):
   - `VITE_SUPABASE_URL` (`https://rhocpnetpxficxnrprsq...`)
   - `VITE_SUPABASE_ANON_KEY` (`sb_publishable_R1GRVHb1...`)
4. Edit them and check the **Production** box (so they apply to `Production`, `Preview`, and `Development`).
5. Delete the old v5 variables (with the `nwxamngfnysostaefxif` URL).
6. Trigger a Redeploy for the Production environment on Vercel.

---

## Manual Deployment: Staging → Main (Production)

**Only deploy to main after thorough testing on staging.**

// turbo
1. Merge `staging` into `main` and push:
```bash
git checkout main && git pull origin main && git merge staging && git push origin main && git checkout staging
```

> [!WARNING]
> This deploys to **production** (`expose.ae`). Only do this after confirming everything works on staging.

---

## Edge Functions

Edge Functions must be deployed to the correct Supabase project depending on the environment you are modifying.

To deploy to Production (v5):
```bash
npx supabase functions deploy <function-name> --project-ref nwxamngfnysostaefxif
```

To deploy to Staging (v6):
```bash
npx supabase functions deploy <function-name> --project-ref rhocpnetpxficxnrprsq
```