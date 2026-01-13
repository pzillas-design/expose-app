---
description: How to deploy changes from Staging to Beta
---

// turbo
1. Merge `staging` into `beta` and push:
```zsh
git checkout beta && git pull origin beta && git merge staging && git push origin beta && git checkout staging
```

> [!TIP]
> This command ensures your `beta` branch is up to date, brings in any new changes from `staging`, and then pushes them to trigger a Vercel deployment on `beta.expose.ae`. Finally, it returns you to the `staging` branch.