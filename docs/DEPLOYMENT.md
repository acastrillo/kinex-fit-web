# Kinex Fit Deployment Guide

Complete guide for deploying Kinex Fit to AWS ECS.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed and running
- Stripe products created (see [STRIPE-SETUP.md](./STRIPE-SETUP.md))
- Environment variables configured

## Pre-Deployment Checklist

### 1. Stripe Setup
- [ ] Created 3 products in Stripe (Core, Pro, Elite)
- [ ] Copied all price IDs to `.env.local`
- [ ] Created webhook endpoint for production URL
- [ ] Copied webhook signing secret
- [ ] Verified setup with `npx tsx scripts/verify-stripe-prices.ts`

### 2. Environment Variables
Ensure these are set in AWS Systems Manager (SSM):

```bash
# Auth
AUTH_SECRET
NEXTAUTH_URL=https://kinexfit.com

# OAuth Providers
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET

# Stripe
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_CORE
STRIPE_PRICE_PRO
STRIPE_PRICE_ELITE
NEXT_PUBLIC_STRIPE_PRICE_CORE
NEXT_PUBLIC_STRIPE_PRICE_PRO
NEXT_PUBLIC_STRIPE_PRICE_ELITE

# AWS
AWS_REGION=us-east-1
DYNAMODB_AUDIT_TABLE=spotter-audit-logs
DYNAMODB_AI_USAGE_TABLE=spotter-ai-usage
DYNAMODB_SYSTEM_SETTINGS_TABLE=spotter-system-settings
DYNAMODB_USERS_TABLE=spotter-users
DYNAMODB_WORKOUTS_TABLE=spotter-workouts
DYNAMODB_WORKOUT_COMPLETIONS_TABLE=spotter-workout-completions
CLOUDWATCH_LOG_GROUP=/ecs/spotter-app
```

Update AWS SSM parameters:
```bash
# Windows (PowerShell):
.\scripts\update-aws-stripe-params.ps1

# Mac/Linux:
bash scripts/update-aws-stripe-params.sh
```

## Deployment Methods

### Option 1: Automated Deployment (Recommended)

Use the deployment scripts for streamlined updates:

**For routine updates to existing infrastructure:**
```bash
# Git Bash (Windows) or Mac/Linux terminal
bash scripts/update-deployment.sh

# OR Windows PowerShell
.\scripts\update-deployment.ps1
```

This script automatically:
1. Builds the Docker image
2. Tags and pushes to ECR
3. Updates the ECS service
4. Monitors deployment progress
5. Provides next steps

**For first-time deployment or infrastructure setup:**
```powershell
# Windows PowerShell only (creates all AWS infrastructure)
.\scripts\deploy-to-aws.ps1 -Region us-east-1 -ClusterName spotter-cluster
```

This creates:
- ECR repository
- ECS cluster and service
- Application Load Balancer
- Security groups
- IAM roles
- CloudWatch log group

### Option 2: Manual Deployment Steps

If you prefer manual control or need to troubleshoot:

#### 1. Build Docker Image

```bash
# Build the image
docker build -t spotter-app .

# Verify build was successful
docker images | grep spotter-app
```

#### 2. Push to Amazon ECR

```bash
# Tag for ECR
docker tag spotter-app:latest 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# Login to ECR
MSYS_NO_PATHCONV=1 aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 920013187591.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR
docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
```

#### 3. Update ECS Service

```bash
# Force new deployment
MSYS_NO_PATHCONV=1 aws ecs update-service \
  --cluster spotter-cluster \
  --service spotter-web-service \
  --force-new-deployment \
  --region us-east-1
```

### 4. Monitor Deployment

```bash
# Watch deployment status
MSYS_NO_PATHCONV=1 aws ecs describe-services \
  --cluster spotter-cluster \
  --services spotter-web-service \
  --region us-east-1 \
  --query 'services[0].deployments' \
  --output table

# View logs
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --follow --region us-east-1
```

## Post-Deployment Testing

### 1. Verify Application
- [ ] Visit https://kinexfit.com
- [ ] Confirm HTTP 200 response
- [ ] Check that sign-in page loads

