# Subscription Metrics Tracking

This document outlines the metrics tracking system for Spot Buddy's subscription and conversion analytics.

## Overview

The metrics tracking system captures key events throughout the user journey to enable data-driven decision making on:
- Conversion optimization (free → paid)
- Retention analysis (Day 7, 30, 90)
- Feature usage patterns
- Revenue analytics
- Churn prevention

## Metrics Infrastructure

**File**: [`src/lib/metrics.ts`](../src/lib/metrics.ts)

The `AppMetrics` object provides a centralized interface for tracking all application events. Metrics are automatically:
- Logged in development
- Flushed every 60 seconds in production
- Sent to CloudWatch (or your configured monitoring service)

## Tracked Metrics

### 1. Subscription Lifecycle Metrics

#### `subscription.checkout_started`
Triggered when a user clicks "Upgrade" and initiates Stripe checkout.

```typescript
AppMetrics.subscriptionCheckoutStarted(userId, tier, billingPeriod)
```

**Dimensions**:
- `userId`: User identifier
- `tier`: `'core'`, `'pro'`, or `'elite'`
- `billingPeriod`: `'monthly'` or `'annual'`

**Location**: [`src/app/api/stripe/checkout/route.ts:98`](../src/app/api/stripe/checkout/route.ts#L98)

**Use Case**: Calculate checkout abandonment rate

---

#### `subscription.checkout_completed`
Triggered when Stripe confirms a successful subscription payment.

```typescript
AppMetrics.subscriptionCheckoutCompleted(userId, tier, billingPeriod, priceAmount)
```

**Dimensions**:
- `userId`: User identifier
- `tier`: Subscription tier
- `billingPeriod`: Billing period
- `priceAmount`: Revenue in USD (as count metric)

**Location**: [`src/app/api/stripe/webhook/route.ts:121`](../src/app/api/stripe/webhook/route.ts#L121)

**Use Cases**:
- Track successful conversions
- Calculate revenue by tier
- Measure monthly vs annual preference

---

#### `subscription.canceled`
Triggered when a user cancels their subscription.

```typescript
AppMetrics.subscriptionCanceled(userId, tier, reason)
```

**Dimensions**:
- `userId`: User identifier
- `tier`: Tier being canceled
- `reason`: Cancellation reason from Stripe (e.g., `'customer_canceled'`, `'payment_failed'`)

**Location**: [`src/app/api/stripe/webhook/route.ts:191`](../src/app/api/stripe/webhook/route.ts#L191)

**Use Case**: Churn analysis and prevention strategies

---

#### `subscription.upgraded`
Triggered when a user upgrades from one tier to a higher tier.

```typescript
AppMetrics.subscriptionUpgraded(userId, fromTier, toTier)
```

**Dimensions**:
- `userId`: User identifier
- `fromTier`: Previous tier
- `toTier`: New tier

**Use Case**: Measure upsell success

---

#### `subscription.downgraded`
Triggered when a user downgrades to a lower tier.

```typescript
AppMetrics.subscriptionDowngraded(userId, fromTier, toTier)
```

**Use Case**: Identify features causing downgrades

---

#### `subscription.renewed`
Triggered when a subscription successfully renews (annual or monthly).

```typescript
AppMetrics.subscriptionRenewed(userId, tier, billingPeriod)
```

**Use Case**: Retention analysis

---

### 2. Feature Usage Metrics

#### `feature.instagram_import`
Triggered when a user attempts to import a workout from Instagram.

```typescript
AppMetrics.instagramImportUsed(userId, tier, success)
```

**Dimensions**:
- `userId`: User identifier
- `tier`: Current subscription tier
- `success`: `true` or `false`

**Use Cases**:
- **Critical**: Track Instagram feature usage percentage
- Identify which tiers use it most
- Correlate with conversion (do free users who try it convert?)

---

#### `feature.ai_request`
Triggered when a user uses AI workout generation or enhancement.

```typescript
AppMetrics.aiRequestUsed(userId, tier, requestType)
```

**Dimensions**:
- `userId`: User identifier
- `tier`: Current subscription tier
- `requestType`: `'generation'` or `'enhancement'`

**Use Cases**:
- Track AI feature adoption
- Identify power users
- Measure AI request quota utilization

---

#### `quota.limit_reached`
Triggered when a user hits a quota limit (Instagram imports, AI requests, workouts).

```typescript
AppMetrics.quotaLimitReached(userId, tier, quotaType)
```

**Dimensions**:
- `userId`: User identifier
- `tier`: Current tier
- `quotaType`: Type of quota (e.g., `'instagram_imports'`, `'ai_requests'`, `'workouts_weekly'`)

**Use Case**:
- **Critical for conversion**: Users hitting limits are prime upgrade candidates
- Trigger upgrade prompts at the right time

---

### 3. User Lifecycle Metrics

#### `user.signup`
Triggered when a new user creates an account.

```typescript
AppMetrics.userSignup(userId, provider)
```

**Dimensions**:
- `userId`: User identifier
- `provider`: Auth provider (e.g., `'google'`, `'facebook'`, `'credentials'`)

**Use Case**: Track signup source

---

#### `retention.activity`
Triggered on user activity to track retention cohorts.

```typescript
AppMetrics.userRetentionActivity(userId, tier, daysActive)
```

**Dimensions**:
- `userId`: User identifier
- `tier`: Current tier
- `daysActive`: Number of days since signup

**Use Case**: Calculate Day 7, 30, 90 retention rates

---

## Implementation Guide

### Adding Metrics to New Features

1. **Import the metrics**:
```typescript
import { AppMetrics } from '@/lib/metrics'
```

2. **Call the appropriate metric**:
```typescript
// When user completes an action
AppMetrics.instagramImportUsed(userId, user.subscriptionTier, true)
```

3. **Add dimensions for segmentation**:
```typescript
// Add as many dimensions as useful for analysis
AppMetrics.workoutCreated(userId, 'instagram_import')
```

### Creating Custom Metrics

If you need to track a new event:

1. Add to [`src/lib/metrics.ts`](../src/lib/metrics.ts):
```typescript
export const AppMetrics = {
  // ... existing metrics

  newFeatureUsed: (userId: string, tier: string, additionalContext: string) => {
    metrics.increment("feature.new_feature", { userId, tier, additionalContext });
  },
}
```

2. Use it in your code:
```typescript
AppMetrics.newFeatureUsed(userId, user.subscriptionTier, 'context_info')
```

---

## Key Metrics Dashboard

Based on the market research plan, track these KPIs:

### Conversion Metrics
| Metric | Target | Calculation |
|--------|--------|-------------|
| Free → Paid Conversion | 12-15% | `checkout_completed / total_users` |
| Core → Pro Upgrade | 20% | `upgraded(core→pro) / total_core_users` |
| Monthly → Annual | 30% | `annual_checkouts / total_checkouts` |

### Retention Metrics
| Metric | Target | Industry Avg |
|--------|--------|--------------|
| Day 7 Retention | 40% | 23% |
| Day 30 Retention | 25% | 3% |
| Day 90 Retention | 15% | N/A |
| Annual Retention | 50% | 33% |

### Feature Usage Metrics
| Metric | Target | Purpose |
|--------|--------|---------|
| Instagram Import Usage | 70% | Validate unique feature |
| AI Request Usage | 60% | Measure AI value |
| Quota Limit Reached | 30% | Upgrade opportunity |

### Revenue Metrics
| Metric | Calculation | Purpose |
|--------|-------------|---------|
| MRR | `SUM(monthly_subs) + SUM(annual_subs/12)` | Monthly recurring revenue |
| ARR | `MRR × 12 + SUM(annual_upfront)` | Annual recurring revenue |
| ARPU | `Total revenue / Active users` | Average revenue per user |
| LTV | `ARPU × Avg subscription months` | Customer lifetime value |

---

## CloudWatch Integration

The metrics system is designed to integrate with AWS CloudWatch (or any monitoring service).

### Current Status
Metrics are currently logged to console. To enable CloudWatch:

1. Update [`src/lib/metrics.ts:92`](../src/lib/metrics.ts#L92):
```typescript
flush() {
  if (this.metrics.length === 0) return;

  if (process.env.NODE_ENV === "production") {
    // Send to CloudWatch
    const cloudwatch = new AWS.CloudWatch();
    const metricData = this.metrics.map(m => ({
      MetricName: m.name,
      Value: m.value,
      Unit: m.unit === 'count' ? 'Count' :
            m.unit === 'milliseconds' ? 'Milliseconds' : 'None',
      Timestamp: new Date(m.timestamp),
      Dimensions: Object.entries(m.dimensions || {}).map(([k, v]) => ({
        Name: k,
        Value: v
      }))
    }));

    await cloudwatch.putMetricData({
      Namespace: 'SpotBuddy',
      MetricData: metricData
    }).promise();
  }

  this.metrics = [];
}
```

2. Add AWS SDK dependencies:
```bash
npm install @aws-sdk/client-cloudwatch
```

3. Configure AWS credentials (already done for DynamoDB).

---

## Analytics Tools Integration

For real-time analytics dashboards, consider integrating:

### Option 1: PostHog (Recommended)
- Free tier: 1M events/month
- Built-in funnel analysis
- Cohort tracking
- Feature flags

### Option 2: Mixpanel
- Free tier: 100K users/month
- Advanced funnel analysis
- Retention reports
- A/B testing

### Option 3: Amplitude
- Free tier: 10M events/month
- User behavior analytics
- Retention charts
- Predictive analytics

**Implementation**: Replace CloudWatch integration with analytics SDK in `flush()` method.

---

## Privacy & Compliance

All metrics tracking is:
- **Anonymous**: Only userId (UUID) is tracked, no PII
- **Server-side**: No client-side tracking cookies
- **Opt-in**: Users are informed in Privacy Policy
- **GDPR Compliant**: User data can be deleted on request

---

## Troubleshooting

### Metrics Not Appearing
1. Check console logs in development
2. Verify `NODE_ENV=production` for auto-flush
3. Check CloudWatch credentials
4. Verify metric names match expected format

### High Cardinality
If you have millions of unique dimension values:
- Use dimension aggregation (e.g., group userId into cohorts)
- Limit unique values per dimension
- Use sampling for high-volume metrics

---

## Next Steps

1. ✅ Metrics infrastructure added
2. ✅ Subscription tracking implemented
3. ⏳ Set up CloudWatch dashboards
4. ⏳ Create automated reports (weekly conversion, monthly revenue)
5. ⏳ Add real-time alerts (churn spike, conversion drop)

---

**Last Updated**: December 2024
**Owner**: Engineering Team
**Review Cycle**: Quarterly
