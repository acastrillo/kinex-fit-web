# Mobile Stripe Integration Implementation Plan

## Executive Summary

Based on comprehensive research of official Stripe documentation, developer forums, and production implementations, here's your complete plan for integrating Stripe subscriptions into your React Native mobile app with Google/Facebook OAuth authentication.

---

## 🚨 CRITICAL: App Store Compliance (Must Read First!)

### The Digital Goods Problem

**If you're selling fitness app subscriptions (digital goods consumed within the app):**

❌ **You CANNOT use Stripe in-app** for most regions
✅ **You MUST use Apple App Store / Google Play in-app purchases**

**Why?**
- Apple and Google require using their payment systems for digital goods (subscriptions, premium features, content unlocks)
- Violation = App rejection or removal from stores
- They take 15-30% commission (vs Stripe's 2.9% + $0.30)

**Exception (US Only - April 2025):**
Following the Epic v. Apple ruling, iOS apps in the US can redirect users to external web checkout pages. However, this:
- Only works in the United States
- Requires specific compliance with [Apple's guidelines](https://docs.stripe.com/mobile/digital-goods)
- Still subject to scrutiny

### Recommended Approach: Hybrid Strategy

**Option 1: Web-Based Checkout (Safest)**
- Users tap "Upgrade" in mobile app
- Redirect to web browser → Stripe Checkout (your existing setup!)
- After payment, return to app
- ✅ Fully compliant with app store rules
- ✅ Uses your existing backend
- ✅ Works globally

**Option 2: In-App Purchases (Most Native, Complex)**
- Use Apple StoreKit / Google Play Billing Library
- Requires separate implementation from Stripe
- Stripe can still handle subscriptions for web users
- Server-side receipt validation required

**Option 3: US-Only External Payment (Limited)**
- Use Stripe's Customer Portal in-app (WebView)
- Only available for US users
- Must display Apple/Google warnings about external payments

**Recommendation:** Start with **Option 1** (web checkout) - it's compliant, uses your existing infrastructure, and you can add native in-app purchases later if needed.

---

## Architecture Overview

```
┌─────────────┐
│ Mobile App  │ (React Native)
│ - Google    │
│ - Facebook  │
│   OAuth     │
└──────┬──────┘
       │
       │ 1. Authenticated API calls
       │
┌──────▼──────────────────────────────┐
│   Backend (Next.js API Routes)      │
│   - Already have: /api/auth         │
│   - Already have: /api/stripe/*     │
│   - Add: /api/mobile/checkout       │
│   - Add: /api/mobile/verify-user    │
└──────┬──────────────────────────────┘
       │
       │ 2. Create checkout session
       │
┌──────▼──────────┐      ┌────────────┐
│     Stripe      │◄────►│  Webhooks  │
│   - Checkout    │      │  - Updated │
│   - Subscr.     │      │    subs    │
│   - Customer    │      │  - Invoice │
│   Portal        │      │    events  │
└─────────────────┘      └──────┬─────┘
                                │
                                │ 3. Update user tier
                                │
                         ┌──────▼──────┐
                         │  DynamoDB   │
                         │  - users    │
                         │  - tier     │
                         │  - status   │
                         └─────────────┘
```

---

## Implementation Plan: 5-Phase Approach

### Phase 1: Mobile App Preparation (2-3 hours)

**1.1 Install Dependencies**

```bash
# In your React Native project
npm install @stripe/stripe-react-native
npm install @react-native-async-storage/async-storage
```

**1.2 Configure Deep Linking**

Your app needs to handle return from browser after checkout:

```javascript
// app.json or app.config.js
{
  "expo": {
    "scheme": "spotbuddy",  // or your app scheme
    "ios": {
      "bundleIdentifier": "com.yourcompany.spotbuddy"
    },
    "android": {
      "package": "com.yourcompany.spotbuddy"
    }
  }
}
```

**1.3 Create Subscription Screen**

```typescript
// screens/SubscriptionScreen.tsx
import { Linking } from 'react-native';

async function handleUpgrade(tier: 'core' | 'pro' | 'elite') {
  try {
    // Get authenticated user token
    const token = await getAuthToken(); // Your existing auth

    // Call your backend to create checkout session
    const response = await fetch('https://kinexfit.com/api/mobile/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ tier })
    });

    const { checkoutUrl } = await response.json();

    // Open Stripe Checkout in browser
    await Linking.openURL(checkoutUrl);

  } catch (error) {
    console.error('Checkout failed:', error);
  }
}
```

### Phase 2: Backend API Routes for Mobile (2-3 hours)

**2.1 Create Mobile Checkout Endpoint**

```typescript
// src/app/api/mobile/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { getStripe, getPriceIdForTier } from '@/lib/stripe-server';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user (same as your web app)
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;

    const { userId } = auth;
    const { tier } = await req.json();

    const stripe = getStripe();
    const priceId = getPriceIdForTier(tier);

    // Get or create Stripe customer
    const user = await dynamoDBUsers.get(userId);
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId }
      });
      customerId = customer.id;
      await dynamoDBUsers.upsert({ id: userId, email: user.email, stripeCustomerId: customerId });
    }

    // Create checkout session with mobile-friendly URLs
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `spotbuddy://subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `spotbuddy://subscription/cancel`,
      metadata: { userId, tier }
    });

    return NextResponse.json({ checkoutUrl: session.url });

  } catch (error) {
    console.error('Mobile checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
```

**2.2 Add Mobile User Verification Endpoint**

```typescript
// src/app/api/mobile/verify-user/route.ts
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;

    const { userId } = auth;
    const user = await dynamoDBUsers.get(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      tier: user.subscriptionTier || 'free',
      status: user.subscriptionStatus || 'none',
      stripeCustomerId: user.stripeCustomerId
    });

  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
```

### Phase 3: Webhook Enhancement for Mobile (1-2 hours)

**Your existing webhooks already work!** Just verify they handle all cases:

```typescript
// src/app/api/stripe/webhook/route.ts (already exists - just verify)

// ✅ checkout.session.completed - ALREADY IMPLEMENTED
// ✅ customer.subscription.created - ALREADY IMPLEMENTED
// ✅ customer.subscription.updated - ALREADY IMPLEMENTED
// ✅ invoice.payment_succeeded - ALREADY IMPLEMENTED

// The webhooks update DynamoDB which the mobile app reads ✅
```

**Critical Addition: Prevent Race Conditions**

Add this to your webhook handler:

```typescript
// After updating user in DynamoDB
await new Promise(resolve => setTimeout(resolve, 1000));

// Then fetch from Stripe API to ensure sync
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
await dynamoDBUsers.updateSubscription(userId, {
  tier: subscription.metadata.tier,
  status: subscription.status,
  stripeSubscriptionId: subscription.id
});
```

### Phase 4: Mobile App Authentication Integration (3-4 hours)

**4.1 Store Auth Token**

```typescript
// utils/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function storeAuthToken(token: string) {
  await AsyncStorage.setItem('auth_token', token);
}

