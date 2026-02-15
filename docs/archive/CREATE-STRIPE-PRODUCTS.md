# 🎯 Create Stripe Products - Step by Step

Your Stripe account is connected but has **zero products**. Follow these exact steps:

## Step 1: Open Stripe Dashboard

1. Go to: **https://dashboard.stripe.com/test/products**
2. You should see "No products" or an empty list
3. Look for the **"+ Add product"** button (top right)

## Step 2: Create Product #1 - Core

Click **"+ Add product"** and fill in:

```
Name: Kinex Fit Core
Description: (leave blank or add: "Perfect for individuals starting their fitness journey")
```

Under **Pricing**:
```
Price: 7.99
Billing period: Monthly
```

**Click "Add product"**

### ⚠️ IMPORTANT: Copy the Price ID
After saving, you'll see the product page. Look for:
- **Price ID:** `price_xxxxxxxxxxxxx`
- It starts with `price_` (NOT `prod_`)
- **COPY THIS ENTIRE ID** - you'll need it!

## Step 3: Create Product #2 - Pro

Click **"+ Add product"** again:

```
Name: Kinex Fit Pro
Description: (leave blank or add: "Advanced features for serious athletes")
```

Under **Pricing**:
```
Price: 14.99
Billing period: Monthly
```

**Click "Add product"**

### Copy the Price ID
**COPY the price ID** (starts with `price_`)

## Step 4: Create Product #3 - Elite

Click **"+ Add product"** again:

```
Name: Kinex Fit Elite
Description: (leave blank or add: "Complete fitness platform with AI")
```

Under **Pricing**:
```
Price: 34.99
Billing period: Monthly
```

**Click "Add product"**

### Copy the Price ID
**COPY the price ID** (starts with `price_`)

## Step 5: Update .env.local

Now open your `.env.local` file and update these lines:

```env
# Stripe Price IDs (Test Mode) - REPLACE WITH YOUR ACTUAL PRICE IDs
STRIPE_PRICE_CORE=price_[paste_core_price_id_here]
STRIPE_PRICE_PRO=price_[paste_pro_price_id_here]
STRIPE_PRICE_ELITE=price_[paste_elite_price_id_here]

# Client-side accessible (SAME IDs as above)
NEXT_PUBLIC_STRIPE_PRICE_CORE=price_[paste_core_price_id_here]
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_[paste_pro_price_id_here]
NEXT_PUBLIC_STRIPE_PRICE_ELITE=price_[paste_elite_price_id_here]
```

Save the file!

## Step 6: Verify They Work

In your terminal, run:

```bash
npx tsx scripts/list-all-stripe-products.ts
```

You should now see your 3 products with their price IDs!

## Common Mistakes ❌

- ❌ Copying **Product ID** (`prod_xxx`) instead of **Price ID** (`price_xxx`)
- ❌ Not clicking "Add product" to save
- ❌ Creating products in **Live mode** instead of **Test mode** (check top right toggle)
- ❌ Forgetting to update BOTH regular and `NEXT_PUBLIC_` variables

## What You Should Have

After this, running `npx tsx scripts/list-all-stripe-products.ts` should show:

```
🏷️  Product: Kinex Fit Core
   Product ID: prod_xxxxx
   💰 Prices:
      • Price ID: price_xxxxx (← COPY THIS)
        Amount: $7.99/month

🏷️  Product: Kinex Fit Pro
   Product ID: prod_xxxxx
   💰 Prices:
      • Price ID: price_xxxxx (← COPY THIS)
        Amount: $14.99/month

🏷️  Product: Kinex Fit Elite
   Product ID: prod_xxxxx
   💰 Prices:
      • Price ID: price_xxxxx (← COPY THIS)
        Amount: $34.99/month
```

## Next Steps

Once you've done this and updated `.env.local`, let me know and I'll:
1. Verify the price IDs work
2. Update AWS with the configuration
3. Deploy to production

---

**Need help?** Make sure you're in **Test mode** (top right toggle in Stripe Dashboard)
