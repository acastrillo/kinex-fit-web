# Admin Dashboard Enhancement Plan

## Overview
Implement comprehensive admin dashboard with beta user management, account controls, tier management, and system logs viewing.

## Requirements Summary

### Beta User Management
- Add `isBeta` flag to users (manual admin toggle)
- Global beta flag to control beta period system-wide (defaults ON in production)
- Beta users see pricing but cannot upgrade (buttons disabled)
- Beta restrictions apply only when global beta mode is ON

### User Management
- View all users (already exists)
- Toggle user subscription tiers (admin-only tier changes)
- Enable/disable user accounts
- Mark/unmark users as beta testers
- Filter by beta status

### System Logs Dashboard
- View application logs (CloudWatch)
- View audit logs (admin actions)
- View AI usage logs (cost and token tracking)
- Filter by level, time range, search text
- Pagination and export capabilities

### Settings Management
- Global beta flag toggle
- System configuration interface

---

## Architecture Decisions

### 1. Beta Flag System
- **User-level**: `isBeta: boolean` field in DynamoDB users table
- **System-level**: New `spotter-system-settings` DynamoDB table
  - Stores global beta mode flag
  - No deployment needed to toggle
  - Includes audit trail (updatedBy, updatedAt)
- **Default behavior**: If the setting is missing, treat `globalBetaMode` as `true` in production
  (safe default), and `false` in non-production unless explicitly set.
- **Logic**: `isRestricted = user.isBeta && globalBetaMode === true`

### 2. Account Disable
- **Field**: `isDisabled: boolean` in users table
- **Check Location**: NextAuth JWT callback in [src/lib/auth-options.ts](src/lib/auth-options.ts)
- **Behavior**: Blocks login at auth level, preserves all user data

### 3. Admin Tier Changes
- Updates DynamoDB `subscriptionTier` field only
- Does NOT interact with Stripe (no subscription creation/cancellation)
- Shows warning if user has active Stripe subscription
- All changes logged to audit table

### 4. Log Viewing
- **CloudWatch Logs**: Query via AWS SDK CloudWatch Logs Insights API (StartQuery + GetQueryResults)
  - Default log group: `/ecs/spotter-app` (per `docs/MONITORING-GUIDE.md`, override via `CLOUDWATCH_LOG_GROUP`)
  - Parse JSON logs when available (`level`, `message`, `metadata`); fall back to `@message` search for console logs
  - API returns `queryId` + `status` and client polls until `Complete` or timeout
- **Audit Logs**: Query existing `spotter-audit-logs` DynamoDB table
- **AI Usage**: Query existing `spotter-ai-usage` DynamoDB table
- **Strategy**: Three separate data sources, UI aggregates via tabs

---

## Database Changes

### 1. DynamoDBUser Schema Updates
**File**: [src/lib/dynamodb.ts](src/lib/dynamodb.ts)

Add to interface (lines 38-98):
```typescript
// Beta user management
isBeta?: boolean;

// Account status
isDisabled?: boolean;
disabledAt?: string | null;
disabledBy?: string | null;
disabledReason?: string | null;
```

### 2. New Table: System Settings
**Table Name**: `spotter-system-settings`
```typescript
{
  id: string;              // PK - "global-beta-mode"
  value: boolean;          // true = beta restrictions active
  type: "boolean";
  updatedAt: string;
  updatedBy: string;       // Admin user ID
  description?: string;
}
```
**Env**: `DYNAMODB_SYSTEM_SETTINGS_TABLE` (defaults to `spotter-system-settings`)
**Seed defaults**:
- Production: `value: true` (beta restrictions ON by default)
- Non-prod: `value: false` unless explicitly set

### 3. Audit Log Extensions
**File**: [src/lib/audit-log.ts](src/lib/audit-log.ts)

Add new audit action types:
- `admin.toggle-user-beta`
- `admin.disable-account`
- `admin.enable-account`
- `admin.change-tier`
- `admin.toggle-global-beta`
- `admin.view-logs`
- `admin.update-settings`
**Note**: Ensure `DYNAMODB_AUDIT_TABLE` is set to `spotter-audit-logs` in prod.

---

## API Endpoints

### User Management APIs (New)

