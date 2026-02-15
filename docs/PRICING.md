# Kinex Fit Pricing Guide

**Last Updated**: January 26, 2026
**Status**: Proposed (post-beta pricing update)

**Note**: Beta testers remain free; pricing below is the post-beta launch plan.
**Quota Reset**: Monthly scan + AI quotas reset at the start of each month (UTC, lazy on first use).
**Workout of the Week**: Does **not** count toward scans **or** AI request quotas.

## Current Pricing Structure

Kinex Fit uses a **3-tier subscription model** with both monthly and annual billing options:

**Note**: Legacy pricing analysis sections below may reference older price points. Treat the table above as the current source of truth.

| Tier | Monthly | Annual | Annual Savings | Best For |
|------|---------|--------|----------------|----------|
| **Free** | $0 | $0 | — | Trying the app, casual users |
| **Core** | $8.99 | $69.99 ($5.83/mo) | 35% | Regular gym-goers |
| **Pro** | $13.99 | $109.99 ($9.17/mo) | 34% | Serious lifters, Instagram collectors |
| **Elite** | $24.99 | $199.99 ($16.67/mo) | 33% | Coaches, trainers, fitness influencers |

### Default Presentation
**Annual billing is the default** on the subscription page because:
- 67% of fitness app users prefer annual subscriptions ([source](https://www.revenuecat.com/state-of-subscription-apps-2025/))
- Annual subscribers have 33% retention vs much lower for monthly
- Users see the monthly equivalent ($5.83/mo) which feels more accessible

---

## Free Tier

**Purpose**: Habit formation + conversion funnel

### Features
- ✅ Unlimited workouts
- ✅ 8 workout scans per month (Instagram or OCR)
- ✅ 1 AI request per month (generation OR enhancement)
- ✅ 90-day history
- ✅ Basic analytics
- ✅ Manual workout creation
- ✅ Calendar view
- ✅ Basic timers
- ❌ No Workout of the Week (paid tier exclusive)

### Limits
- `workoutScansMonthly`: 8
- `aiRequestsMonthly`: 1
- `historyDays`: 90

### Strategy
- No workout cap; conversion pressure comes from scan/AI limits and history window
- 8 scans/month = taste of premium feature
- 1 AI/month = experience the magic
- 90-day limit creates upgrade pressure

---

## Core Tier - $8.99/month or $69.99/year

**Target Customer**: Regular gym-goers who follow Instagram workouts

### Features
- ✅ **Unlimited workouts**
- ✅ **12 scans per month** (Instagram + OCR)
- ✅ **10 AI requests per month**
- ✅ **Workout of the Week** - AI-generated weekly workout recommendation (does not count toward scans or AI requests)
- ✅ Unlimited history
- ✅ PR tracking
- ✅ Body metrics
- ✅ Basic analytics
- ✅ Calendar scheduling

### Limits
- `workoutsWeekly`: null (unlimited)
- `workoutScansMonthly`: 12
- `aiRequestsMonthly`: 10
- `historyDays`: null (unlimited)

### Competitive Position
- **$1 cheaper** than Hevy Pro ($9.99) but adds OCR + AI
- **$7 less** than FitBod ($15.99 with AI)
- **$10 less** than MyFitnessPal ($19.99)
- **Under $10** = impulse buy territory
- **Annual $69.99** = under $70 psychological barrier

---

## Pro Tier - $13.99/month or $109.99/year

**Target Customer**: Serious lifters, fitness enthusiasts, Instagram workout collectors

### Features
- ✅ **Everything in Core**
- ✅ **Workout of the Week** - AI-generated weekly workout recommendation (does not count toward scans or AI requests)
- ✅ **60 scans per month** (Instagram + OCR)
- ✅ **30 AI requests per month** (1/day average)
- ✅ Advanced analytics (volume trends, PR progression, 1RM calculations)
- ✅ Workout templates
- ✅ Export data

### Limits
- `workoutsWeekly`: null (unlimited)
- `workoutScansMonthly`: 60
- `aiRequestsMonthly`: 30
- `historyDays`: null (unlimited)
- `advancedAnalytics`: true
- `workoutTemplates`: true
- `dataExport`: true

### Competitive Position
- **$2 cheaper** than FitBod ($15.99) but adds OCR + Instagram
- **$5 cheaper** than MyFitnessPal ($19.99)
- **Sweet spot** between basic trackers and premium AI apps
- **Higher scan cap** = clear upgrade from Core
- **Annual $109.99** = under $110 barrier

---

## Elite Tier - $24.99/month or $199.99/year

**Target Customer**: Coaches, trainers, fitness influencers, serious athletes

### Features
- ✅ **Everything in Pro**
- ✅ **Workout of the Week** - AI-generated weekly workout recommendation (does not count toward scans or AI requests)
- ✅ **120 scans per month** (Instagram + OCR)
- ✅ **100 AI requests per month** (3-4/day for power users)
- ✅ Priority support (24-hour response)
- ✅ Early access to new features
- ✅ Custom workout templates
- ✅ API access (coming soon)
- ✅ Workout sharing features

### Limits
- `workoutsWeekly`: null (unlimited)
- `workoutScansMonthly`: 120
- `aiRequestsMonthly`: 100
- `historyDays`: null (unlimited)
- `advancedAnalytics`: true
- `prioritySupport`: true
- `earlyAccess`: true
- `customTemplates`: true
- `apiAccess`: false (coming soon)
- `workoutSharing`: true

### Competitive Position
- **$74 cheaper** than Trainwell ($99/month human coaching)
- **$124 cheaper** than Caliber ($149/month)
- **$174 cheaper** than Future ($199/month)
- Positioned as **"AI coaching at 1/4 the price of human coaching"**
- **Annual $199.99** = about 2 months of human coaching

---

## Pricing Strategy Rationale

### Why These Prices Work

#### Market Research Validation
Based on December 2024 comprehensive market analysis with 20+ competitor sources:
- AI features command $10-16/month premium
- Annual discounts: 16-25% is industry standard
- FitBod raised prices 20% in 2024 (from $12.99 to $15.99)
- Market accepts premium pricing for quality AI

#### Unique Value Proposition
**Kinex Fit is the ONLY app** offering all three:
1. ✅ Workout scan import (Instagram + OCR) (UNIQUE)
2. ✅ AI workout generation (matches FitBod, Alpha Progression)
3. ✅ AI workout enhancement (rare)
4. ✅ Comprehensive tracking (PRs, body metrics, analytics)
5. ✅ Multi-platform (Web + Android + iOS)

#### Cost Structure (Post-beta)
**Unit cost assumptions (per request)**:
- OCR scan: $0.03-$0.05 each (model uses $0.04)
- AI request: $0.01-$0.02 each (avg $0.015)
- WOD generation: ~$0.003 each (cached)
- Base infra: ~$0.10 per paid user/month
- Stripe fees: 2.9% + $0.30 per charge

**Unit economics at quota (monthly)**:

| Tier | Price | Modeled Usage | Variable Cost (ex-Stripe) | Stripe Fee | Gross Margin |
|------|-------|---------------|---------------------------|------------|--------------|
| Core | $8.99 | 12 scans + 10 AI | ~$0.74 | ~$0.56 | ~86% |
| Pro | $13.99 | 60 scans + 30 AI | ~$2.96 | ~$0.71 | ~74% |
| Elite | $24.99 | 120 scans + 100 AI + support buffer | ~$8.41 | ~$1.02 | ~62% |

**Break-even**: with ~$200/month fixed costs, ~30 Core users or ~22 Pro users cover base infra.

**Scale guardrails**: enforce scan quotas and AI cost caps; consider paid overages for power users.

---

## Implementation Details

### Stripe Product Descriptions

- **Core**: "Unlimited workouts, 12 workout scans/month (Instagram or OCR), 10 AI requests/month, Workout of the Week, PR tracking, and calendar scheduling. Best for regular gym-goers."
- **Pro**: "Everything in Core, plus 60 workout scans/month, 30 AI requests/month, advanced analytics, workout templates, and data export. Best for serious lifters."
- **Elite**: "Everything in Pro, plus 120 workout scans/month, 100 AI requests/month, priority support, early access, custom templates, and workout sharing. Best for coaches and power users."

### Stripe Price IDs

**Post-beta (new prices - create in Stripe)**:

**Monthly**:
- Core: `price_TBD`
- Pro: `price_TBD`
- Elite: `price_TBD`

**Annual**:
- Core: `price_TBD`
- Pro: `price_TBD`
- Elite: `price_TBD`

**Legacy (beta pricing, do not use for post-beta launch)**:

**Monthly**:
- Core: `price_1ScVlxHdCvK1ftFgZraoHvdL`
- Pro: `price_1ScVlzHdCvK1ftFgVCZLrPRw`
- Elite: `price_1ScVm1HdCvK1ftFgjsP9I6lV`

**Annual**:
- Core: `price_1ScVlyHdCvK1ftFgGV8WtIXK`
- Pro: `price_1ScVm0HdCvK1ftFgo9TKlwTv`
- Elite: `price_1ScVm2HdCvK1ftFgP9ps0xcm`

### Configuration Files

- **Tier definitions**: [`src/lib/subscription-tiers.ts`](../src/lib/subscription-tiers.ts)
- **Stripe server**: [`src/lib/stripe-server.ts`](../src/lib/stripe-server.ts)
- **Checkout API**: [`src/app/api/stripe/checkout/route.ts`](../src/app/api/stripe/checkout/route.ts)
- **Webhook handler**: [`src/app/api/stripe/webhook/route.ts`](../src/app/api/stripe/webhook/route.ts)
- **Subscription page**: [`src/app/subscription/page.tsx`](../src/app/subscription/page.tsx)

---

## Launch Strategy

### Phase 1: Web App (Current - Q1 2025)
**Goal**: Validate pricing, build retention data

**Pricing**: Full price
- No launch discounts
- 30-day money-back guarantee

**Metrics to track**:
- Free → Core conversion
- Core → Pro upgrade rate
- Day 7, 30, 90 retention
- Churn by tier
- Feature usage (workout scans, AI requests)

### Phase 2: Android Launch (Q2 2025)
**Goal**: User acquisition, app store ranking, reviews

**Launch Promotion (First 1,000 users)**:
- **30% off annual plans** (first year)
  - Core: ~$49 (instead of $69.99) = ~$4.08/month
  - Pro: ~$77 (instead of $109.99) = ~$6.42/month
  - Elite: ~$140 (instead of $199.99) = ~$11.67/month

**After first year**: Auto-renew at full price

**Marketing**:
- "Early Adopter Pricing - Limited to First 1,000 Users"
- App Store "New & Noteworthy"

### Phase 3: iOS Launch (Q3 2025)
**Goal**: Multi-platform presence, ecosystem lock-in

**Pre-registration Campaign**:
- Email capture: 2 months before launch
- Pre-register → 40% off annual plan
  - Core: ~$42 (instead of $69.99)
  - Pro: ~$66 (instead of $109.99)
  - Elite: ~$120 (instead of $199.99)

**Launch Pricing**:
- Same as Android: 30% off for first 1,000
- OR: 40% off annual for pre-registered users

---

## Key Metrics

Based on market research and industry benchmarks:

### Conversion Targets
| Metric | Target | Industry Avg |
|--------|--------|--------------|
| Free → Paid | 12-15% | 2-5% |
| Core → Pro | 20% | N/A |
| Monthly → Annual | 30% | 67% (users prefer annual) |
| First 30-day purchase | 60% | 72% corr. with retention |

### Retention Targets
| Metric | Target | Industry Avg |
|--------|--------|--------------|
| Day 7 | 40% | 23% |
| Day 30 | 25% | 3% |
| Day 90 | 15% | N/A |
| Annual | 50% | 33% |

**Critical Success Factor**: If Day-30 retention hits 25% (vs 3% avg), we're **8× better** than competitors.

---

## Pricing FAQs

### Why annual billing emphasis?
- 67% of fitness app users prefer annual subscriptions
- Better retention (33% vs much lower for monthly)
- Higher LTV per customer
- Commitment = better fitness results

### Can users switch between monthly and annual?
Yes, through the Stripe billing portal. They'll receive prorated credit.

### What about lifetime pricing?
Planned for 6-month milestone. Estimated $399 one-time.

### Do you offer trials?
Currently: 30-day money-back guarantee
Future: May add 7-day free trial (48% conversion rate in industry)

### Student/military discounts?
Not yet, planned for post-iOS launch.

---

## References

- **Comprehensive Market Analysis**: `C:\Users\acast\.claude\plans\curried-chasing-nest.md`
- **Metrics Tracking Guide**: [`docs/METRICS.md`](./METRICS.md)
- **Stripe Setup Guide**: [`docs/STRIPE-SETUP-GUIDE.md`](./STRIPE-SETUP-GUIDE.md)
- **Android Deployment Plan**: [`docs/ANDROID-DEPLOYMENT-PLAN.md`](./ANDROID-DEPLOYMENT-PLAN.md)

---

**Questions or pricing changes?** Update this document and ensure all configuration files are synchronized.
