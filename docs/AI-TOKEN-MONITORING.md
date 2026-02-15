# AI Token Usage Monitoring & Cost Tracking

This document describes the comprehensive token usage monitoring and cost tracking system for Spot Buddy's AI features.

## Overview

The system tracks:
- **Token usage** (input, output, cache tokens)
- **Costs** in USD per request and aggregated
- **Usage per subscription tier**
- **Usage caps** to prevent runaway costs
- **Per-user analytics** and history

## Architecture

### Components

1. **Usage Tracking Module** (`src/lib/ai/usage-tracking.ts`)
   - Log AI usage with full token and cost details
   - Check usage caps before allowing requests
   - Get user cost summaries
   - Reset monthly counters

2. **DynamoDB Tables**
   - `spotter-users` - User cost summary fields
   - `spotter-ai-usage` - Detailed usage logs (30-day TTL)

3. **API Endpoints**
   - `GET /api/user/ai-usage` - User's usage dashboard
   - `GET /api/admin/ai-cost-monitoring` - Admin cost analytics
   - `POST /api/admin/ai-cost-monitoring` - Adjust usage caps

4. **Bedrock Client Integration** (`src/lib/ai/bedrock-client.ts`)
   - Automatic logging of all AI requests
   - Cost calculation using model pricing
   - Support for prompt caching cost tracking

## Database Schema

### User Cost Fields

Added to `spotter-users` table:

```typescript
{
  currentMonthCost: number;        // Current month AI cost in USD
  currentMonthTokens: number;      // Current month token usage
  currentMonthRequests: number;    // Current month AI requests
  totalCost: number;               // All-time AI cost in USD
  totalTokens: number;             // All-time token usage
  totalRequests: number;           // All-time AI requests
  lastCostUpdate: string;          // Last cost update timestamp
  costResetMonth: string;          // Current cost tracking month (YYYY-MM)
}
```

### AI Usage Logs Table

`spotter-ai-usage` table structure:

```typescript
{
  userId: string;                  // Partition key
  requestId: string;               // Sort key (timestamp-uuid)
  timestamp: string;               // ISO timestamp
  operation: string;               // e.g., "generate-workout"
  model: string;                   // "opus" | "sonnet" | "haiku"

  // Token Usage
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  totalTokens: number;

  // Cost (USD)
  inputCost: number;
  outputCost: number;
  cacheCost?: number;
  totalCost: number;

  // Context
  subscriptionTier: string;
  workoutId?: string;
  success: boolean;
  errorType?: string;

  ttl: number;                     // Auto-delete after 30 days
}
```

**Indexes:**
- GSI: `timestamp-index` (userId, timestamp) - Query user history
- GSI: `tier-timestamp-index` (subscriptionTier, timestamp) - Admin tier analytics

## Usage Caps

Default caps per subscription tier:

```typescript
{
  free: {
    maxMonthlyRequests: 1,
    maxMonthlyCost: $0.10,
    maxMonthlyTokens: 10,000,
    warnThreshold: 80%
  },
  core: {
    maxMonthlyRequests: 10,
    maxMonthlyCost: $1.00,
    maxMonthlyTokens: 100,000,
    warnThreshold: 80%
  },
  pro: {
    maxMonthlyRequests: 30,
    maxMonthlyCost: $3.00,
    maxMonthlyTokens: 300,000,
    warnThreshold: 80%
  },
  elite: {
    maxMonthlyRequests: 100,
    maxMonthlyCost: $15.00,      // NEW: Elite tier cost cap
    maxMonthlyTokens: 1,000,000,
    warnThreshold: 90%
  }
}
```

### Cap Enforcement

1. **Request Count**: Traditional quota (e.g., 10 requests/month for Core)
2. **Cost Cap**: NEW - Prevents exceeding monthly cost budget
3. **Token Cap**: NEW - Prevents token abuse

Users hit ANY limit → requests blocked until next month.

## Setup

### 1. Create AI Usage Table

```bash
npx tsx scripts/create-ai-usage-table.ts
```