#### POST `/api/admin/users/toggle-beta`
Toggle user beta status
```typescript
Request: { userId: string; isBeta: boolean }
Response: { success: boolean; user: { id, email, isBeta } }
Auth: admin:manage-users permission
```

#### POST `/api/admin/users/disable-account`
Disable or enable user account
```typescript
Request: { userId: string; disabled: boolean; reason?: string }
Response: { success: boolean; user: { id, email, isDisabled } }
Auth: admin:manage-users permission
```

#### POST `/api/admin/users/change-tier`
Admin-initiated tier change (DynamoDB only)
```typescript
Request: { userId: string; newTier: "free"|"core"|"pro"|"elite" }
Response: {
  success: boolean;
  warnings?: string[];  // If Stripe subscription exists
  user: { id, email, subscriptionTier, stripeSubscriptionId }
}
Auth: admin:manage-users permission
```

#### GET `/api/admin/users` (Enhanced)
Add query parameter: `isBeta=true|false` to filter beta users
Implementation note: `isBeta=false` should include users without the attribute
(`attribute_not_exists(isBeta) OR isBeta = false`) to capture legacy records.
Response includes `isBeta`, `isDisabled`, `disabled*` metadata, and `hasStripeSubscription` for admin actions.

### Logs APIs (New)

#### GET `/api/admin/logs/cloudwatch`
Query CloudWatch application logs
```typescript
Query: { startTime, endTime, level?, search?, limit?, queryId?, logGroup? }
Response: {
  success: boolean;
  status: "Running" | "Complete" | "Failed";
  queryId: string;
  logs?: Array<{ timestamp, level, message, metadata }>;
  statistics: { scannedEvents, matchedEvents }
}
Auth: admin:view-logs permission
Rate Limit: 20 req/min
```
If `queryId` is omitted, start a new Insights query and return `queryId` + `status`.
If provided, return results (when `Complete`) or `Running` to keep polling.

#### GET `/api/admin/logs/audit`
Query audit logs from DynamoDB
```typescript
Query: { startTime, endTime, actorId?, action?, limit?, lastEvaluatedKey? }
Response: {
  success: boolean;
  logs: Array<{ id, action, actorId, targetId, metadata, createdAt }>;
  pagination: { hasMore, lastEvaluatedKey? }
}
Auth: admin:view-logs permission
```
Note: If the audit table only has `id` as the primary key, time-range queries require
Scan + filters. Add GSIs (e.g., `actorId + createdAt`, `action + createdAt`) if volume grows.

#### GET `/api/admin/logs/ai-usage`
Query AI usage logs
```typescript
Query: { startTime, endTime, userId?, limit?, lastEvaluatedKey? }
Response: {
  success: boolean;
  logs: Array<{ userId, timestamp, inputTokens, outputTokens, cost }>;
  summary: { totalCost, totalTokens, totalRequests };
  pagination: { hasMore, lastEvaluatedKey? }
}
Auth: admin:view-logs permission
```
Note: AI usage table is keyed by `userId` + `requestId` (epochMs-uuid). Queries are efficient
when `userId` is provided; otherwise use a Scan or add a GSI on `timestamp` for global views.
Summary values may reflect the returned page unless a full scan/aggregation is performed.

### Settings APIs (New)

#### GET `/api/admin/settings`
Get system settings
```typescript
Response: { success: boolean; data: { globalBetaMode: boolean } }
Auth: admin:manage-settings permission
```

#### POST `/api/admin/settings`
Update system settings
```typescript
Request: { setting: "globalBetaMode"; value: boolean }
Response: { success: boolean; settings: { globalBetaMode } }
Auth: admin:manage-settings permission
Audit: admin.toggle-global-beta
```

---

## Frontend Components

### 1. Enhanced Admin Users Page
**Files Modified**:
- [src/components/admin/user-filters.tsx](src/components/admin/user-filters.tsx) - Add "Beta Users" dropdown filter
- [src/components/admin/users-table.tsx](src/components/admin/users-table.tsx) - Add beta badge column, enhance actions menu

**New Components**:
- `src/components/admin/change-tier-modal.tsx` - Modal for admin tier changes with Stripe warning
- `src/components/admin/disable-account-modal.tsx` - Modal for disabling accounts with reason input

