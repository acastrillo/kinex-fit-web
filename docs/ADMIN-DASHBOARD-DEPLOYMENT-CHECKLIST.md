# Admin Dashboard - Pre-Deployment Checklist

## Overview
This checklist ensures all components of the admin dashboard are ready for AWS deployment.

**Status**: ✅ Ready for deployment with required infrastructure setup

---

## ✅ Code Implementation Status

### Phase 1: Database Schema ✅ COMPLETE
- [x] DynamoDBUser schema updated with beta/disabled fields ([src/lib/dynamodb.ts:94-101](../src/lib/dynamodb.ts))
- [x] System settings helper library created ([src/lib/system-settings.ts](../src/lib/system-settings.ts))
- [x] Audit log types extended ([src/lib/audit-log.ts:19-30](../src/lib/audit-log.ts))
- [x] RBAC permissions added ([src/lib/rbac.ts:4-10](../src/lib/rbac.ts))

### Phase 2: Backend APIs ✅ COMPLETE
**New API Endpoints Created:**
- [x] `POST /api/admin/users/toggle-beta` ([src/app/api/admin/users/toggle-beta/route.ts](../src/app/api/admin/users/toggle-beta/route.ts))
- [x] `POST /api/admin/users/disable-account` ([src/app/api/admin/users/disable-account/route.ts](../src/app/api/admin/users/disable-account/route.ts))
- [x] `POST /api/admin/users/change-tier` ([src/app/api/admin/users/change-tier/route.ts](../src/app/api/admin/users/change-tier/route.ts))
- [x] `GET /api/admin/logs/cloudwatch` ([src/app/api/admin/logs/cloudwatch/route.ts](../src/app/api/admin/logs/cloudwatch/route.ts))
- [x] `GET /api/admin/logs/audit` ([src/app/api/admin/logs/audit/route.ts](../src/app/api/admin/logs/audit/route.ts))
- [x] `GET /api/admin/logs/ai-usage` ([src/app/api/admin/logs/ai-usage/route.ts](../src/app/api/admin/logs/ai-usage/route.ts))
- [x] `GET/POST /api/admin/settings` ([src/app/api/admin/settings/route.ts](../src/app/api/admin/settings/route.ts))

**Modified Files:**
- [x] Enhanced `/api/admin/users` with beta filter ([src/app/api/admin/users/route.ts](../src/app/api/admin/users/route.ts))
- [x] Added disabled check to auth ([src/lib/auth-options.ts:605-607](../src/lib/auth-options.ts))
- [x] Added beta check to Stripe checkout ([src/app/api/stripe/checkout/route.ts:52](../src/app/api/stripe/checkout/route.ts))
- [x] Added beta check to Stripe portal ([src/app/api/stripe/portal/route.ts:21](../src/app/api/stripe/portal/route.ts))

### Phase 3: Frontend Components ✅ COMPLETE
**Enhanced Components:**
- [x] User filters with beta dropdown ([src/components/admin/user-filters.tsx](../src/components/admin/user-filters.tsx))
- [x] Users table with beta badge and new actions ([src/components/admin/users-table.tsx](../src/components/admin/users-table.tsx))

**New Components:**
- [x] Change tier modal ([src/components/admin/change-tier-modal.tsx](../src/components/admin/change-tier-modal.tsx))
- [x] Disable account modal ([src/components/admin/disable-account-modal.tsx](../src/components/admin/disable-account-modal.tsx))
- [x] Logs page ([src/app/admin/logs/page.tsx](../src/app/admin/logs/page.tsx))
- [x] Admin logs client ([src/components/admin/admin-logs-client.tsx](../src/components/admin/admin-logs-client.tsx))
- [x] Log filters ([src/components/admin/log-filters.tsx](../src/components/admin/log-filters.tsx))
- [x] Logs table ([src/components/admin/logs-table.tsx](../src/components/admin/logs-table.tsx))
- [x] Settings page ([src/app/admin/settings/page.tsx](../src/app/admin/settings/page.tsx))
- [x] Admin settings client ([src/components/admin/admin-settings-client.tsx](../src/components/admin/admin-settings-client.tsx))
- [x] Setting card ([src/components/admin/setting-card.tsx](../src/components/admin/setting-card.tsx))

**Modified Pages:**
- [x] Subscription page with beta restrictions ([src/app/subscription/page.tsx](../src/app/subscription/page.tsx))

### Build Status ✅ COMPLETE
- [x] TypeScript compilation successful
- [x] Next.js build successful
- [x] All routes generated correctly
- [x] Minor linting warnings (non-blocking)