### 2. Test Authentication
- [ ] Sign in with Google OAuth
- [ ] Sign in with Facebook OAuth
- [ ] Verify user profile shows correct name
- [ ] Sign out and sign in again (should reuse same user, no duplicates)

### 3. Test Subscription Flow
- [ ] Navigate to `/subscription`
- [ ] Click "Upgrade" on Core tier
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete checkout
- [ ] Verify redirect back to settings
- [ ] Confirm tier shows as "Core" with "Current Plan" badge
- [ ] Check that "Manage Subscription" button appears

### 4. Verify Webhook
```bash
# Check for successful webhook processing
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app \
  --region us-east-1 \
  --since 10m \
  --filter-pattern "Webhook"
```

Expected log entries:
- `[Webhook:evt_xxx] Successfully updated user <uuid> subscription to core`
- No "User not found" errors

### 5. Verify Database Updates
```bash
# Check user count and subscription tier
node scripts/list-all-users.mjs

# Verify single user (no duplicates)
node scripts/verify-single-user.mjs your-email@example.com
```

## Troubleshooting

### Build Failures

**Issue**: Docker build fails
```bash
# Check Docker is running
docker ps

# Clean Docker cache
docker system prune -a

# Rebuild
docker build -t spotter-app .
```

### Deployment Issues

**Issue**: ECS service not updating
```bash
# Check service events
MSYS_NO_PATHCONV=1 aws ecs describe-services \
  --cluster spotter-cluster \
  --services spotter-web-service \
  --region us-east-1 \
  --query 'services[0].events[0:5]'
```

**Issue**: Task failing to start
```bash
# Check task definition
MSYS_NO_PATHCONV=1 aws ecs describe-task-definition \
  --task-definition spotter-app-task \
  --region us-east-1

# View stopped tasks
MSYS_NO_PATHCONV=1 aws ecs list-tasks \
  --cluster spotter-cluster \
  --desired-status STOPPED \
  --region us-east-1
```

### Application Errors

**Issue**: "No such price" error
- Verify price IDs in AWS SSM match Stripe Dashboard
- Check both `STRIPE_PRICE_*` and `NEXT_PUBLIC_STRIPE_PRICE_*` are set
- Run `npx tsx scripts/verify-stripe-prices.ts` locally

**Issue**: Webhook not receiving events
- Verify webhook endpoint in Stripe Dashboard: `https://kinexfit.com/api/stripe/webhook`
- Check webhook signing secret in AWS SSM
- Test webhook in Stripe Dashboard ("Send test webhook")

**Issue**: Duplicate users still being created
```bash
# Check auth logs
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app \
  --region us-east-1 \
  --filter-pattern "Auth:SignIn"
```
Should see `[Auth:SignIn] ✓ Existing user found` on repeat sign-ins

**Issue**: Subscription not updating in app
1. Check webhook logs in Stripe Dashboard
2. Verify webhook events are being delivered (status 200)
3. Check application logs for webhook processing errors
4. Try signing out and back in to refresh session

## Rollback Procedure

If deployment fails:

```bash
# 1. List recent task definitions
MSYS_NO_PATHCONV=1 aws ecs list-task-definitions \
  --family-prefix spotter-app-task \
  --region us-east-1

# 2. Update service to previous task definition
MSYS_NO_PATHCONV=1 aws ecs update-service \
  --cluster spotter-cluster \
  --service spotter-web-service \
  --task-definition spotter-app-task:PREVIOUS_REVISION \
  --force-new-deployment \
  --region us-east-1
```

## Local Docker Testing

Before deploying to production, you can test the Docker build locally:

### Using Docker Compose
```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# Stop
docker-compose down
```

### Using Docker directly
```bash
# Build
docker build -t spotter-app .

# Run (with environment variables from .env.local)
docker run -p 3000:3000 --env-file .env.local spotter-app

# Access at http://localhost:3000
```

This allows you to verify:
- Docker build completes successfully
- Application starts without errors
- Dependencies are properly included
- Prisma client generation works
- Next.js standalone mode functions correctly

## Production Monitoring

### Key Metrics to Watch