### 2. New Logs Dashboard
**Path**: `/admin/logs`

**Files Created**:
- `src/app/admin/logs/page.tsx` - Server component with auth checks
- `src/components/admin/admin-logs-client.tsx` - Main client component with tabs
- `src/components/admin/log-filters.tsx` - Date range, search, level filters
- `src/components/admin/logs-table.tsx` - Virtualized table with pagination

**Features**:
- Tab navigation: Application | Audit | AI Usage
- Time range picker (max 7 days for CloudWatch)
- Search and filter by level/action/user
- Export to CSV (limited to 10K rows)
- Color-coded log levels

### 3. New Settings Page
**Path**: `/admin/settings`

**Files Created**:
- `src/app/admin/settings/page.tsx` - Server component with auth checks
- `src/components/admin/admin-settings-client.tsx` - Settings UI with toggle
- `src/components/admin/setting-card.tsx` - Reusable setting card component

**Features**:
- Global beta mode toggle switch
- Confirmation dialog before changes
- Shows last updated timestamp

---

## RBAC & Authorization

### New Permissions
**File**: [src/lib/rbac.ts](src/lib/rbac.ts)

```typescript
type Permission =
  | "admin:reset-quotas"        // Existing
  | "admin:view-analytics"      // Existing
  | "admin:manage-quotas"       // Existing
  | "admin:manage-users"        // NEW - beta, disable, tier
  | "admin:view-logs"           // NEW - log viewing
  | "admin:manage-settings";    // NEW - system settings

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [],
  support: ["admin:reset-quotas", "admin:view-logs"],
  admin: [
    "admin:reset-quotas",
    "admin:view-analytics",
    "admin:manage-quotas",
    "admin:manage-users",
    "admin:view-logs",
    "admin:manage-settings"
  ],
};
```

---

## Middleware & Auth Changes

### 1. Beta User Checkout Prevention
**Files Modified**:
- [src/app/subscription/page.tsx](src/app/subscription/page.tsx) - Disable upgrade buttons for beta users
- [src/app/api/stripe/checkout/route.ts](src/app/api/stripe/checkout/route.ts) - Server-side beta check (403 error)
- [src/app/api/stripe/portal/route.ts](src/app/api/stripe/portal/route.ts) - Block portal access for restricted beta users
- [src/lib/auth-options.ts](src/lib/auth-options.ts) - Include `isBeta` + `globalBetaMode` in session for client gating

**Logic**:
```typescript
const systemSettings = await getSystemSettings();
const isBetaRestricted = user.isBeta && systemSettings.globalBetaMode;

if (isBetaRestricted) {
  // Frontend: Disable buttons with tooltip
  // Backend: Return 403 error (checkout + billing portal)
}
```

### 2. Disabled Account Check
**File**: [src/lib/auth-options.ts](src/lib/auth-options.ts)

Add to `jwt` callback:
```typescript
// Reuse existing DynamoDB read on token refresh (already required for tier sync)
if (dbUser?.isDisabled) {
  throw new Error("Account disabled by administrator");
}
```

**Performance**: Reuses the existing strong-consistency read on JWT refresh
(`updateAge` is 5 minutes for active sessions).

---

## Implementation Phases

### Phase 1: Database Setup (1 day)
✅ **Deliverable**: Database ready for admin features

1. Add new fields to DynamoDBUser interface
2. Create `spotter-system-settings` table in DynamoDB
3. Insert initial record:
   - Production: `{ id: "global-beta-mode", value: true }`
   - Non-prod: `{ id: "global-beta-mode", value: false }` (unless explicitly set)
4. Add new audit action types

**Risk**: Low - all fields optional, backward compatible

---

### Phase 2: Backend APIs (3-4 days)
✅ **Deliverable**: Fully functional admin APIs

**File Changes**:
1. [src/lib/rbac.ts](src/lib/rbac.ts) - Add new permissions
2. [src/lib/audit-log.ts](src/lib/audit-log.ts) - Add new action types
3. `src/lib/system-settings.ts` (NEW) - Settings helper library