---

## ⚠️ Required AWS Infrastructure Setup

### 1. DynamoDB Tables

#### Create System Settings Table
**Table Name**: `spotter-system-settings`

```bash
aws dynamodb create-table \
  --table-name spotter-system-settings \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**Seed Initial Data (Production)**:
```bash
aws dynamodb put-item \
  --table-name spotter-system-settings \
  --item '{
    "id": {"S": "global-beta-mode"},
    "value": {"BOOL": true},
    "type": {"S": "boolean"},
    "updatedAt": {"S": "2026-01-15T00:00:00Z"},
    "updatedBy": {"S": "system"},
    "description": {"S": "Global beta mode toggle - disables all upgrade flows when true"}
  }' \
  --region us-east-1
```

#### Verify Existing Tables
- [x] `spotter-users` - Already exists
- [x] `spotter-workouts` - Already exists
- [x] `spotter-body-metrics` - Already exists
- [ ] `spotter-audit-logs` - **VERIFY EXISTS** (used in code but not confirmed)
- [ ] `spotter-webhook-events` - **VERIFY EXISTS**
- [ ] `spotter-ai-usage` - **VERIFY EXISTS**
- [ ] `spotter-workout-completions` - **VERIFY EXISTS**

### 2. Environment Variables

#### Add to ECS Task Definition

**File**: `updated-task-def.json`

Add these to the `environment` section (lines 19-67):

```json
{
  "name": "DYNAMODB_SYSTEM_SETTINGS_TABLE",
  "value": "spotter-system-settings"
},
{
  "name": "DYNAMODB_AUDIT_TABLE",
  "value": "spotter-audit-logs"
},
{
  "name": "DYNAMODB_AI_USAGE_TABLE",
  "value": "spotter-ai-usage"
},
{
  "name": "CLOUDWATCH_LOG_GROUP",
  "value": "/ecs/spotter-app"
}
```

**Current task-def location**: Line 67 (before secrets array)

### 3. IAM Permissions

#### Update Task Role Policy

**File**: `updated-task-policy.json`

Verify the task role (`SpotterTaskRole`) has these permissions:

**DynamoDB:**
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:UpdateItem",
    "dynamodb:Query",
    "dynamodb:Scan"
  ],
  "Resource": [
    "arn:aws:dynamodb:us-east-1:920013187591:table/spotter-system-settings",
    "arn:aws:dynamodb:us-east-1:920013187591:table/spotter-audit-logs",
    "arn:aws:dynamodb:us-east-1:920013187591:table/spotter-ai-usage"
  ]
}
```

**CloudWatch Logs Insights:**
```json
{
  "Effect": "Allow",
  "Action": [
    "logs:StartQuery",
    "logs:GetQueryResults",
    "logs:StopQuery",
    "logs:DescribeLogGroups"
  ],
  "Resource": [
    "arn:aws:logs:us-east-1:920013187591:log-group:/ecs/spotter-app:*"
  ]
}
```

#### Apply Policy Update
```bash
aws iam put-role-policy \
  --role-name SpotterTaskRole \
  --policy-name SpotterTaskPolicy \
  --policy-document file://updated-task-policy.json
```

### 4. CloudWatch Log Group

Verify log group exists:
```bash
aws logs describe-log-groups \
  --log-group-name-prefix "/ecs/spotter-app" \
  --region us-east-1
```

If not exists, create:
```bash
aws logs create-log-group \
  --log-group-name /ecs/spotter-app \
  --region us-east-1
```

---

## 📋 Pre-Deployment Validation

### Local Testing
- [x] Build completes successfully (`npm run build`)
- [x] TypeScript types are valid
- [ ] **RECOMMENDED**: Test locally with AWS credentials
  - Set `DYNAMODB_SYSTEM_SETTINGS_TABLE=spotter-system-settings`
  - Set `DYNAMODB_AUDIT_TABLE=spotter-audit-logs`
  - Verify system settings fetch works
  - Test admin APIs with real DynamoDB

### Code Review
- [x] All new API endpoints have RBAC checks
- [x] Disabled account check in auth callback
- [x] Beta restrictions in checkout/portal
- [x] Audit logging for all admin actions
- [x] System settings with 5-minute cache
- [x] Error handling in all API routes

