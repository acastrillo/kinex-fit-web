# Domain Migration: spotter.cannashieldct.com → kinexfit.com

## Migration Status: ✅ 80% Complete

### ✅ Completed Steps

1. **SSL Certificate** - ISSUED ✅
   - Certificate ARN: `arn:aws:acm:us-east-1:920013187591:certificate/a82336c8-5c1e-4b2f-9208-8e3d0812e298`
   - Covers: `kinexfit.com` and `www.kinexfit.com`
   - Status: ISSUED and ready to use

2. **Load Balancer Updated** ✅
   - Added kinexfit.com certificate to listener
   - Set as default certificate on HTTPS listener (port 443)
   - ALB: `spotter-alb-56827129.us-east-1.elb.amazonaws.com`

3. **DNS Configuration** ✅
   - Created A records for `kinexfit.com` → ALB
   - Created A records for `www.kinexfit.com` → ALB
   - DNS propagation may take 5-15 minutes

4. **Code Updates** ✅
   - Updated all source files (`src/lib/auth-options.ts`, `next.config.ts`, etc.)
   - Updated cookie domains to `.kinexfit.com`
   - Updated image domains
   - Updated Playwright test configuration
   - Updated all documentation files

5. **ECS Task Definition** ✅
   - Registered new task definition (revision 15)
   - Updated `NEXTAUTH_URL` to `https://kinexfit.com`

### ⏳ Manual Steps Required

#### 1. Google OAuth Configuration
**Action Required:** Update redirect URIs in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Update Authorized JavaScript origins:
   - Add: `https://kinexfit.com`
   - Add: `https://www.kinexfit.com`
4. Update Authorized redirect URIs:
   - Add: `https://kinexfit.com/api/auth/callback/google`
   - Add: `https://www.kinexfit.com/api/auth/callback/google`
5. Save changes

#### 2. Facebook Login Configuration
**Action Required:** Update Facebook App settings

1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Select your app
3. Go to **Settings → Basic**
4. Update Website URL to: `https://kinexfit.com`
5. Go to **Facebook Login → Settings**
6. Update Valid OAuth Redirect URIs:
   - Add: `https://kinexfit.com/api/auth/callback/facebook`
   - Add: `https://www.kinexfit.com/api/auth/callback/facebook`
7. Save changes

#### 3. Stripe Webhook URL
**Action Required:** Update webhook endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Find your existing webhook or create a new one
3. Update endpoint URL to: `https://kinexfit.com/api/stripe/webhook`
4. Ensure these events are selected:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Save and get the new webhook signing secret if creating a new webhook
6. If webhook secret changed, update in AWS SSM:
   ```bash
   MSYS_NO_PATHCONV=1 aws ssm put-parameter \
     --name "/spotter-app/STRIPE_WEBHOOK_SECRET" \
     --value "whsec_3K71u5YEAYshe71WFiOozzbARZjBmlce" \
     --type "SecureString" \
     --overwrite
   ```

#### 4. Deploy Updated Application
**Note:** ECS cluster currently shows no running services. You'll need to either:

**Option A: Create new ECS service (if none exists)**
```bash
# This would need the full service creation command
# Let me know if you need help with this
```

**Option B: Update existing service (if it was stopped)**
```bash
# Find and restart the service with new task definition
aws ecs list-services --cluster spotter-cluster
aws ecs update-service \
  --cluster spotter-cluster \
  --service YOUR_SERVICE_NAME \
  --task-definition spotter-app-task:15 \
  --force-new-deployment
```

**Option C: Run a standalone task for testing**
```bash
# Test the new configuration with a standalone task first
MSYS_NO_PATHCONV=1 aws ecs run-task \
  --cluster spotter-cluster \
  --task-definition spotter-app-task:15 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-07a36534ecdd14f6a,subnet-08714e5a007a57abb,subnet-0ab4bd78134956377],securityGroups=[sg-0c70c633707faaa3b],assignPublicIp=ENABLED}" \
  --launch-type FARGATE
```

### 📋 Verification Checklist

Once deployment is complete, verify:

- [ ] Visit `https://kinexfit.com` - should load the app
- [ ] Visit `https://www.kinexfit.com` - should load the app
- [ ] Test Google OAuth login
- [ ] Test Facebook OAuth login
- [ ] Test email/password login
- [ ] Check that cookies are set with `.kinexfit.com` domain
- [ ] Test a subscription checkout flow (webhook should work)
- [ ] Check AWS CloudWatch logs for any domain-related errors

### 🔄 Rollback Plan (if needed)

If issues arise, you can quickly rollback:

1. Update load balancer to use old certificate
2. Point DNS back to old domain (or wait for TTL)
3. Revert task definition to revision 14
4. Force new deployment with old task definition

### 📝 Additional Notes

- **Old domain:** The old domain (spotter.cannashieldct.com) will continue to work temporarily since the old certificate is still attached to the load balancer
- **Session cookies:** Users may need to log in again due to the cookie domain change
- **DNS TTL:** DNS changes may take up to 15 minutes to propagate globally
- **Domain branding:** All code, docs, and configs updated to reflect "Kinex Fit" branding

### 🎯 Next Steps

1. Complete the 3 manual steps above (Google OAuth, Facebook, Stripe)
2. Deploy the application using one of the options in step 4
3. Run through the verification checklist
4. Monitor CloudWatch logs for the first 30 minutes
5. Test all authentication flows
6. Announce the domain change to users if needed

---

**Migration Date:** January 5, 2026
**New Domain:** https://kinexfit.com
**Task Definition:** spotter-app-task:15
**Certificate:** ISSUED and active