This creates the `spotter-ai-usage` DynamoDB table with:
- Proper indexes for querying
- TTL enabled (30-day retention)
- Provisioned capacity (5 RCU / 5 WCU)

### 2. Environment Variables

Add to `.env.local`:

```bash
DYNAMODB_AI_USAGE_TABLE=spotter-ai-usage
```

### 3. Verify Setup

Check that usage tracking is working:

```bash
# Make an AI request
curl -X POST http://localhost:3000/api/ai/generate-workout \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Upper body workout"}' \
  -H "Authorization: Bearer <token>"

# Check your usage
curl http://localhost:3000/api/user/ai-usage \
  -H "Authorization: Bearer <token>"
```

## API Usage

### User Usage Dashboard

**GET** `/api/user/ai-usage`

Returns user's current usage:

```json
{
  "success": true,
  "data": {
    "subscriptionTier": "pro",
    "currentMonth": {
      "requests": 15,
      "requestsLimit": 30,
      "requestsRemaining": 15,
      "tokens": 45230,
      "tokensLimit": 300000,
      "cost": 0.6789,
      "costLimit": 3.00,
      "costUSD": "$0.6789"
    },
    "allTime": {
      "requests": 127,
      "tokens": 385490,
      "cost": 5.78,
      "costUSD": "$5.78"
    },
    "usage": {
      "requestsPercent": 50,
      "tokensPercent": 15,
      "costPercent": 23
    },
    "limits": {
      "requestsPerMonth": 30,
      "tokensPerMonth": 300000,
      "costPerMonth": 3.00,
      "warnThreshold": 80
    },
    "status": {
      "canMakeRequest": true,
      "isNearLimit": false,
      "message": null
    },
    "recentUsage": [
      {
        "timestamp": "2026-01-05T10:30:00Z",
        "operation": "generate-workout",
        "tokens": 3500,
        "cost": 0.0525,
        "success": true
      }
    ],
    "resetDate": "2026-02-01T00:00:00Z"
  }
}
```

### Admin Cost Monitoring

**GET** `/api/admin/ai-cost-monitoring`

Returns aggregated cost analytics:

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalMonthCost": 245.67,
      "totalAllTimeCost": 1234.56,
      "totalMonthTokens": 8456789,
      "totalMonthRequests": 12453,
      "averageCostPerRequest": 0.0197,
      "averageCostPerUser": 2.45
    },
    "byTier": {
      "free": {
        "userCount": 150,
        "totalCost": 5.20,
        "averageCostPerUser": 0.035,
        "capLimit": 0.10,
        "utilizationPercent": 35
      },
      "core": { ... },
      "pro": { ... },
      "elite": {
        "userCount": 45,
        "totalCost": 178.50,
        "averageCostPerUser": 3.97,
        "capLimit": 15.00,
        "utilizationPercent": 26
      }
    },
    "topUsers": [
      {
        "userId": "user_123",
        "email": "power@user.com",
        "tier": "elite",
        "monthCost": 12.50,
        "monthTokens": 850000,
        "monthRequests": 87,
        "utilizationPercent": 83
      }
    ],
    "recommendations": [
      "Elite tier averaging $3.97/user - well below $15 cap",
      "Consider raising Elite cap to $20/month for power users"
    ]
  }
}
```

### Adjust Usage Caps

**POST** `/api/admin/ai-cost-monitoring`

```json
{
  "action": "adjust-caps",
  "tier": "elite",
  "newCostCap": 20.00,
  "newRequestCap": 150
}
```

## Cost Calculation

### Model Pricing (per 1M tokens)

| Model | Input | Output | Cache Read | Cache Write |
|-------|-------|--------|------------|-------------|
| Opus 4.5 | $15 | $75 | $1.50 | $18.75 |
| Sonnet 4.5 | $3 | $15 | $0.30 | $3.75 |
| Haiku 4.5 | $0.25 | $1.25 | $0.025 | $0.31 |

### Example Calculation

```
Request: 2,000 input tokens, 1,500 output tokens (Sonnet 4.5)

