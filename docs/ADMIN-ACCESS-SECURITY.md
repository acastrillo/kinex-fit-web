# Admin Panel Access Security

## Overview
The admin panel is now secured with email-based whitelist authentication. Only authorized users can access admin features.

## Security Implementation

### Email Whitelist
**File**: [src/lib/rbac.ts](../src/lib/rbac.ts)

```typescript
const ADMIN_EMAILS = ["acastrillo87@gmail.com"];
```

**How it works:**
- `getUserRoles()` function checks if user's email is in the `ADMIN_EMAILS` array
- Email comparison is case-insensitive (`.toLowerCase()`)
- Whitelist check happens **first**, overriding any database roles or flags
- If email matches, user automatically gets `["admin"]` role with all permissions

### Access Control Flow

```
User Login
    ↓
Session Created
    ↓
getUserRoles() called
    ↓
Email in ADMIN_EMAILS? ──YES──> Return ["admin"]
    ↓ NO
Check database roles
    ↓
Check isAdmin flag
    ↓
Default to ["user"]
```

## Admin Panel Access Points

### 1. Settings Page Button
**File**: [src/app/settings/page.tsx](../src/app/settings/page.tsx)

A new "Administration" section appears in settings **only for admin users**:

```typescript
const userIsAdmin = user ? isAdmin(user as any) : false

settingsSections = [
  ...(userIsAdmin ? [{
    title: "Administration",
    items: [{
      icon: Shield,
      title: "Admin Panel",
      subtitle: "Manage users, settings, and system logs",
      href: "/admin/users"
    }]
  }] : []),
  // ... other sections
]
```

**Features:**
- Shield icon for easy identification
- Only visible to whitelisted admin users
- Links to `/admin/users` (main admin dashboard)

### 2. Direct URL Access
Admin pages are accessible at:
- `/admin/users` - User management
- `/admin/logs` - System logs
- `/admin/settings` - System settings

**Protection**: All admin pages check session and RBAC permissions server-side before rendering.

## Permissions System

### Available Permissions
```typescript
type Permission =
  | "admin:reset-quotas"        // Reset user quotas
  | "admin:view-analytics"      // View analytics
  | "admin:manage-quotas"       // Manage quota limits
  | "admin:manage-users"        // Beta, disable, tier changes
  | "admin:view-logs"           // View system logs
  | "admin:manage-settings";    // Change system settings
```

### Admin Role Permissions
Whitelisted admins automatically get **all** permissions:
```typescript
admin: [
  "admin:reset-quotas",
  "admin:view-analytics",
  "admin:manage-quotas",
  "admin:manage-users",
  "admin:view-logs",
  "admin:manage-settings"
]
```

## Adding New Admins

To grant admin access to another user:

1. **Add email to whitelist** in [src/lib/rbac.ts](../src/lib/rbac.ts):
   ```typescript
   const ADMIN_EMAILS = [
     "acastrillo87@gmail.com",
     "newadmin@example.com"  // Add new admin
   ];
   ```

2. **Redeploy the application**:
   ```bash
   npm run build
   docker build -t spotter-app:latest .
   docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
   aws ecs update-service --cluster spotter-cluster --service spotter-app-service --force-new-deployment
   ```

3. **Verify access**:
   - New admin logs in
   - Goes to Settings page
   - Should see "Administration" section
   - Can access `/admin/users`

**No database changes needed** - whitelist is code-based.

## Removing Admin Access

1. **Remove email from whitelist** in [src/lib/rbac.ts](../src/lib/rbac.ts):
   ```typescript
   const ADMIN_EMAILS = [
     "acastrillo87@gmail.com"
     // "removed@example.com" - commented out or deleted
   ];
   ```

2. **Redeploy** (same process as adding)

3. **Verify removal**:
   - User can still login as regular user
   - "Administration" section disappears from Settings
   - Direct access to `/admin/*` returns "Access Denied"

## Security Features

### 1. Server-Side Validation
All admin API routes check permissions:
```typescript
const { userId } = await getAuthenticatedUserId();
const user = await dynamoDBUsers.get(userId);

if (!hasPermission(user, "admin:manage-users")) {
  return NextResponse.json({ error: "Access denied" }, { status: 403 });
}
```

