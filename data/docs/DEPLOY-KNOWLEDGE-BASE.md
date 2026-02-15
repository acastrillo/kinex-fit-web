# Deploy Knowledge Base to AWS - Instructions

**Date**: January 8, 2025
**Feature**: JSON-based Exercise Knowledge Base
**Status**: Ready to deploy

---

## Overview

This deployment adds the exercise knowledge base to improve AI workout parsing accuracy. **No infrastructure changes required** - all logic runs in the existing Next.js server.

---

## What's Being Deployed

### New Files (included in Docker build):
- `src/lib/knowledge-base/exercises.json` (50+ exercises)
- `src/lib/knowledge-base/workout-formats.json` (8 formats)
- `src/lib/knowledge-base/exercise-matcher.ts` (fuzzy matching)

### Modified Files:
- `src/lib/ai/workout-enhancer.ts` (KB integration)

### No Changes Needed:
- ❌ No new environment variables
- ❌ No IAM permission changes
- ❌ No DynamoDB schema changes
- ❌ No CloudFormation updates
- ✅ Works with existing Bedrock setup

---

## Deployment Steps

### 1. Build Docker Image

```powershell
# Build Next.js production bundle
npm run build

# Build Docker image
docker build -t spotter-app:knowledge-base .

# Tag for ECR
docker tag spotter-app:knowledge-base 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:knowledge-base
docker tag spotter-app:knowledge-base 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
```

### 2. Push to ECR

```powershell
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 381491991512.dkr.ecr.us-east-1.amazonaws.com

# Push images
docker push 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:knowledge-base
docker push 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
```

### 3. Update ECS Service

```powershell
# Force new deployment (uses :latest tag)
aws ecs update-service `
  --cluster spotter-cluster `
  --service spotter-service `
  --force-new-deployment `
  --region us-east-1
```

### 4. Monitor Deployment

```powershell
# Watch service status
aws ecs describe-services `
  --cluster spotter-cluster `
  --services spotter-service `
  --region us-east-1 `
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount,status:status}'

# Watch task logs (wait ~2 minutes for new task to start)
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 5m --follow
```

---

## Quick Deploy Script

Save this as `deploy-kb.ps1`:

```powershell
#!/usr/bin/env pwsh

Write-Host "🚀 Deploying Knowledge Base to AWS..." -ForegroundColor Cyan

# Build
Write-Host "`n📦 Building Docker image..." -ForegroundColor Yellow
docker build -t spotter-app:knowledge-base .

# Tag
Write-Host "`n🏷️  Tagging images..." -ForegroundColor Yellow
docker tag spotter-app:knowledge-base 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:knowledge-base
docker tag spotter-app:knowledge-base 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# Login
Write-Host "`n🔐 Logging in to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 381491991512.dkr.ecr.us-east-1.amazonaws.com

# Push
Write-Host "`n⬆️  Pushing to ECR..." -ForegroundColor Yellow
docker push 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:knowledge-base
docker push 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# Deploy
Write-Host "`n🔄 Updating ECS service..." -ForegroundColor Yellow
aws ecs update-service `
  --cluster spotter-cluster `
  --service spotter-service `
  --force-new-deployment `
  --region us-east-1

Write-Host "`n✅ Deployment initiated!" -ForegroundColor Green
Write-Host "Monitor at: https://us-east-1.console.aws.amazon.com/ecs/v2/clusters/spotter-cluster/services/spotter-service" -ForegroundColor Cyan
```

Run with:
```powershell
.\deploy-kb.ps1
```

---

## Verification Steps

### 1. Health Check
```bash
curl https://kinexfit.com/api/health
# Should return: {"status":"healthy"}
```

### 2. Test Knowledge Base

Navigate to production app and test with HYROX EMOM workout:

**Input**:
```
EMOM 10 MIN
SkiErg 150M
Burpee broad jumps 10
Sled push 50M
Sled pull 50M
Run 1000M
Farmers carry 100M
Sandbag lunges 100M
Wall balls 75 shots
Row 1000M
```

**Expected Result**:
- ✅ 9 exercises (not 32+)
- ✅ Workout type: "EMOM"
- ✅ Structure: 10 rounds
- ✅ Correct names: "Ski Erg", "Burpee Broad Jump", etc.
- ✅ Preserved distances: "150M", "1000M"

### 3. Check Logs

```powershell
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 10m
```

Look for:
- No errors related to knowledge base imports
- Successful exercise matching (if logging enabled)

---

## Rollback Plan

If issues occur, rollback to previous version:

```powershell
# Find previous task definition
aws ecs describe-services `
  --cluster spotter-cluster `
  --services spotter-service `
  --region us-east-1 `
  --query 'services[0].taskDefinition'

# Update to previous task definition (e.g., revision 11)
aws ecs update-service `
  --cluster spotter-cluster `
  --service spotter-service `
  --task-definition spotter-task:11 `
  --region us-east-1
```

---

## Performance Impact

**Expected**:
- ✅ Negligible latency increase (~10ms for matching)
- ✅ No additional infrastructure cost
- ✅ Same AI enhancement response time (~1-2 seconds)

**Monitor**:
- CloudWatch metrics for ECS task CPU/memory
- Average response time for `/api/ai/enhance-workout`

---

## Post-Deployment Tasks

1. **Test real workouts** - Try OCR and Instagram imports
2. **Monitor accuracy** - Check if exercise names are standardized
3. **Gather feedback** - Ask users about workout parsing quality
4. **Expand database** - Add exercises based on user requests
5. **A/B test** - Compare with/without KB to measure improvement

---

## Expected Improvements

**Before KB**:
- ❌ HYROX EMOM: 32+ exercise rows
- ❌ Inconsistent names: "SkiErg", "skierg", "Ski Erg"
- ❌ Lost structure metadata
- ❌ Converted distances to time

**After KB**:
- ✅ HYROX EMOM: 9 exercise rows
- ✅ Standardized: "Ski Erg"
- ✅ Structure detected: EMOM, 10 rounds
- ✅ Preserved: "150M", "1000M"

---

## Files Modified Summary

```
src/
├── lib/
│   ├── ai/
│   │   └── workout-enhancer.ts         # Modified: KB integration
│   └── knowledge-base/                 # New directory
│       ├── exercises.json              # New: 50+ exercises
│       ├── workout-formats.json        # New: 8 formats
│       └── exercise-matcher.ts         # New: Fuzzy matching
```

**Total**: 3 new files, 1 modified file
**Lines of code**: ~850 total
**Infrastructure changes**: None

---

## Next Steps After Deployment

1. ✅ **Deploy to AWS** (follow steps above)
2. ✅ **Verify health check** passes
3. ✅ **Test HYROX EMOM** workout manually
4. 📋 **Monitor for 24 hours** - Check logs for errors
5. 📋 **Gather user feedback** - Ask about parsing accuracy
6. 📋 **Plan expansions**:
   - Add 200+ more exercises
   - Improve format detection
   - Add exercise suggestions to UI

---

## Support

If issues arise:
- Check CloudWatch logs: `/ecs/spotter-app`
- Review ECS service events
- Test locally with `npm run dev`
- Rollback if needed (see Rollback Plan above)

---

**Deployment Time Estimate**: 15-20 minutes
**Risk Level**: Low (no infrastructure changes)
**Rollback Time**: 5 minutes

🚀 Ready to deploy!