Input cost:  (2,000 / 1,000,000) * $3   = $0.0060
Output cost: (1,500 / 1,000,000) * $15  = $0.0225
Total:                                    $0.0285
```

## Monitoring Best Practices

### For Users

1. **Check your usage regularly** via `/api/user/ai-usage`
2. **Watch for warnings** when approaching 80% of cap
3. **Upgrade tier** if consistently hitting limits
4. **Review recent usage** to understand cost drivers

### For Admins

1. **Monitor tier utilization** weekly
2. **Review top users** monthly for anomalies
3. **Adjust caps** based on actual usage patterns
4. **Set up CloudWatch alarms** for cost thresholds:
   ```
   Total monthly cost > $500 → Alert
   Any user > 90% of cap → Warning
   Failed requests due to caps → Investigate
   ```

## Usage Patterns & Optimization

### Average Costs per Operation

Based on typical usage:

- **Workout Generation** (Sonnet): ~$0.015 per workout
- **Workout Enhancement** (3 agents): ~$0.025 per enhancement
  - Agent 1 (Haiku - organize): $0.002
  - Agent 2 (Sonnet - structure): $0.020
  - Agent 3 (Haiku - timer): $0.003

### Cost Projections per Tier

| Tier | Requests/Month | Avg Cost/Request | Monthly Cost | Cap | Margin |
|------|---------------|------------------|--------------|-----|--------|
| Free | 1 | $0.015 | $0.015 | $0.10 | 85% |
| Core | 10 | $0.015 | $0.15 | $1.00 | 85% |
| Pro | 30 | $0.015 | $0.45 | $3.00 | 85% |
| Elite | 100 | $0.015 | $1.50 | $15.00 | 90% |

**Safety margin**: Caps are 6-10x expected usage for burst protection.

## Troubleshooting

### User Can't Make Request

1. Check usage: `GET /api/user/ai-usage`
2. Look for `canMakeRequest: false`
3. Check `status.message` for specific limit hit
4. Options:
   - Wait until next month (automatic reset)
   - Upgrade to higher tier
   - Admin can manually reset via `/api/admin/reset-quotas`

### Usage Not Logging

1. Verify table exists: `aws dynamodb describe-table --table-name spotter-ai-usage`
2. Check environment variable: `DYNAMODB_AI_USAGE_TABLE=spotter-ai-usage`
3. Review CloudWatch logs for errors
4. Confirm IAM permissions for DynamoDB write

### Cost Seems Wrong

1. Check model used (Opus is 5x more expensive than Sonnet)
2. Verify prompt caching is working (reduces input cost by 90%)
3. Review usage logs: `GET /api/user/ai-usage` → `recentUsage[]`
4. Compare against Bedrock pricing: https://aws.amazon.com/bedrock/pricing/

## Monthly Reset Process

**Implemented**: Counters reset automatically on first usage in a new month (and when fetching usage).

1. `currentMonthCost` → 0
2. `currentMonthTokens` → 0
3. `currentMonthRequests` → 0
4. `costResetMonth` → new month (YYYY-MM)
5. `lastCostReset` → current timestamp

**Note**: Historical data (`totalCost`, `totalTokens`, `totalRequests`) is never reset. Admins can also reset via `/api/admin/reset-quotas`.

## Security Considerations

1. **Admin-only access** to cost monitoring endpoints
2. **User isolation**: Users can only see their own usage
3. **Rate limiting**: AI endpoints rate-limited to 30 req/hour
4. **TTL on logs**: Usage logs auto-delete after 30 days (privacy)
5. **Atomic operations**: Usage caps use DynamoDB conditions to prevent race conditions

## Future Enhancements

Planned features:

- [ ] Email notifications at 80% and 100% of cap
- [ ] Real-time cost dashboard UI
- [ ] Cost alerts via CloudWatch
- [ ] Usage analytics graphs (daily/weekly/monthly trends)
- [ ] Cost optimization recommendations
- [ ] Batch export of usage data (CSV/JSON)
- [ ] Per-team usage pooling for enterprise plans
- [ ] Dynamic cap adjustment based on payment history

## Support

For questions or issues:
- Check logs in CloudWatch
- Review DynamoDB table data
- Contact support with userId and timestamp
