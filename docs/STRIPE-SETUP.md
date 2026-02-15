# Stripe Setup Guide

Complete guide for setting up Stripe subscriptions in Kinex Fit.

## Quick Setup (5 Minutes)

### Prerequisites
- Stripe account created at https://stripe.com
- Test mode enabled (toggle in Stripe Dashboard top-right)

### Step 1: Create Products in Stripe

Go to https://dashboard.stripe.com/test/products and create these 3 products:

#### Product 1: Kinex Fit Core ($8.99/month)
```
Name: Kinex Fit Core
Description: Perfect for individuals starting their fitness journey
Price: $8.99
Billing: Monthly
Currency: USD
```
After saving, **copy the Price ID** (starts with `price_`, NOT `prod_`)

#### Product 2: Kinex Fit Pro ($13.99/month)
```
Name: Kinex Fit Pro
Description: Advanced features for serious athletes
Price: $13.99
Billing: Monthly
Currency: USD
```
**Copy the Price ID**

#### Product 3: Kinex Fit Elite ($24.99/month)
```
Name: Kinex Fit Elite
Description: Complete fitness platform with AI and priority support
Price: $24.99
Billing: Monthly
Currency: USD
```
**Copy the Price ID**

### Step 2: Update Environment Variables

Update your `.env.local` file with the price IDs you just copied:

```env
# Stripe Price IDs (Test Mode)
STRIPE_PRICE_CORE=price_YOUR_CORE_PRICE_ID
STRIPE_PRICE_PRO=price_YOUR_PRO_PRICE_ID
STRIPE_PRICE_ELITE=price_YOUR_ELITE_PRICE_ID

# Client-side accessible (same IDs)
NEXT_PUBLIC_STRIPE_PRICE_CORE=price_YOUR_CORE_PRICE_ID
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_YOUR_PRO_PRICE_ID
NEXT_PUBLIC_STRIPE_PRICE_ELITE=price_YOUR_ELITE_PRICE_ID
```

### Step 3: Setup Webhook

Go to https://dashboard.stripe.com/test/webhooks

1. Click **"+ Add endpoint"**
2. Endpoint URL: `https://kinexfit.com/api/stripe/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click **"Add endpoint"**
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SIGNING_SECRET
```

### Step 4: Verify Setup

```bash
# Test Stripe connection
npx tsx scripts/test-stripe-connection.ts

# Verify price IDs
npx tsx scripts/verify-stripe-prices.ts

# List all products
npx tsx scripts/list-all-stripe-products.ts
```

You should see ✅ for all three tiers!

### Step 5: Test Locally (Optional)

```bash
# Restart dev server
npm run dev

# In browser:
# 1. Sign up or dev login
# 2. Go to /subscription
# 3. Click "Subscribe to Core"
# 4. Use test card: 4242 4242 4242 4242
#    - Expiry: Any future date (e.g., 12/25)
#    - CVC: Any 3 digits (e.g., 123)
#    - ZIP: Any 5 digits (e.g., 12345)
```

## Local Development Webhook Setup

For testing webhooks locally, use Stripe CLI:

```bash
# Install Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Update `.env.local` with the CLI webhook secret:
```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_CLI_SECRET
```

## Test Cards

- **Success**: `4242 4242 4242 4242`
- **Payment fails**: `4000 0000 0000 0341`
- **Requires authentication**: `4000 0025 0000 3155`
- **Decline**: `4000 0000 0000 0002`

Use any future expiry date, any CVC, and any ZIP code.

## Troubleshooting

### "No such price" error
The price IDs in `.env.local` don't match Stripe. Verify you copied the correct price IDs from Stripe Dashboard (they start with `price_`, not `prod_`).

### Webhook not receiving events
**For local dev:**
- Make sure `stripe listen` is running
- Verify the webhook secret matches the CLI output

**For production:**
- Verify webhook URL is correct and accessible
- Check webhook logs in Stripe Dashboard
- Ensure STRIPE_WEBHOOK_SECRET is correct

### Subscription not updating in app
1. Check webhook is receiving events (Stripe Dashboard → Webhooks)
2. Check server logs for webhook errors
3. Verify STRIPE_WEBHOOK_SECRET is correct
4. Try logging out and back in to refresh session

## Production Deployment

When ready for production:

1. Switch to **Live mode** in Stripe Dashboard (toggle top-right)
2. Create the same 3 products in Live mode
3. Copy the LIVE price IDs
4. Update AWS SSM parameters with live keys (see [DEPLOYMENT.md](./DEPLOYMENT.md))
5. Create webhook endpoint for production domain
6. See [STRIPE-LIVE-MODE-SETUP.md](./STRIPE-LIVE-MODE-SETUP.md) for detailed instructions

## Common Mistakes to Avoid

- ❌ Copying **Product ID** (`prod_xxx`) instead of **Price ID** (`price_xxx`)
- ❌ Not clicking "Add product" to save
- ❌ Creating products in **Live mode** instead of **Test mode**
- ❌ Forgetting to update BOTH regular and `NEXT_PUBLIC_` variables
- ❌ Using test keys in production environment

## Next Steps

After setting up Stripe:
1. Deploy to AWS (see [DEPLOYMENT.md](./DEPLOYMENT.md))
2. Configure production environment variables
3. Test the full subscription flow
4. Monitor webhook delivery in Stripe Dashboard