export async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem('auth_token');
}

export async function clearAuthToken() {
  await AsyncStorage.removeItem('auth_token');
}
```

**4.2 Check Subscription Status on App Launch**

```typescript
// App.tsx or similar
useEffect(() => {
  async function checkUserStatus() {
    const token = await getAuthToken();
    if (!token) return;

    const response = await fetch('https://kinexfit.com/api/mobile/verify-user', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const user = await response.json();
      // Update app state with user tier
      setUserTier(user.tier);
      setSubscriptionStatus(user.status);
    }
  }

  checkUserStatus();
}, []);
```

**4.3 Handle Deep Link Return from Checkout**

```typescript
// App.tsx
import { Linking } from 'react-native';

useEffect(() => {
  const handleDeepLink = async (event: { url: string }) => {
    const url = event.url;

    if (url.includes('subscription/success')) {
      // Payment successful!
      // Wait 2 seconds for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh user data
      const response = await fetch('https://kinexfit.com/api/mobile/verify-user', {
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
      });

      const user = await response.json();
      setUserTier(user.tier);

      // Show success message
      Alert.alert('Success!', `Upgraded to ${user.tier} tier`);
    }
  };

  // Listen for deep links
  Linking.addEventListener('url', handleDeepLink);

  return () => {
    Linking.removeAllListeners('url');
  };
}, []);
```

### Phase 5: Testing Strategy (2-3 hours)

**5.1 Test Mode Setup**

```typescript
// config.ts
export const STRIPE_CONFIG = {
  publishableKey: __DEV__
    ? process.env.STRIPE_TEST_PUBLISHABLE_KEY
    : process.env.STRIPE_LIVE_PUBLISHABLE_KEY,
  apiUrl: __DEV__
    ? 'http://localhost:3000' // Local dev
    : 'https://kinexfit.com' // Production
};
```

**5.2 Test Card Numbers (Stripe Test Mode)**

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
Insufficient funds: 4000 0000 0000 9995
```

