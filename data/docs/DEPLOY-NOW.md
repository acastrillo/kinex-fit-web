# Deploy Knowledge Base to AWS - Quick Start

**Status**: Ready to deploy
**Date**: January 8, 2025

---

## Pre-Deployment Checklist

✅ Code committed to GitHub
✅ Knowledge base files created
✅ Documentation complete
🔲 Docker Desktop running
🔲 AWS credentials configured

---

## Step-by-Step Deployment

### 1. Ensure Docker Desktop is Running

```powershell
# Start Docker Desktop (if not already running)
start "Docker Desktop" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Wait 30-60 seconds for Docker to start, then verify:
docker ps
# Should show running containers (or empty list, but no errors)
```

### 2. Build Docker Image

```powershell
cd C:\spot-buddy-web

# Build the image (takes 3-5 minutes)
docker build -t spotter-app:knowledge-base .

# Verify build succeeded
docker images spotter-app
```

**Expected output**:
```
REPOSITORY      TAG              IMAGE ID       CREATED         SIZE
spotter-app     knowledge-base   abc123...      2 minutes ago   1.2GB
```

### 3. Tag Images for ECR

```powershell
# Tag with version
docker tag spotter-app:knowledge-base 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:knowledge-base

# Tag as latest
docker tag spotter-app:knowledge-base 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# Verify tags
docker images | grep spotter-app
```

### 4. Login to AWS ECR

```powershell
# Get ECR login token and login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 381491991512.dkr.ecr.us-east-1.amazonaws.com
```

**Expected output**:
```
Login Succeeded
```

### 5. Push to ECR

```powershell
# Push knowledge-base tag
docker push 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:knowledge-base

# Push latest tag (ECS uses this)
docker push 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
```

This takes 2-5 minutes depending on your internet speed.

**Expected output**:
```
The push refers to repository [381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app]
...
knowledge-base: digest: sha256:abc123... size: 4567
```

### 6. Update ECS Service

```powershell
# Force new deployment with latest image
aws ecs update-service `
  --cluster spotter-cluster `
  --service spotter-service `
  --force-new-deployment `
  --region us-east-1
```

**Expected output** (JSON with service details):
```json
{
  "service": {
    "serviceName": "spotter-service",
    "status": "ACTIVE",
    "desiredCount": 1,
    ...
  }
}
```

### 7. Monitor Deployment (Optional but Recommended)

```powershell
# Watch service status
aws ecs describe-services `
  --cluster spotter-cluster `
  --services spotter-service `
  --region us-east-1 `
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}'
```

**Wait for**:
- `pending: 1` (new task starting)
- `running: 2` (old + new task)
- `running: 1` (old task stopped, new task healthy)

This takes ~3-5 minutes.

### 8. Check Logs

```powershell
# View latest logs (after new task starts)
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 5m

# Follow logs in real-time
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 5m --follow
```

**Look for**:
- ✅ No import errors for knowledge base files
- ✅ Server listening on port 3000
- ✅ Health check passing

### 9. Verify Deployment

```powershell
# Test health endpoint
curl https://kinexfit.com/api/health
```

**Expected**:
```json
{"status":"healthy"}
```

---

## Test the Knowledge Base

### Manual Test on Production:

1. **Navigate to**: https://kinexfit.com/add/edit

2. **Paste this workout**:
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

3. **Click "Enhance with AI"**

4. **Verify Results**:
   - ✅ 9 exercise rows (not 32+)
   - ✅ Workout type shows "EMOM"
   - ✅ Structure shows 10 rounds
   - ✅ Exercise names standardized:
     - "Ski Erg" (not "SkiErg")
     - "Burpee Broad Jump"
     - "Sled Push"
     - "Sled Pull"
     - "Running"
     - "Farmers Carry"
     - "Sandbag Lunge"
     - "Wall Ball"
     - "Rowing Machine"
   - ✅ Distances preserved: "150M", "1000M", "100M"

---

## Troubleshooting

### Docker Not Starting

```powershell
# Check if Docker is running
docker ps

# If error, restart Docker Desktop
taskkill /F /IM "Docker Desktop.exe"
start "Docker Desktop" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Wait 60 seconds, then try again
```

### ECR Login Failed

```powershell
# Verify AWS credentials
aws sts get-caller-identity

# Should show your AWS account details
```

### Deployment Taking Too Long

```powershell
# Check ECS service events
aws ecs describe-services `
  --cluster spotter-cluster `
  --services spotter-service `
  --region us-east-1 `
  --query 'services[0].events[:5]'

# Look for errors or stuck tasks
```

### Health Check Fails

```powershell
# Check task status
aws ecs list-tasks --cluster spotter-cluster --service-name spotter-service --region us-east-1

# Get task ARN from above, then check logs:
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 10m
```

---

## Rollback (If Needed)

```powershell
# List task definitions
aws ecs list-task-definitions --family-prefix spotter-task --region us-east-1

# Update to previous revision (replace :12 with actual previous)
aws ecs update-service `
  --cluster spotter-cluster `
  --service spotter-service `
  --task-definition spotter-task:11 `
  --region us-east-1
```

---

## Complete Deployment Command Sequence

```powershell
# Copy and paste these commands one by one:

# 1. Build
docker build -t spotter-app:knowledge-base .

# 2. Tag
docker tag spotter-app:knowledge-base 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:knowledge-base
docker tag spotter-app:knowledge-base 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# 3. Login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 381491991512.dkr.ecr.us-east-1.amazonaws.com

# 4. Push
docker push 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:knowledge-base
docker push 381491991512.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# 5. Deploy
aws ecs update-service --cluster spotter-cluster --service spotter-service --force-new-deployment --region us-east-1

# 6. Verify
curl https://kinexfit.com/api/health

# 7. Monitor
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --region us-east-1 --since 5m --follow
```

---

## Success Criteria

✅ Health check returns `{"status":"healthy"}`
✅ No errors in CloudWatch logs
✅ HYROX EMOM creates 9 exercises (not 32+)
✅ Exercise names are standardized
✅ Workout type detected as "EMOM"
✅ Distances preserved ("150M", "1000M")

---

## Time Estimate

- **Docker build**: 3-5 minutes
- **Push to ECR**: 2-5 minutes
- **ECS deployment**: 3-5 minutes
- **Testing**: 2-3 minutes

**Total**: 10-18 minutes

---

**Ready to deploy!** 🚀

Follow the commands above in PowerShell and let me know if you encounter any issues.
