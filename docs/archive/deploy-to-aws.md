# AWS Deployment Commands

## Building now in background...

Once the build completes, run these commands:

```bash
# 1. Tag the image for ECR
docker tag spotter-app:latest 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# 2. Login to ECR
MSYS_NO_PATHCONV=1 aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 920013187591.dkr.ecr.us-east-1.amazonaws.com

# 3. Push to ECR
docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# 4. Force new deployment in ECS
MSYS_NO_PATHCONV=1 aws ecs update-service --cluster spotter-cluster --service spotter-service --force-new-deployment --region us-east-1

# 5. Monitor the deployment
MSYS_NO_PATHCONV=1 aws ecs describe-services --cluster spotter-cluster --services spotter-service --region us-east-1 --query 'services[0].deployments' --output table

# 6. Watch logs
MSYS_NO_PATHCONV=1 aws logs tail /ecs/spotter-app --follow --region us-east-1
```

## What's updated:
- ✅ Stripe API keys (correct account)
- ✅ Stripe price IDs (Core, Pro, Elite)
- ✅ Stripe webhook secret
- ✅ User details bug fixed
- ✅ Sign out button fixed

## After deployment test:
1. Go to https://kinexfit.com
2. Sign in with Google/Facebook
3. Navigate to /subscription
4. Try subscribing to Core ($7.99)
5. Use test card: 4242 4242 4242 4242
6. Verify subscription updates
