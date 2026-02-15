# AWS Bedrock Model Access Setup Guide

## Problem

You're seeing this error when using the "Enhance with AI" feature:

```
Model access is denied due to IAM user or service role is not authorized
to perform the required AWS Marketplace actions (aws-marketplace:ViewSubscriptions,
aws-marketplace:Subscribe) to enable access to this model.
```

## Root Cause

AWS Bedrock requires **two separate** configurations:

1. **IAM Permissions** ✅ (Already configured)
   - Your IAM role has the correct `aws-marketplace:*` permissions
   - This was fixed in the recent deployment

2. **Model Access Request** ❌ (Needs to be done)
   - **Model access must be explicitly requested through the AWS Console**
   - This is a one-time setup per AWS account
   - Cannot be done via CLI or IaC - must use AWS Console UI

## Solution: Enable Model Access

### Step 1: Open Bedrock Console

Navigate to the Bedrock Model Access page:

🔗 **Direct Link**: https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess

Or manually:
1. Go to AWS Console
2. Search for "Bedrock" in the services search bar
3. Click on "Amazon Bedrock"
4. In the left sidebar, click "Model access" under "Bedrock configurations"

### Step 2: Request Model Access

1. Click the **"Manage model access"** or **"Request model access"** button (top right)

2. Find the **Anthropic** section and enable these models:
   - ✅ **Claude 4.5 Haiku** (Required - used for fast processing)
   - ✅ **Claude 4.5 Sonnet** (Required - used for main AI tasks)
   - ⚪ **Claude 4.5 Opus** (Optional - premium model for future use)

3. **Accept the Anthropic End User License Agreement (EULA)**

4. Click **"Request model access"** or **"Save changes"**

### Step 3: Wait for Access to be Granted

- Access is usually granted **instantly** (within 1-2 minutes)
- You'll see the status change from "Available to request" → "Access granted" ✅
- No email confirmation is sent - just refresh the page to check status

### Step 4: Test the Fix

1. Wait 1-2 minutes after seeing "Access granted"
2. Return to your Spot Buddy app
3. Try the **"Enhance with AI"** feature again
4. The error should be resolved ✅

## Verification

Run this script to verify your setup:

```powershell
.\scripts\check-bedrock-model-access.ps1
```

This will check:
- ✅ AWS credentials
- ✅ IAM role permissions
- ✅ Available Claude models
- ✅ Cross-region inference profiles

## Why Is This Needed?

AWS Bedrock requires explicit model access for two reasons:

1. **EULA Acceptance**: Anthropic requires you to accept their terms of service
2. **Usage Tracking**: AWS tracks which accounts have requested access to which models
3. **Marketplace Subscription**: Some models are marketplace offerings that require explicit opt-in

This is a **security feature** to ensure:
- You acknowledge the terms of service for AI models
- You explicitly choose which models your account can access
- Unauthorized accounts cannot incur charges for premium models

## Important Notes

- 🔒 **Model access is account-wide**: Once enabled, all IAM roles/users in the account can use the models (subject to IAM permissions)
- 🌍 **Model access is region-specific**: You may need to enable access in each region where you plan to use Bedrock
- 💰 **No additional cost**: Enabling model access is free - you only pay for actual API usage
- ⏱️ **One-time setup**: You only need to do this once per AWS account (per region)

## Troubleshooting

### Still seeing errors after enabling access?

1. **Wait 5 minutes**: Sometimes AWS needs a few minutes to propagate the change
2. **Clear cache**: Try restarting your ECS task:
   ```bash
   aws ecs update-service --cluster SpotterCluster --service spotter-app --force-new-deployment --region us-east-1
   ```
3. **Verify region**: Ensure you enabled model access in `us-east-1` (or your configured region)
4. **Check logs**: View ECS logs to see the exact error:
   ```bash
   aws logs tail /ecs/spotter-app --region us-east-1 --since 10m --follow
   ```

### Can't access Bedrock console?

You need these IAM permissions to access the Bedrock console:
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:ListFoundationModels",
    "bedrock:GetFoundationModel",
    "bedrock:ListProvisionedModelThroughputs",
    "bedrock:GetModelInvocationLoggingConfiguration"
  ],
  "Resource": "*"
}
```

Contact your AWS administrator if you don't have console access.

## References

- [AWS Bedrock Model Access Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)
- [Anthropic Claude on AWS Bedrock](https://docs.anthropic.com/en/api/claude-on-amazon-bedrock)
- [AWS Marketplace Subscriptions](https://docs.aws.amazon.com/marketplace/latest/buyerguide/buyer-subscribing-to-products.html)

## Support

If you continue to experience issues after following this guide:

1. Run the diagnostic script: `.\scripts\check-bedrock-model-access.ps1`
2. Check CloudWatch logs: `/ecs/spotter-app`
3. Verify IAM role: `SpotterTaskRole` has `BedrockAndDynamoDBAccess` policy
4. Contact AWS Support if model access request is stuck in "Pending" status

---

**Last Updated**: 2025-12-29
**Related Commit**: cf6c6fa - "fix: add AWS Marketplace permissions to IAM role for Bedrock Claude models"