**5.3 Test Checklist**

- [ ] User can tap "Upgrade" button
- [ ] Browser opens with Stripe Checkout
- [ ] User completes payment (test card)
- [ ] App returns from browser (deep link works)
- [ ] Webhook fires and updates DynamoDB
- [ ] App refreshes and shows new tier
- [ ] User sees upgraded features
- [ ] Test cancellation flow
- [ ] Test subscription renewal (use Stripe test clocks)
- [ ] Test failed payment scenario

---

## Common Pitfalls & Solutions

### 1. **Duplicate User Creation** (You already experienced this!)

**Problem:** Every OAuth sign-in creates a new user instead of finding existing user

**Solution:** Fix your auth callback to check for existing user by email:

```typescript
// src/app/api/auth/[...nextauth]/route.ts
callbacks: {
  async signIn({ user, account, profile }) {
    // Check if user exists by email
    const existingUser = await dynamoDBUsers.getByEmail(user.email);

    if (existingUser) {
      // Link OAuth account to existing user
      user.id = existingUser.id;
    } else {
      // Create new user only if none exists
      const newUser = await dynamoDBUsers.create({
        email: user.email,
        // ... other fields
      });
      user.id = newUser.id;
    }

    return true;
  }
}
```

### 2. **Race Conditions in Webhooks**

**Problem:** Webhook events arrive out of order (~1% of cases)

**Solution:** Always fetch latest state from Stripe API:

```typescript
async function handleWebhook(event) {
  // Don't trust event data order
  await new Promise(r => setTimeout(r, 1000)); // Delay 1 second

  // Fetch current state from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update database with current state
  await updateUser(subscription);
}
```

### 3. **Session Not Refreshing in App**

**Problem:** User upgrades but app still shows "free"

**Solution:** Poll for updates after checkout:

```typescript
async function pollForSubscriptionUpdate(maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds

    const user = await fetchUserData();
    if (user.tier !== 'free') {
      return user; // Found update!
    }
  }

  // Still not updated - show manual refresh button
  return null;
}
```

### 4. **Secret Key Exposure**

**Problem:** Developers accidentally put Stripe secret key in mobile app

**Solution:** ❌ NEVER include secret key in mobile app
✅ Always use backend API routes
✅ Mobile app only needs publishable key for Checkout

### 5. **Test vs Live Mode Confusion**

**Problem:** Using test keys in production, losing real payments

**Solution:**
```typescript
// Environment-based config
const STRIPE_KEY = process.env.NODE_ENV === 'production'
  ? process.env.STRIPE_LIVE_SECRET_KEY
  : process.env.STRIPE_TEST_SECRET_KEY;

// Log in production to catch mistakes
if (process.env.NODE_ENV === 'production') {
  console.log('🔴 PRODUCTION MODE - Using live Stripe keys');
}
```

---

## Testing Plan

### Day 1: Local Development
1. Set up mobile dev environment
2. Install dependencies
3. Create subscription UI
4. Test deep linking locally

### Day 2: Backend Integration
1. Create mobile API endpoints
2. Test checkout flow with Stripe test mode
3. Verify webhooks fire correctly
4. Test user tier updates

### Day 3: End-to-End Testing
1. Test complete flow: sign-in → upgrade → webhook → tier update
2. Test with multiple users
3. Test error scenarios (payment failure, webhook failure)
4. Performance testing

### Day 4: Production Preparation
1. Switch to live Stripe keys
2. Test with real test card (low amount)
3. Verify production webhooks
4. Monitor logs

---

## Security Checklist

- [ ] Secret key never in mobile app code
- [ ] All API routes require authentication
- [ ] Webhook signatures verified
- [ ] User can only modify own subscription
- [ ] Rate limiting on API endpoints
- [ ] HTTPS only for all API calls
- [ ] Auth tokens stored securely (AsyncStorage)
- [ ] Tokens expire and refresh properly

