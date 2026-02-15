# Kinex Fit Security Review — 2025-11-18

> **Note**: Auth has since migrated to NextAuth.js with Google/Facebook/Email providers; Cognito references are historical.

## Scope & Method
- Reviewed the Next.js app (`src/app`), shared libraries under `src/lib`, and infrastructure scripts for authentication, AI, and data-access patterns.
- Focused on controls that prevent AI abuse (prompt bypass, runaway cost, data leakage) plus baseline web-app hardening (secret handling, headers, logging).
- Validated findings by reading source, tracing request flows, and checking supporting config (`.env.local`, `next.config.ts`, etc.).

## Findings

### Critical — Real secrets are committed to the repo
- **Evidence:** `.env.local:1-38` contains live Cognito client secrets, Stripe test secrets, and the Upstash Redis token.
- **Risk:** Anyone with repo access can impersonate the Cognito app, mint Stripe charges, drain Redis rate-limit quotas, or reuse tokens elsewhere. Moving this repo to a public space would leak all credentials instantly.
- **Fix:** Remove `.env.local` from version control, rotate every exposed credential (Cognito app, Stripe keys, Upstash token, etc.), and load secrets from AWS Secrets Manager/SSM at deploy time instead of shipping plaintext files.

### High — NextAuth runs with `debug: true` in production
- **Evidence:** `src/lib/auth-options.ts:90-166` sets `debug: true`, which makes NextAuth log JWT payloads, provider responses, and OAuth errors verbatim.
- **Risk:** Logs in CloudWatch (or any collector) will include user emails, Cognito access tokens, and refresh tokens. Anyone with log access can replay sessions or harvest PII.
- **Fix:** Set `debug: process.env.NODE_ENV !== 'production'`, scrub sensitive fields from logs, and ensure production logging only uses structured, redacted events.

### High — `/api/ai/test-connection` is unauthenticated and unthrottled
- **Evidence:** `src/app/api/ai/test-connection/route.ts:1-44` exposes a public GET endpoint that invokes `testBedrockConnection()` on every call without session checks or rate limiting.
- **Risk:** An attacker can burn Bedrock quota (and rack up AWS costs) simply by curling this endpoint, and the JSON response leaks which model/region you’re using. It also gives a trivial health probe to enumerate whether the AI backend is up.
- **Fix:** Require an authenticated session (and ideally an admin role) plus an Upstash rate limiter before running the test. Alternatively delete the endpoint outside of internal environments.

### High — AI workout generation ignores subscription quotas
- **Evidence:** `src/app/api/ai/generate-workout/route.ts:8-74` only authenticates the user and applies the hourly rate limit. It never checks `subscriptionTier`, `aiRequestsUsed`, or `getAIRequestLimit` before calling Bedrock, nor does it call `incrementAIUsage`.
- **Risk:** Free-tier accounts (or compromised accounts) can generate unlimited workouts and force the service to pay for unrestricted AI usage, bypassing the intended paywall. Attackers can automate requests to exfiltrate structured summaries of arbitrary prompts with no cost cap.
- **Fix:** Mirror the enforcement used in `enhance-workout`: fetch the Dynamo user, enforce `aiRequestsUsed < getAIRequestLimit(tier)`, increment usage when successful, and surface an upgrade message when limits are exceeded.

### Medium — Rate limiting fails open when Redis errors
- **Evidence:** `src/lib/rate-limit.ts:118-151` catches all Redis errors and returns `{ success: true }`, exposing the service to unlimited access whenever Upstash is unavailable (or deliberately blocked).
- **Risk:** An attacker can intentionally exhaust the Upstash connection limit or send malformed requests until Redis errors, then hammer expensive AI/OCR endpoints without any throttling, causing cost spikes and resource exhaustion.
- **Fix:** Fail closed (default to `success: false`) for cost-amplifying operations, or at least cap the number of requests allowed while Redis is degraded. Emit metrics so Redis instability is caught quickly.

### Medium — Raw AI prompts/responses with user data are logged verbatim
- **Evidence:** `src/lib/ai/workout-enhancer.ts:376-398` and `src/lib/ai/workout-content-organizer.ts:186-208` log `response.content` when JSON parsing fails. These payloads include the user’s raw OCR text, their training context (PRs, goals), and the model’s output.
- **Risk:** Any sensitive workout notes, injuries, or PII in uploads end up in centralized logs. If an attacker forces repeated parse failures they can intentionally dump arbitrary prompt contents into log storage, creating an exfiltration side channel.
- **Fix:** Replace raw dumps with hashed request IDs and model metadata. Capture the offending payload only in secure blob storage guarded by IAM, or redact user-provided text before logging.

### Medium — Baseline app hardening is disabled
- **Evidence:** `next.config.ts:3-10` disables ESLint and TypeScript errors during builds, and `src/app/layout.tsx:17-44` never sets CSP/HSTS/X-Frame headers.
- **Risk:** Lint/type regressions (including security regressions) ship silently, and browsers receive no CSP/HSTS protection, leaving the app exposed to clickjacking and XSS if any future component renders unsanitized content.
- **Fix:** Re-enable ESLint/TS enforcement in CI/CD, add a `middleware.ts` or `headers()` export that sets CSP, HSTS, `X-Content-Type-Options`, and `Referrer-Policy`, and gate deploys on the hardened build.

## Recommended Next Steps
1. Rotate the leaked credentials immediately and purge `.env.local` from git history.
2. Gate every AI endpoint (including health checks) by subscription tier, quota counters, and rate limiting that fails safe.
3. Sanitize observability: disable NextAuth debug logs and remove raw AI payload logging before promoting new builds.
4. Add a security middleware (headers, CSP, HSTS) and restore lint/TS enforcement so future regressions are caught automatically.