**New API Routes**:
1. `src/app/api/admin/users/toggle-beta/route.ts`
2. `src/app/api/admin/users/disable-account/route.ts`
3. `src/app/api/admin/users/change-tier/route.ts`
4. `src/app/api/admin/logs/cloudwatch/route.ts`
5. `src/app/api/admin/logs/audit/route.ts`
6. `src/app/api/admin/logs/ai-usage/route.ts`
7. `src/app/api/admin/settings/route.ts`

**Modified Files**:
- [src/app/api/admin/users/route.ts](src/app/api/admin/users/route.ts) - Add beta filter
- [src/lib/auth-options.ts](src/lib/auth-options.ts) - Add disabled check
- [src/app/api/stripe/checkout/route.ts](src/app/api/stripe/checkout/route.ts) - Add beta check
- [src/app/api/stripe/portal/route.ts](src/app/api/stripe/portal/route.ts) - Add beta check

**Testing**:
- Unit tests for all new endpoints
- Integration tests for auth flow with disabled users
- Test beta checkout prevention

---

### Phase 3: Frontend Components (3-4 days)
✅ **Deliverable**: Complete admin dashboard UI

**Enhanced Components**:
1. [src/components/admin/user-filters.tsx](src/components/admin/user-filters.tsx)
2. [src/components/admin/users-table.tsx](src/components/admin/users-table.tsx)

**New Components**:
1. `src/components/admin/change-tier-modal.tsx`
2. `src/components/admin/disable-account-modal.tsx`
3. `src/app/admin/logs/page.tsx`
4. `src/components/admin/admin-logs-client.tsx`
5. `src/components/admin/log-filters.tsx`
6. `src/components/admin/logs-table.tsx`
7. `src/app/admin/settings/page.tsx`
8. `src/components/admin/admin-settings-client.tsx`
9. `src/components/admin/setting-card.tsx`

**Modified Pages**:
- [src/app/subscription/page.tsx](src/app/subscription/page.tsx) - Disable upgrade for beta users

**Testing**:
- Manual testing of all admin flows
- Test beta user experience (buttons disabled)
- Test disabled user experience (login blocked)

---

### Phase 4: Deployment (1 day)
✅ **Deliverable**: Live admin dashboard in production

**Pre-Deployment Checklist**:
- [ ] All tests passing
- [ ] Create `spotter-system-settings` table in production
- [ ] Confirm `globalBetaMode` is ON in production
- [ ] Verify CloudWatch log group names in env vars
- [ ] Admin users have correct permissions
- [ ] Staging testing complete

**Deployment Steps**:
1. Deploy DynamoDB table (system settings)
2. Deploy backend changes
3. Deploy frontend changes
4. Verify admin panel access
5. Test one operation (toggle beta on test user)
6. Monitor CloudWatch for errors

**Rollback Plan**: Redeploy previous version via CI/CD. Database changes are backward-compatible (optional fields).

---

## Critical Files to Modify

### Backend
- [src/lib/dynamodb.ts](src/lib/dynamodb.ts:38-98) - Add user schema fields
- [src/lib/rbac.ts](src/lib/rbac.ts:4-10) - Add new permissions
- [src/lib/auth-options.ts](src/lib/auth-options.ts) - Add disabled account check
- [src/lib/audit-log.ts](src/lib/audit-log.ts) - Add audit action types
- [src/app/api/admin/users/route.ts](src/app/api/admin/users/route.ts) - Add beta filter
- [src/app/api/stripe/checkout/route.ts](src/app/api/stripe/checkout/route.ts) - Add beta check
- [src/app/api/stripe/portal/route.ts](src/app/api/stripe/portal/route.ts) - Add beta check

### Frontend
- [src/components/admin/users-table.tsx](src/components/admin/users-table.tsx) - Add beta badge, actions
- [src/components/admin/user-filters.tsx](src/components/admin/user-filters.tsx) - Add beta filter
- [src/app/subscription/page.tsx](src/app/subscription/page.tsx) - Disable buttons for beta users

### New Files (9 API routes + 9 components)
See Phase 2 and Phase 3 sections above for complete list.

---

## Edge Cases & Error Handling