```bash
# Monitor logs continuously
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app \
  --follow \
  --region us-east-1 \
  --filter-pattern "ERROR OR Webhook OR Auth:SignIn"

# Check service health
MSYS_NO_PATHCONV=1 aws ecs describe-services \
  --cluster spotter-cluster \
  --services spotter-web-service \
  --region us-east-1 \
  --query 'services[0].[runningCount,desiredCount,deployments]'
```

### Webhook Monitoring

Monitor webhook delivery in Stripe Dashboard:
- https://dashboard.stripe.com/test/webhooks (test mode)
- https://dashboard.stripe.com/webhooks (live mode)

Look for:
- Response times < 5 seconds
- Status codes: 200 (success)
- No timeout errors

## Quick Command Reference

```bash
# Build and deploy (full process)
docker build -t spotter-app .
docker tag spotter-app:latest 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
MSYS_NO_PATHCONV=1 aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 920013187591.dkr.ecr.us-east-1.amazonaws.com
docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
MSYS_NO_PATHCONV=1 aws ecs update-service --cluster spotter-cluster --service spotter-web-service --force-new-deployment --region us-east-1

# Monitor
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --follow --region us-east-1

# Database operations
node scripts/list-all-users.mjs
node scripts/verify-single-user.mjs <email>
node scripts/delete-all-users.mjs --confirm

# Stripe verification
npx tsx scripts/test-stripe-connection.ts
npx tsx scripts/verify-stripe-prices.ts
npx tsx scripts/list-all-stripe-products.ts
```

## Deployment Scripts Reference

### update-deployment.sh / update-deployment.ps1
**Purpose:** Quick deployment to existing AWS infrastructure (most common use case)

**When to use:**
- Deploying code changes to production
- Updating the running application
- After merging new features

**Features:**
- Builds Docker image
- Pushes to ECR
- Updates ECS service
- Monitors deployment progress
- Shows deployment status and next steps

**Usage:**
```bash
# Bash (Git Bash on Windows, Mac/Linux terminal)
bash scripts/update-deployment.sh

# PowerShell (Windows)
.\scripts\update-deployment.ps1
```

**Time:** 5-8 minutes (includes build, push, and deployment monitoring)

### deploy-to-aws.ps1
**Purpose:** Full AWS infrastructure setup (first-time deployment only)

**When to use:**
- Initial deployment to a new AWS account
- Setting up a new environment (dev, staging, prod)
- Recreating infrastructure from scratch

**Creates:**
- ECR repository
- ECS cluster (`spotter-cluster`)
- ECS service (`spotter-web-service`)
- Application Load Balancer
- Security groups
- IAM roles (execution + task)
- CloudWatch log group
- Target group with health checks

**Usage:**
```powershell
# Windows PowerShell only
.\scripts\deploy-to-aws.ps1 -Region us-east-1 -ClusterName spotter-cluster
```

**Time:** 10-15 minutes (includes infrastructure creation)

**Important:** After running this script, you need to:
1. Set up Route53 DNS to point to the ALB
2. Configure SSL certificate in AWS Certificate Manager
3. Update NEXTAUTH_URL in SSM parameters
4. Configure Stripe webhook endpoint

### docker-compose.yml
**Purpose:** Local Docker testing before production deployment

**When to use:**
- Testing Docker build locally
- Verifying application runs in containerized environment
- Debugging Docker-specific issues

**Usage:**
```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# Stop
docker-compose down
```

### When to Use Which Script

| Scenario | Script | Notes |
|----------|--------|-------|
| Daily/weekly code updates | `update-deployment.sh` or `.ps1` | Most common |
| First AWS deployment | `deploy-to-aws.ps1` | One-time setup |
| New environment setup | `deploy-to-aws.ps1` | Creates all infrastructure |
| Local testing | `docker-compose up` | Before production push |
| Infrastructure changes | Manual AWS Console | Scripts don't modify existing infrastructure |

## Related Documentation

- [STRIPE-SETUP.md](./STRIPE-SETUP.md) - Setting up Stripe products
- [STRIPE-LIVE-MODE-SETUP.md](./STRIPE-LIVE-MODE-SETUP.md) - Switching to live mode
- [MONITORING-GUIDE.md](./MONITORING-GUIDE.md) - Production monitoring
