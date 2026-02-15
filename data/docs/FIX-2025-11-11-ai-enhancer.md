## AI Enhancer Front-End Error (Nov 11, 2025)

### Summary
- **Impact**: Users hitting the `/add` page and invoking “Enhance with AI” saw `M.trim is not a function` because the client bundle still contained pre-fix logic that attempted to call `.trim()` on a non-string.
- **Root Cause**: Production continued serving the old chunk `/_next/static/chunks/app/add/page-716b5dfd4dec5632.js`. Every ECS redeploy referenced the same stale Docker image (last pushed Nov 10 @ 11:50 ET), so the updated React code never reached users. Next.js cached HTML/JS (via CloudFront/S3) further amplified the issue.
- **Fix**: Built a fresh Docker image from the latest commit, tagged/pushed it to ECR (`sha256:449ee56a663a5cc65587a1f880d4f165a139a21d8ff05ad816e51d297877994c`), then forced a new ECS deployment (`ecs-svc/0069186021443618897`). The `/add` page now references `page-98891396b3cf32c1.js`, which includes the defensive string coercion.

### Verification
1. `curl https://kinexfit.com/add` now returns build marker `<!--kvP6LnWq3RBfgreJn4HAQ-->` and loads `/_next/static/chunks/app/add/page-98891396b3cf32c1.js`.
2. `curl https://kinexfit.com/api/health` → `200 OK` (`status: "healthy"`).
3. Local reproduction with the new chunk confirms `setWorkoutContent` always receives strings; no `.trim()` errors appear in the console.

### Follow-up
- Automate Docker build/push inside `update-deployment.ps1` (or add a CI/CD guard) so ECS deployments can’t reuse stale images silently.
- Consider adding a cache-busting step (CloudFront invalidation) after each deploy to minimize stale bundle exposure.