### Security Checklist
- [x] All admin APIs require `admin:*` permissions
- [x] Sensitive data excluded from responses (no passwordHash, Stripe IDs)
- [x] Audit logs capture IP addresses
- [x] Beta restrictions at both frontend and backend
- [x] Disabled users blocked at auth level
- [x] Settings cache has TTL (5 minutes)

---

## 🚀 Deployment Steps

### Step 1: Create Infrastructure (30 minutes)
```bash
# 1. Create system settings table
aws dynamodb create-table \
  --table-name spotter-system-settings \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# 2. Seed global beta mode (ON by default)
aws dynamodb put-item \
  --table-name spotter-system-settings \
  --item '{"id":{"S":"global-beta-mode"},"value":{"BOOL":true},"type":{"S":"boolean"},"updatedAt":{"S":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"},"updatedBy":{"S":"system"},"description":{"S":"Global beta mode - disables upgrades"}}' \
  --region us-east-1

# 3. Verify table created
aws dynamodb describe-table --table-name spotter-system-settings --region us-east-1

# 4. Update IAM role policy
aws iam put-role-policy \
  --role-name SpotterTaskRole \
  --policy-name SpotterTaskPolicy \
  --policy-document file://updated-task-policy.json
```

### Step 2: Update Task Definition (10 minutes)
```bash
# 1. Edit updated-task-def.json - add environment variables:
#    - DYNAMODB_SYSTEM_SETTINGS_TABLE=spotter-system-settings
#    - DYNAMODB_AUDIT_TABLE=spotter-audit-logs
#    - DYNAMODB_AI_USAGE_TABLE=spotter-ai-usage
#    - CLOUDWATCH_LOG_GROUP=/ecs/spotter-app

# 2. Register new task definition
aws ecs register-task-definition \
  --cli-input-json file://updated-task-def.json \
  --region us-east-1
```

### Step 3: Build and Push Docker Image (15 minutes)
```bash
# 1. Build Next.js app
npm run build

# 2. Build Docker image
docker build -t spotter-app:latest .

# 3. Tag image
docker tag spotter-app:latest 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# 4. Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 920013187591.dkr.ecr.us-east-1.amazonaws.com

# 5. Push image
docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
```

### Step 4: Deploy to ECS (5 minutes)
```bash
# 1. Update ECS service with new task definition
aws ecs update-service \
  --cluster spotter-cluster \
  --service spotter-app-service \
  --task-definition spotter-app-task \
  --force-new-deployment \
  --region us-east-1

# 2. Monitor deployment
aws ecs describe-services \
  --cluster spotter-cluster \
  --services spotter-app-service \
  --region us-east-1
```

### Step 5: Verify Deployment (15 minutes)
```bash
# 1. Check service is running
aws ecs describe-services \
  --cluster spotter-cluster \
  --services spotter-app-service \
  --query 'services[0].deployments' \
  --region us-east-1

# 2. Check task health
aws ecs list-tasks \
  --cluster spotter-cluster \
  --service-name spotter-app-service \
  --region us-east-1

# 3. View logs
aws logs tail /ecs/spotter-app --follow --region us-east-1
```

---

## ✅ Post-Deployment Verification

### Admin Panel Access
- [ ] Navigate to `https://kinexfit.com/admin/users`
  - Should load user list
  - Should see beta filter option
  - Should see disabled status column
- [ ] Navigate to `https://kinexfit.com/admin/logs`
  - Should load logs dashboard
  - Should have 3 tabs (Application, Audit, AI Usage)
- [ ] Navigate to `https://kinexfit.com/admin/settings`
  - Should show global beta mode toggle
  - Should show current status (ON)

### Functional Testing
1. **Beta User Flow**
   - [ ] Mark test user as beta (toggle in admin)
   - [ ] Login as beta user
   - [ ] Navigate to `/subscription`
   - [ ] Verify upgrade buttons are disabled
   - [ ] Try checkout API - should return 403
   - [ ] Toggle global beta OFF in settings
   - [ ] Refresh subscription page - buttons should work

2. **Account Disable Flow**
   - [ ] Disable test account (admin panel)
   - [ ] Try to login - should fail with error message
   - [ ] Re-enable account
   - [ ] Login should work

3. **Admin Tier Changes**
   - [ ] Change user tier from FREE to PRO
   - [ ] Verify tier updates in database
   - [ ] Verify quota limits change
   - [ ] Check audit log entry exists

4. **Logs Dashboard**
   - [ ] View application logs - should show recent logs
   - [ ] Filter by error level - should filter correctly
   - [ ] View audit logs - should show admin actions
   - [ ] View AI usage logs - should show token usage

