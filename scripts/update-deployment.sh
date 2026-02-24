#!/bin/bash
# Quick deployment script for Kinex Fit to AWS ECS
# This script updates an existing deployment (does not create new infrastructure)

set -e  # Exit on any error

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# AWS Configuration
REGION="us-east-1"
ACCOUNT_ID="920013187591"
ECR_REPO="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/spotter-app"
CLUSTER_NAME="spotter-cluster"
SERVICE_NAME="spotter-web-service"
APP_URL="https://kinexfit.com"

echo -e "${GREEN}🚀 Starting Kinex Fit deployment to AWS ECS...${NC}"
echo ""

# Step 1: Build Docker image
echo -e "${YELLOW}📦 Step 1/6: Building Docker image...${NC}"
docker build -t spotter-app .
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker image built successfully${NC}"
echo ""

# Step 2: Tag image for ECR
echo -e "${YELLOW}🏷️  Step 2/6: Tagging image for ECR...${NC}"
docker tag spotter-app:latest "$ECR_REPO:latest"
echo -e "${GREEN}✅ Image tagged: $ECR_REPO:latest${NC}"
echo ""

# Step 3: Login to ECR
echo -e "${YELLOW}🔐 Step 3/6: Logging into Amazon ECR...${NC}"
MSYS_NO_PATHCONV=1 aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ECR login failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Logged into ECR successfully${NC}"
echo ""

# Step 4: Push image to ECR
echo -e "${YELLOW}📤 Step 4/6: Pushing image to ECR...${NC}"
docker push "$ECR_REPO:latest"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to push image to ECR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Image pushed to ECR successfully${NC}"
echo ""

# Step 5: Update ECS service
echo -e "${YELLOW}🔄 Step 5/6: Updating ECS service...${NC}"
MSYS_NO_PATHCONV=1 aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment \
  --region $REGION \
  --output json > /dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to update ECS service${NC}"
    exit 1
fi
echo -e "${GREEN}✅ ECS service update initiated${NC}"
echo ""

# Step 6: Monitor deployment
echo -e "${YELLOW}⏳ Step 6/6: Monitoring deployment (this may take 2-5 minutes)...${NC}"
echo -e "${BLUE}Waiting for deployment to complete...${NC}"

# Poll deployment status
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    DEPLOYMENT_STATUS=$(MSYS_NO_PATHCONV=1 aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services $SERVICE_NAME \
        --region $REGION \
        --query 'services[0].deployments[?status==`PRIMARY`] | [0].rolloutState' \
        --output text)

    if [ "$DEPLOYMENT_STATUS" == "COMPLETED" ]; then
        echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
        break
    elif [ "$DEPLOYMENT_STATUS" == "FAILED" ]; then
        echo -e "${RED}❌ Deployment failed${NC}"
        echo -e "${YELLOW}Check service events:${NC}"
        echo -e "${BLUE}aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION --query 'services[0].events[0:5]'${NC}"
        exit 1
    else
        echo -e "${BLUE}Deployment status: $DEPLOYMENT_STATUS (attempt $((ATTEMPT + 1))/$MAX_ATTEMPTS)${NC}"
        sleep 10
    fi

    ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${YELLOW}⚠️  Deployment monitoring timed out, but deployment may still be in progress${NC}"
    echo -e "${BLUE}Check status: aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment process completed!${NC}"
echo ""
echo -e "${GREEN}📝 Next Steps:${NC}"
echo -e "1. Visit your app: ${BLUE}$APP_URL${NC}"
echo -e "2. Monitor logs: ${BLUE}aws logs tail /ecs/spotter-app --follow --region $REGION${NC}"
echo -e "3. Check service: ${BLUE}aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION${NC}"
echo ""
