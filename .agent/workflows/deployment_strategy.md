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

Edge Functions are shared across all environments (staging, main, beta).

To deploy Edge Functions:
```bash
npx supabase functions deploy <function-name> --project-ref nwxamngfnysostaefxif
```

> [!NOTE]
> Edge Function changes affect **all environments** immediately.