5. **Settings Management**
   - [ ] Toggle global beta mode OFF
   - [ ] Verify confirmation dialog appears
   - [ ] Check audit log records the change
   - [ ] Verify cache updates (test within 5 minutes)

---

## 🔍 Monitoring & Troubleshooting

### CloudWatch Metrics to Watch
- **ECS Service**:
  - CPU utilization (should stay < 70%)
  - Memory utilization (should stay < 80%)
  - Task count (should stabilize at desired count)

- **DynamoDB**:
  - Read/Write capacity (system-settings table should be low volume)
  - Throttled requests (should be 0)

- **Application Logs**:
  - Error count (watch for auth failures, DynamoDB errors)
  - Admin action audit logs (verify logging works)

### Common Issues

**Issue: "Account disabled by administrator" on login for all users**
- Cause: `isDisabled` check too aggressive or settings not working
- Fix: Check auth-options.ts line 605, verify disabled field defaults to false

**Issue: Beta users can still upgrade**
- Cause: Global beta mode is OFF or cache issue
- Fix:
  1. Check settings table: `aws dynamodb get-item --table-name spotter-system-settings --key '{"id":{"S":"global-beta-mode"}}'`
  2. Clear cache: Redeploy or wait 5 minutes
  3. Check checkout/portal route implementations

**Issue: CloudWatch logs not appearing in admin dashboard**
- Cause: IAM permissions or log group name mismatch
- Fix:
  1. Verify `CLOUDWATCH_LOG_GROUP` env var matches actual log group
  2. Check IAM policy has `logs:StartQuery` permission
  3. Test query manually: `aws logs start-query --log-group-name /ecs/spotter-app --start-time $(date -d '1 hour ago' +%s) --end-time $(date +%s) --query-string 'fields @message'`

**Issue: Admin APIs return 403 Forbidden**
- Cause: User doesn't have admin role
- Fix:
  1. Check user in DynamoDB has `roles: ["admin"]` or `isAdmin: true`
  2. Verify RBAC checks in route handlers

**Issue: Settings changes don't take effect immediately**
- Expected: Cache has 5-minute TTL
- Workaround: Wait up to 5 minutes or force redeploy to clear cache

---

## 📊 Rollback Plan

If critical issues occur:

### Quick Rollback (5 minutes)
```bash
# Revert to previous task definition revision
aws ecs update-service \
  --cluster spotter-cluster \
  --service spotter-app-service \
  --task-definition spotter-app-task:<previous-revision> \
  --region us-east-1
```

### Full Rollback (15 minutes)
```bash
# 1. Revert code changes
git revert <deployment-commit-sha>

# 2. Rebuild and redeploy
npm run build
docker build -t spotter-app:rollback .
docker tag spotter-app:rollback 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# 3. Force new deployment
aws ecs update-service \
  --cluster spotter-cluster \
  --service spotter-app-service \
  --force-new-deployment \
  --region us-east-1
```

**Note**: Database changes are backward-compatible. New optional fields don't break existing functionality.

---

## 📝 Summary

**Implementation Status**: ✅ 100% Complete

**Ready for Deployment**: ⚠️ Yes, with required infrastructure setup

**Required Actions Before Deployment**:
1. ✅ Code is complete and builds successfully
2. ⚠️ Create `spotter-system-settings` DynamoDB table
3. ⚠️ Seed global beta mode setting (default: ON)
4. ⚠️ Update task definition with new environment variables
5. ⚠️ Update IAM role with CloudWatch Logs permissions
6. ⚠️ Verify audit logs table exists

**Estimated Deployment Time**: 1-2 hours (including testing)

**Risk Level**: Low
- All changes are backward compatible
- New features are opt-in (beta/disabled flags default to false)
- Existing users unaffected
- Rollback is straightforward

---

## 🎯 Success Criteria

After deployment, verify:
- [x] Build completes successfully (DONE)
- [ ] All admin pages load without errors
- [ ] Beta restrictions work (users can't upgrade)
- [ ] Account disable blocks login
- [ ] Admin can change user tiers
- [ ] Logs dashboard displays all 3 log types
- [ ] Settings page toggles global beta mode
- [ ] All admin actions are audit logged
- [ ] No existing user functionality broken
- [ ] CloudWatch shows no new errors

**Deployment Contact**: alejo@kinexfit.com
**AWS Account**: 920013187591
**Region**: us-east-1
**ECS Cluster**: spotter-cluster
**ECS Service**: spotter-app-service
