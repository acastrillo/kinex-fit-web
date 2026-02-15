# Stripe Integration Verification Checklist

Now that the database has been cleaned, verify these in your Stripe Dashboard:

## 1. Webhook Endpoint Configuration

**URL:** `https://your-domain.com/api/stripe/webhook`

**Events to Subscribe:**
- `checkout.session.completed` ✓
- `customer.subscription.created` ✓
- `customer.subscription.updated` ✓
- `customer.subscription.deleted` ✓
- `invoice.payment_succeeded` ✓
- `invoice.payment_failed` ✓

**Webhook Secret:** Currently set to `whsec_[YOUR_WEBHOOK_SECRET]` (stored in AWS Secrets Manager)

## 2. Products & Prices

Verify these price IDs exist and are active:

| Tier | Price ID | Monthly Price |
|------|----------|---------------|
| Core | `price_1SGJLsHqcH7hy1ecgUGCqe7U` | $7.99 |
| Pro | `price_1SGJTsHqcH7hy1ec8LE7k3Ix` | $14.99 |
| Elite | `price_1SGJWyHqcH7hy1ecqZuX5hFW` | $34.99 |

## 3. Test the Integration

### Option A: Using Stripe CLI (Recommended)
```bash
# Install Stripe CLI if not installed
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Test checkout in another terminal
stripe trigger checkout.session.completed
```

### Option B: Manual Testing
1. Start your dev server: `npm run dev`
2. Sign up with a new account
3. Navigate to `/subscription`
4. Click "Subscribe" on a tier
5. Use Stripe test card: `4242 4242 4242 4242`
6. Check webhook logs in Stripe Dashboard

## 4. Current Webhook Secret

Your webhook secret in `.env.local` (retrieve from AWS Secrets Manager):
```
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_WEBHOOK_SECRET]
```

**IMPORTANT:** If you recreate the webhook endpoint in Stripe, you'll get a NEW webhook secret. Update `.env.local` with the new secret.

## 5. Production Deployment

When deploying to production:

1. **Update webhook URL** in Stripe Dashboard to your production domain
2. **Get new webhook secret** for production endpoint
3. **Set environment variables** in your hosting platform:
   - `STRIPE_SECRET_KEY` (starts with `sk_live_`)
   - `STRIPE_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - `STRIPE_WEBHOOK_SECRET` (from production webhook)
   - `STRIPE_PRICE_CORE` (production price ID)
   - `STRIPE_PRICE_PRO` (production price ID)
   - `STRIPE_PRICE_ELITE` (production price ID)

## 6. Testing Scenarios

After verifying the above, test these scenarios:

- [ ] New user subscribes to Core tier
- [ ] User upgrades from Core to Pro
- [ ] User downgrades from Pro to Core
- [ ] User cancels subscription
- [ ] Payment fails (use test card `4000 0000 0000 0341`)
- [ ] Payment succeeds after failure
- [ ] User accesses billing portal to update payment method

## 7. Monitoring

Monitor these in production:

- **Stripe Dashboard** → Webhooks → View webhook logs
- **Your App Logs** → Check for `[Webhook]` prefixed messages
- **DynamoDB** → Verify subscription data is updated correctly

## Common Issues & Solutions

### Issue: "No signature" error
**Solution:** Webhook secret is incorrect. Get new secret from Stripe Dashboard.

### Issue: "Missing userId or tier" in webhook
**Solution:** Metadata not being passed correctly. Check checkout session creation in `/api/stripe/checkout`.

### Issue: Subscription not updating in app
**Solution:**
1. Check webhook is receiving events in Stripe Dashboard
2. Verify webhook secret is correct
3. Check app logs for errors
4. Force session refresh by logging out and back in

### Issue: "Invalid signature" error
**Solution:** Using wrong webhook secret for the environment (dev vs prod).