### Beta Management
1. **User is beta, global mode OFF**: User CAN upgrade (global overrides individual)
2. **Admin toggles beta during checkout**: Checkout API validates before Stripe session
3. **Session not updated**: Force session refresh after admin changes

### Account Disabling
1. **Disabled user logged in**: Session remains valid until next JWT refresh
2. **Admin disables self**: Prevent with UI validation ("Cannot disable your own account")
3. **Password reset**: Add disabled check in reset flow

### Tier Changes
1. **User has Stripe subscription**: Show warning, don't prevent (admin knows best)
2. **Stripe webhook after admin change**: Stripe becomes source of truth for paying customers
3. **Quota recalculation**: Happens automatically on next API call (tier-dependent)

### Log Viewing
1. **CloudWatch timeout**: Limit date range to 7 days, show error with suggestions
2. **No logs found**: Show empty state with helpful message
3. **Large export**: Limit to 10K rows, show warning

---

## Testing Strategy

### Unit Tests
- All new API routes (request/response validation)
- Beta flag logic (user + global combinations)
- Disabled user auth callback
- RBAC permission checks

### Integration Tests
- Beta user flow (mark beta → login → checkout blocked → global toggle → checkout works)
- Account disable flow (disable → login fails → enable → login succeeds)
- Admin tier change (change tier → quotas update → audit logged)
- Log viewing (generate logs → query → filter → paginate)

### Manual Testing
- [ ] Filter users by beta status
- [ ] Toggle user beta flag
- [ ] Disable/enable account
- [ ] Change user tier (with Stripe warning)
- [ ] View all three log types
- [ ] Toggle global beta mode
- [ ] Beta user cannot upgrade
- [ ] Disabled user cannot login

---

## Verification Steps

After deployment, verify:

1. **Admin Panel Access**
   - Navigate to `/admin/users` - page loads
   - Navigate to `/admin/logs` - page loads
   - Navigate to `/admin/settings` - page loads

2. **User Management**
   - Filter by beta users - works
   - Toggle user beta flag - updates database
   - Disable user account - login blocked
   - Change user tier - tier updates, audit logged

3. **Beta Restrictions**
   - Mark user as beta
   - Login as beta user
   - Navigate to `/subscription` - upgrade buttons disabled
   - Try checkout API - returns 403 error
   - Toggle global beta OFF in `/admin/settings`
   - Upgrade buttons now enabled

4. **Logs Dashboard**
   - View application logs - displays recent errors
   - View audit logs - shows admin actions
   - View AI usage logs - shows token usage
   - Filter by date range - results filtered
   - Export to CSV - downloads file

5. **Disabled Users**
   - Disable test user account
   - Try to login - error message shown
   - Enable account - login works again

---

## Performance Considerations

1. **DynamoDB Reads**: Disabled check reuses existing JWT refresh read (every ~5 minutes of activity)
2. **CloudWatch Queries**: Limit date range to 7 days, rate limit 20 req/min
3. **System Settings Cache**: Add 5-minute in-memory cache for global beta flag
4. **User List**: Existing pagination handles large datasets

---

## Security

- All admin APIs require `getAuthenticatedSession()` + RBAC checks
- Rate limiting on log viewing (CloudWatch queries expensive)
- Audit ALL admin actions to `spotter-audit-logs`
- Tier changes require confirmation dialog
- Settings changes require confirmation
- Admin POST endpoints should validate `Origin`/`Referer` (or add CSRF token) since
  NextAuth CSRF protection does not automatically cover custom API routes

---

## Total Effort Estimate
**4 weeks** (conservative estimate with testing and deployment)

- Week 1: Database setup + Backend APIs
- Week 2: Frontend components + Enhanced admin pages
- Week 3: New logs dashboard + Settings page
- Week 4: Testing + Staging deployment + Production deployment

---

## Success Criteria

✅ Admins can view list of beta users
✅ Admins can toggle user beta status
✅ Admins can enable/disable accounts
✅ Admins can change user tiers (DynamoDB only)
✅ Beta users cannot upgrade when global beta mode is ON
✅ Disabled users cannot login
✅ Admins can view system logs (app, audit, AI usage)
✅ Admins can toggle global beta mode
✅ All admin actions are audit logged
✅ No impact on existing non-beta users