### 2. Client-Side Hiding
UI elements conditionally render based on admin status:
```typescript
{userIsAdmin && (
  <AdminButton />
)}
```

### 3. Audit Logging
All admin actions are logged to `spotter-audit-logs`:
```typescript
await writeAuditLog({
  action: "admin.change-tier",
  actorId: userId,
  actorEmail: user.email,
  targetId: targetUserId,
  metadata: { oldTier, newTier }
});
```

### 4. Session-Based Authentication
- NextAuth session validates user on every request
- JWT tokens contain user ID and email
- Strong consistency reads from DynamoDB on token refresh

## Testing Admin Access

### Test 1: Admin User (acastrillo87@gmail.com)
1. Login with admin email
2. Navigate to Settings (`/settings`)
3. ✅ Should see "Administration" section with Shield icon
4. Click "Admin Panel"
5. ✅ Should navigate to `/admin/users`
6. ✅ Should see user list and admin controls

### Test 2: Regular User (any other email)
1. Login with non-admin email
2. Navigate to Settings (`/settings`)
3. ❌ Should NOT see "Administration" section
4. Try direct access to `/admin/users`
5. ❌ Should see "Access Denied" page
6. API calls to admin endpoints should return 403 Forbidden

### Test 3: Unauthenticated User
1. Not logged in
2. Try accessing `/admin/users`
3. ❌ Should redirect to login page

## Troubleshooting

### Issue: Admin user doesn't see Administration section

**Possible causes:**
1. Email doesn't match whitelist exactly (check case, spaces)
2. User logged in before whitelist was deployed
3. Cache issue in browser

**Solutions:**
1. Verify email in whitelist matches exactly
2. Logout and login again to refresh session
3. Clear browser cache or use incognito mode
4. Check server logs for RBAC checks

### Issue: "Access Denied" for admin user

**Possible causes:**
1. Whitelist not deployed to production
2. Session token not refreshed
3. Database read error

**Solutions:**
1. Verify deployment completed successfully
2. Force logout and login again
3. Check CloudWatch logs for auth errors
4. Verify DynamoDB table access

### Issue: Regular user can access admin panel

**Critical security issue - immediate action required:**

1. Check if whitelist is properly deployed
2. Verify RBAC functions are being called in admin routes
3. Review CloudWatch logs for unauthorized access
4. Consider rotating admin credentials

## Deployment Checklist

Before deploying admin access changes:

- [ ] Whitelist emails are correct in `ADMIN_EMAILS`
- [ ] Build completes successfully (`npm run build`)
- [ ] No TypeScript errors
- [ ] Tested locally with admin and non-admin users
- [ ] Admin button appears in Settings for admin users
- [ ] Admin button hidden for regular users
- [ ] Direct URL access properly blocked for non-admins
- [ ] Audit logging works for admin actions
- [ ] Session refresh after whitelist changes

## Best Practices

### 1. Minimal Admin Access
- Only add admins when absolutely necessary
- Use support role for limited admin tasks
- Review admin list regularly

### 2. Audit Trail
- All admin actions are logged
- Review audit logs regularly
- Monitor for suspicious activity

### 3. Secure Whitelist Management
- Keep `ADMIN_EMAILS` in version control
- Require code review for whitelist changes
- Document reason for adding/removing admins

### 4. Testing
- Test admin access after every deployment
- Verify regular users can't access admin features
- Check audit logs after admin actions

## Related Files

- [src/lib/rbac.ts](../src/lib/rbac.ts) - RBAC logic and whitelist
- [src/app/settings/page.tsx](../src/app/settings/page.tsx) - Admin button in settings
- [src/app/admin/users/page.tsx](../src/app/admin/users/page.tsx) - Admin users page
- [src/app/admin/logs/page.tsx](../src/app/admin/logs/page.tsx) - Admin logs page
- [src/app/admin/settings/page.tsx](../src/app/admin/settings/page.tsx) - Admin settings page
- [src/lib/audit-log.ts](../src/lib/audit-log.ts) - Audit logging

## Summary

**Admin Access**: Secured via email whitelist
**Current Admin**: acastrillo87@gmail.com
**Access Method**: Settings page → "Admin Panel" button
**Security**: Server-side validation + client-side hiding + audit logging
**Changes Required**: Code deployment (no database changes)