---

## Production Monitoring

### What to Monitor

```typescript
// Add logging to critical paths
console.log('[Webhook] Event:', event.type, 'User:', userId);
console.log('[Checkout] Session created for user:', userId, 'Tier:', tier);
console.log('[Update] User tier changed:', userId, 'from', oldTier, 'to', newTier);
```

### Key Metrics
- Checkout session creation success rate
- Webhook processing time
- User tier update latency
- Failed payment rate
- Subscription churn rate

### AWS CloudWatch Alarms
```bash
# Webhook failures
aws cloudwatch put-metric-alarm \
  --alarm-name stripe-webhook-failures \
  --metric-name WebhookErrors \
  --threshold 10 \
  --period 300

# Checkout failures
aws cloudwatch put-metric-alarm \
  --alarm-name stripe-checkout-failures \
  --metric-name CheckoutErrors \
  --threshold 5 \
  --period 300
```

---

## Cost Estimate

### Stripe Fees (Test Mode = FREE)
- Test mode: Unlimited free transactions
- Production: 2.9% + $0.30 per transaction

### Example (100 users, $10/month subscription)
- Revenue: $1,000/month
- Stripe fees: $59 (2.9% + $30 fixed)
- Net: $941/month

### Additional Costs
- AWS Lambda: ~$0 (free tier covers webhook processing)
- DynamoDB: ~$0 (free tier covers user storage)
- CloudWatch: ~$1/month for logs

---

## Resources & Documentation

### Official Stripe Documentation
- [React Native Subscriptions](https://docs.stripe.com/billing/subscriptions/build-subscriptions?platform=react-native)
- [Stripe React Native SDK](https://docs.stripe.com/sdks/react-native)
- [Webhooks with Subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks)
- [iOS Digital Goods (US Only)](https://docs.stripe.com/mobile/digital-goods)
- [Customer Portal for Mobile](https://docs.stripe.com/mobile/digital-goods/customer-portal)

### Best Practices Articles
- [Solving Race Conditions in Stripe Webhooks](https://www.pedroalonso.net/blog/stripe-webhooks-solving-race-conditions/)
- [Stripe Payment Integration in React Native](https://medium.com/simform-engineering/stripe-payment-integration-in-react-native-9dcf46dd5da4)
- [Can You Use Stripe for In-App Purchases in 2025?](https://adapty.io/blog/can-you-use-stripe-for-in-app-purchases/)

### Community Resources
- [GitHub: stripe-react-native](https://github.com/stripe/stripe-react-native)
- [Stack Overflow: React Native Stripe Subscriptions](https://stackoverflow.com/questions/62513209/stripe-react-native-subscriptions)
- [Firebase + Stripe Extension](https://extensions.dev/extensions/stripe/firestore-stripe-payments)

---

## Next Steps

1. **Review this plan** and confirm approach (web checkout vs in-app purchases)
2. **Fix duplicate user creation bug** (highest priority!)
3. **Test with a single user** - verify tier update sticks
4. **Set up React Native environment** if not already done
5. **Implement Phase 1** (mobile app preparation)
6. **Test checkout flow** in development
7. **Deploy to TestFlight/Play Beta** for real device testing
8. **Production deployment** after testing

---

## Questions to Answer Before Starting

1. **Is your mobile app React Native?** (Assumed based on web stack)
2. **Do you want web checkout or native in-app flow?** (Recommend web)
3. **Will you offer subscriptions outside US?** (Affects compliance)
4. **Do you already have deep linking set up?** (Required for return flow)
5. **Are you okay with test mode unlimited testing?** (It's free!)

---

## Estimated Timeline

- **Phase 1:** 2-3 hours (mobile app setup)
- **Phase 2:** 2-3 hours (backend endpoints)
- **Phase 3:** 1-2 hours (webhook verification)
- **Phase 4:** 3-4 hours (auth integration)
- **Phase 5:** 2-3 hours (testing)

**Total: 10-15 hours of development time**

Plus:
- App store submission: 1-2 weeks review time
- Production testing: 1-2 days
- Bug fixes: 2-4 hours (contingency)

---

**Ready to start? First fix the duplicate user bug, then we'll tackle Phase 1!**
