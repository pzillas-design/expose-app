---
description: Deployment Workflow Strategy
---

# Git Workflow Strategy

This project follows a strict deployment strategy to ensure stability.

1.  **Development & Staging**:
    - All active development happens on the `staging` branch.
    - Local changes should represent the `staging` environment.
    - When code is ready to test, commit and push to `origin staging`.
    - This triggers the Vercel Staging deployment.

2.  **Production (Main)**:
    - The `main` branch is for **Production only**.
    - **NEVER** push directly to `main` without explicit user confirmation.
    - To deploy to production:
        1. Ensure `staging` is stable and approved by the user.
        2. Checkout `main`.
        3. Merge `staging` into `main` (`git merge staging`).
        4. Push `main` (`git push origin main`).
        5. Switch back to `staging` immediately (`git checkout staging`).

**Routine for AI Assistants:**
- Always check the current branch (`git branch --show-current`).
- If on `main`, switch to `staging` before making edits unless it's a hotfix requested for prod.
- When pushing, `git push origin staging` is the default action.