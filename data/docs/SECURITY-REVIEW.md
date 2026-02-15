# Spotter Security Review – Production Hardening Plan

> **Note**: This review references legacy Cognito-based auth. Current production auth uses NextAuth.js with Google/Facebook/Email providers.

This document captures the security vulnerabilities observed in the current Spotter web application codebase and the remediation steps required before promoting to a production workload on AWS. Findings are grouped by severity, with AWS-specific work highlighted explicitly.

## Critical Findings

1. **Seed script ships a known password**
   - **Evidence:** `scripts/seed-user.mjs:8`
   - **Impact:** Running the seed script in any non-local environment will create (or overwrite) a user with the published password `AeroAttyValley2025`, giving attackers a guaranteed foothold.
   - **Fix:** Remove hard-coded credentials, require secrets to come from environment variables, and ensure the script cannot run against production data (e.g., guard with `NODE_ENV` checks or delete the script once migrations cover the need). Rotate any environment that may have run this code.

2. **Secrets committed to the repository**
   - **Evidence:** `./.env`
   - **Impact:** Real credentials in source control expose AWS keys, Cognito app secrets, Stripe keys, etc., to anyone with repo access. If this repo is ever made public, secrets leak immediately.
   - **Fix:** Purge `.env` from git history, rotate every value already checked in, and replace with references to AWS SSM Parameter Store/Secrets Manager during CI/CD. Enforce a pre-commit hook or secret scanner in CI.

## High Findings

1. **Authentication logs leak session payloads**
   - **Evidence:** `src/app/api/ocr/route.ts:31`, `src/app/api/upload-image/route.ts:14`, `src/app/api/ingest/route.ts:11`, `src/app/api/instagram-fetch/route.ts:31`
   - **Impact:** On auth failure the code logs the entire `session` object, which includes emails, names, subscription state, and potentially JWTs. In CloudWatch or other centralized logs this becomes sensitive personal data.
   - **Fix:** Replace these logs with opaque identifiers (request id, user id) or remove them entirely. Apply structured logging that redacts PII before emitting.

2. **Image upload endpoint allows arbitrary files and serves them publicly**
   - **Evidence:** `src/app/api/upload-image/route.ts:24`, `src/lib/s3.ts:53`
   - **Impact:** Attackers can upload arbitrary binary data (no content-type, extension, or size checks) and obtain a public S3 URL, turning the bucket into an unmonitored file host and exposing you to malware distribution, copyright takedowns, and oversized storage bills.
   - **Fix:** Restrict accepted MIME types (`image/jpeg`, `image/png`, …), enforce size limits server-side, scan uploads (e.g., Amazon Macie/ClamAV via Lambda), store them in a private bucket, and return signed URLs or presigned POSTs. Configure S3 with Block Public Access, default encryption, and lifecycle rules.

3. **IAM roles are over-privileged and reused**
   - **Evidence:** `aws-task-definition.json:8`, `deploy-to-aws.ps1:58`
   - **Impact:** The same `ecsTaskExecutionRole` is used both for ECS execution and application runtime, and a wildcard SSM policy grants read access to `/spotter-app/*`. Compromise of the container exposes execution credentials that can read every parameter in that path.
   - **Fix:** Split roles: keep the execution role minimal (ECR pull, CloudWatch logs) and create a dedicated task role granting the least-privilege DynamoDB, S3, and Textract permissions. Scope SSM access to only the exact parameter ARNs needed, ideally via IAM Permission Boundaries or IAM Roles Anywhere.

4. **NextAuth secret not enforced**
   - **Evidence:** `src/lib/auth-options.ts:53`
   - **Impact:** If `AUTH_SECRET` is missing in production, NextAuth generates a random secret at runtime, breaking session validation on every deployment and weakening JWT signing guarantees.
   - **Fix:** Throw early when `AUTH_SECRET` is absent (mirroring the Cognito checks), add secret validation to CI, and load the value from AWS Secrets Manager.

5. **Metrics and instrumentation leak user identifiers**
   - **Evidence:** `src/lib/metrics.ts:94`
   - **Impact:** When metrics flush, the log payload includes the entire in-memory metric queue—containing `userId` and other dimensions. This creates unnecessary exposure of account identifiers in log archives.
   - **Fix:** Redact or hash user identifiers before logging, or export metrics directly to CloudWatch/EMF without dumping contextual data into application logs.

6. **Stripe checkout/portal routes skip shared auth configuration**
   - **Evidence:** `src/app/api/stripe/checkout/route.ts:8`, `src/app/api/stripe/portal/route.ts:8`
   - **Impact:** Calling `getServerSession()` without `authOptions` is brittle; in some deployment combinations the session resolver returns `null`, effectively bypassing the Cognito configuration and causing authorization inconsistencies.
   - **Fix:** Import `authOptions` and pass it explicitly (`getServerSession(authOptions)`) to keep session validation consistent across route handlers.

## Medium Findings

1. **Cost-amplifying endpoints lack throttling**
   - **Evidence:** `src/app/api/ocr/route.ts`, `src/app/api/instagram-fetch/route.ts`
   - **Impact:** Both endpoints invoke third-party or metered AWS services (Textract, Apify). Without rate limiting or quota enforcement, a malicious user can trigger runaway costs.
   - **Fix:** Add per-user and global throttles (e.g., Upstash Redis, API Gateway usage plans) and surface 429 responses. Consider moving heavy operations behind queues or scheduled jobs.

2. **Missing baseline web security headers**
   - **Evidence:** `src/app/layout.tsx:20`
   - **Impact:** No CSP, HSTS, `X-Frame-Options`, or `Referrer-Policy` headers are defined, reducing protection against clickjacking, XSS, and information leakage.
   - **Fix:** Add a `middleware.ts` or Next `headers()` configuration to supply strict CSP (with nonce-based script loading), `Strict-Transport-Security`, `X-Content-Type-Options`, and other OWASP-recommended headers—especially when fronted by CloudFront/ALB.

3. **Build safety nets disabled**
   - **Evidence:** `next.config.ts:6`
   - **Impact:** `ignoreDuringBuilds` and `ignoreBuildErrors` allow type and lint issues (including security regressions) into production.
   - **Fix:** Re-enable ESLint and TypeScript checks in CI/CD and fail the build on violations. Gate deployments on passing security linting (e.g., ESLint security plugins, `npm audit`).

## AWS Production Readiness Checklist

These items are required alongside the fixes above to ship securely on AWS:

- Store all secrets (Cognito, Stripe, Textract, S3) in AWS Secrets Manager or SSM Parameter Store, inject them via task definitions, and rotate regularly.
- Private networking: run ECS tasks in private subnets, attach an ALB with HTTPS listeners, and terminate TLS with ACM certificates.
- Enable AWS WAF on the public entry point (ALB or CloudFront) with rate-based rules and managed rule sets.
- Configure DynamoDB with point-in-time recovery, encryption with customer-managed KMS keys, and IAM condition keys to bind access to the task role.
- For S3 buckets, enable default encryption (SSE-S3/KMS), versioning, lifecycle policies, and Block Public Access. Serve assets through CloudFront with an Origin Access Control.
- Implement centralized logging/monitoring (CloudWatch Logs, Metrics, and AWS GuardDuty), and set alarms on authentication failures, Stripe webhook errors, and OCR throttling.

Addressing the critical and high findings first will close the most serious security gaps. The medium-severity items and AWS hardening steps should follow immediately afterward to meet production-readiness expectations.
