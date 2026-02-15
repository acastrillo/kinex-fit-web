# Admin Dashboard Implementation Log

Purpose: track admin dashboard changes and rollback steps. Update this log after each completed step.

## 2026-01-15

### Step 1 (completed)
Changes:
- Added system settings helper with cached `globalBetaMode` lookup and prod-on default.
- Extended DynamoDB user schema to include beta and disabled account fields.
- Updated admin dashboard plan and deployment docs for new defaults and env vars.

Files:
- `src/lib/system-settings.ts` (new)
- `src/lib/dynamodb.ts`
- `docs/ADMIN-DASHBOARD-PLAN.md`
- `docs/DEPLOYMENT.md`

Rollback notes:
- Delete `src/lib/system-settings.ts`.
- Revert schema additions in `src/lib/dynamodb.ts`.
- Revert documentation changes in `docs/ADMIN-DASHBOARD-PLAN.md` and `docs/DEPLOYMENT.md`.

### Step 2 (completed)
Changes:
- Expanded RBAC permissions to include user management, log viewing, and settings management.
- Extended audit action types to cover new admin operations.
- Added beta filter support to the admin users API with legacy-safe semantics.

Files:
- `src/lib/rbac.ts`
- `src/lib/audit-log.ts`
- `src/app/api/admin/users/route.ts`

Rollback notes:
- Revert RBAC permissions in `src/lib/rbac.ts`.
- Remove newly added audit actions in `src/lib/audit-log.ts`.
- Revert beta filter parsing and scan expressions in `src/app/api/admin/users/route.ts`.

### Step 3 (completed)
Changes:
- Added beta restrictions to Stripe checkout and billing portal APIs using system settings.
- Added `isBeta` and `globalBetaMode` into the NextAuth session for client-side gating.
- Disabled subscription upgrade/manage buttons for restricted beta users.
- Preserved beta/disabled flags in user upserts where existing records are rewritten.
- Added disabled-account enforcement in JWT refresh (rethrows to block access).

Files:
- `src/lib/auth-options.ts`
- `src/app/subscription/page.tsx`
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/portal/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/admin/add-password/route.ts`
- `src/store/index.ts`
- `docs/ADMIN-DASHBOARD-PLAN.md`

Rollback notes:
- Revert beta checks in Stripe checkout/portal routes.
- Remove session fields and disabled-account check changes in `src/lib/auth-options.ts`.
- Revert UI gating changes in `src/app/subscription/page.tsx`.
- Revert added beta/disabled fields passed to upserts in touched API routes.
- Revert session field additions in `src/store/index.ts`.

### Step 4 (completed)
Changes:
- Added admin APIs for toggling beta status, disabling/enabling accounts, changing tiers, and managing global beta mode settings.
- Included beta/disabled fields in the admin users list response for UI support.

Files:
- `src/app/api/admin/users/toggle-beta/route.ts` (new)
- `src/app/api/admin/users/disable-account/route.ts` (new)
- `src/app/api/admin/users/change-tier/route.ts` (new)
- `src/app/api/admin/settings/route.ts` (new)
- `src/app/api/admin/users/route.ts`
- `docs/ADMIN-DASHBOARD-PLAN.md`

Rollback notes:
- Remove the new admin route files listed above.
- Revert `src/app/api/admin/users/route.ts` to remove beta/disabled fields from the response.
- Revert documentation notes in `docs/ADMIN-DASHBOARD-PLAN.md`.

### Step 5 (completed)
Changes:
- Added CloudWatch Logs Insights API endpoint with async query polling.
- Added audit logs and AI usage logs admin endpoints with pagination.
- Documented new CloudWatch log group env var and success fields in responses.
- Added CloudWatch Logs SDK dependency.

Files:
- `src/app/api/admin/logs/cloudwatch/route.ts` (new)
- `src/app/api/admin/logs/audit/route.ts` (new)
- `src/app/api/admin/logs/ai-usage/route.ts` (new)
- `package.json`
- `package-lock.json`
- `docs/ADMIN-DASHBOARD-PLAN.md`
- `docs/DEPLOYMENT.md`

Rollback notes:
- Remove the three new log route files.
- Revert `package.json` and `package-lock.json` to remove `@aws-sdk/client-cloudwatch-logs`.
- Revert documentation changes in `docs/ADMIN-DASHBOARD-PLAN.md` and `docs/DEPLOYMENT.md`.

### Step 6 (completed)
Changes:
- Added admin logs dashboard UI (tabs, filters, tables) and wired it to log APIs.
- Added admin settings UI for global beta mode, with confirmation flow.
- Enhanced admin users table with beta status, disable/enable, and tier change actions.
- Added modal components for tier changes and disabling accounts.

Files:
- `src/app/admin/logs/page.tsx` (new)
- `src/components/admin/admin-logs-client.tsx` (new)
- `src/components/admin/log-filters.tsx` (new)
- `src/components/admin/logs-table.tsx` (new)
- `src/app/admin/settings/page.tsx` (new)
- `src/components/admin/admin-settings-client.tsx` (new)
- `src/components/admin/setting-card.tsx` (new)
- `src/components/admin/change-tier-modal.tsx` (new)
- `src/components/admin/disable-account-modal.tsx` (new)
- `src/components/admin/admin-users-client.tsx`
- `src/components/admin/user-filters.tsx`
- `src/components/admin/users-table.tsx`

Rollback notes:
- Remove the new admin pages/components listed above.
- Revert updates in `src/components/admin/admin-users-client.tsx`, `src/components/admin/user-filters.tsx`, and `src/components/admin/users-table.tsx`.

Verification:
- Ran `npm run lint` and observed existing errors/warnings in unrelated files (see CLI output). No lint fixes applied.

## 2026-01-15 (lint follow-up)

Changes:
- Suppressed CommonJS require lint errors in `scripts/add-password-to-user.js`.
- Preserved beta/disabled flags in both add-password scripts to avoid overwriting admin flags.
- Fixed React Hook dependency warnings in admin user filters and client components.

Files:
- `scripts/add-password-to-user.js`
- `scripts/add-password-to-user.ts`
- `src/components/admin/admin-users-client.tsx`
- `src/components/admin/user-filters.tsx`

Rollback notes:
- Remove the eslint disable comment and the beta/disabled fields from the scripts.
- Revert hook dependency changes in the admin components.

Verification:
- `npm run lint` now reports only pre-existing warnings (no errors).

## 2026-01-15 (admin logs build fix)

Changes:
- Fixed `cloudwatchRows` mapping to guard `metadata` as `unknown` before rendering.

Files:
- `src/components/admin/admin-logs-client.tsx`

Rollback notes:
- Revert `src/components/admin/admin-logs-client.tsx` to the previous mapping structure.

Verification:
- `npm run build` passes with existing lint warnings and repeated `At least one auth provider must be configured` notices from NextAuth during static generation.
