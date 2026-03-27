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

## Database Environments

Current verified state:
- **Production (`main`)**: `rhocpnetpxficxnrprsq`
- **Staging (`staging`)**: `rhocpnetpxficxnrprsq`

Verification:
- `staging.expose.ae` bundle contains `https://rhocpnetpxficxnrprsq.supabase.co`
- `www.expose.ae` bundle contains `https://rhocpnetpxficxnrprsq.supabase.co`

Implication:
- `main` and `staging` currently point to the same Supabase v6 project
- a Supabase Edge Function deploy to this project affects both environments
- treat Edge Function changes as shared infrastructure, even when Git branches differ

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

Edge Functions currently deploy to the shared Supabase v6 project:

```bash
npx supabase functions deploy <function-name> --project-ref rhocpnetpxficxnrprsq
```

For `generate-image`, keep using the safer explicit JWT flag:

```bash
npx supabase functions deploy generate-image --project-ref rhocpnetpxficxnrprsq --no-verify-jwt
```
