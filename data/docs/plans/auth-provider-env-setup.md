# Multi-Provider Auth - Environment & Secret Plan

We are replacing the Cognito-only sign-in with first-class Google, Facebook, and Email (magic link) providers managed directly by NextAuth. This document captures everything needed to provision and deliver the new secrets through AWS so engineers do not have to manage them locally.

---

## 1. Global Requirements
- **NEXTAUTH_URL:** keep per-environment (`https://kinexfit.com` for prod, staging URL for preview). This is what NextAuth uses for callback URL validation, so make sure it matches the URL you register with each provider.
- **AUTH_SECRET:** already required. Rotate it if you regenerate provider apps, and ensure it remains in AWS SSM/Secrets Manager before deployments.
- **Secret Storage:** continue using AWS SSM Parameter Store path `/spotter-app/{env}/` (see `docs/SECURITY-REVIEW.md`). If the task role only has wildcard access today, scope it down to the specific new parameters listed below.
- **CI/CD:** once parameters are populated, update the ECS task definition or deployment workflow to inject them as container environment variables. No `.env.local` changes are necessary.

---

## 2. Google OAuth Provider
1. **Create/Update Google Cloud OAuth App**
   - Go to <https://console.cloud.google.com/apis/credentials>.
   - Application type: Web application (you can continue using the existing client ID/secret).
   - Authorized JavaScript origins (current prod origin is set; add the others when convenient):
     - `https://kinexfit.com`
     - `https://<staging-domain>` (add once the staging URL is finalized)
     - `http://localhost:3000` (optional for local testing)
   - Authorized redirect URIs:
     - `https://kinexfit.com/api/auth/callback/google`
     - `https://<staging-domain>/api/auth/callback/google` (add when staging URL exists)
     - `http://localhost:3000/api/auth/callback/google` (optional dev)
2. **Scopes:** default `openid email profile` is sufficient. If Google review requires, publish the OAuth consent screen and add required branding information.
3. **Secrets to store in AWS:**
   - `/spotter-app/{env}/GOOGLE_CLIENT_ID` (keep existing value)
   - `/spotter-app/{env}/GOOGLE_CLIENT_SECRET`
4. **Testing:** after storing secrets, deploy to staging and run the Google button in the Playwright auth spec (will redirect directly to `accounts.google.com` instead of Cognito).

---

## 3. Facebook (Meta) OAuth Provider
1. **Create/Configure Meta App**
   - Go to <https://developers.facebook.com/apps> and open the existing Consumer app (App ID `3758257434481536`).
   - Under **Settings → Basic**, confirm the contact email, privacy policy URL, and add the website platform with `https://kinexfit.com` (and staging URL later). This unlocks additional login settings.
   - To retrieve the **App Secret**, stay on the same page and click **Show** next to *App Secret* (Meta will prompt for your Facebook password or 2FA). Use that value for `/FACEBOOK_CLIENT_SECRET`. Never check it into git. The string you provided (`cc775e3d...`) looked like an app token rather than the secret—make sure the SecureString in SSM uses the actual App Secret (`610016fe37b5d909609afd0219a2d867` for prod).
2. **Facebook Login Settings**
   - Navigate to **Facebook Login → Settings** and add the Valid OAuth Redirect URIs:
     - `https://kinexfit.com/api/auth/callback/facebook`
     - `https://<staging-domain>/api/auth/callback/facebook`
     - `http://localhost:3000/api/auth/callback/facebook` (optional dev)
   - Ensure **Login from Devices** is disabled unless needed.
3. **Permissions:** by default the app has standard access to `public_profile`. Grant the `email` permission by going to **App Review → Permissions and Features** → search for `email` → click **Request advanced access** (Meta may ask questionnaire info). Only request additional scopes if absolutely required.
4. **Secrets to store in AWS:**
   - `/spotter-app/{env}/FACEBOOK_CLIENT_ID` (value `3758257434481536`)
   - `/spotter-app/{env}/FACEBOOK_CLIENT_SECRET` (the App Secret retrieved above)
5. **Additional Checklist:**
   - Verify `cannashieldct.com` under **Brand Safety → Domains** so Facebook login trusts the domain.
   - Provide a Data Deletion URL (Meta requires this under **Settings → Advanced → Data Deletion Instructions**). You can point it to a docs page or support email until a dedicated flow exists.
   - Switch the app to **Live** mode once staging tests pass; otherwise only users added as testers can log in.
6. **Testing:** verify that `signIn("facebook")` redirects to `www.facebook.com/v.../dialog/oauth` and the callback hits `/api/auth/callback/facebook`. Watch for Meta error codes indicating missing permissions or invalid redirect URLs.

---

## 4. Email (Magic Link) Provider
1. **SMTP Provider Recommendation**
   - **Amazon SES** is the most cost-effective path (about $0.10 per 1,000 emails and no extra provider to manage) and keeps all auth infra within AWS. Stick with SES unless deliverability requirements force a dedicated transactional provider like Postmark.
2. **SES Setup Steps**
   1. **Verify Domain:** In the AWS console (same region as the app), open **Amazon SES → Configuration → Verified Identities** and add `cannashieldct.com` (or a login-specific subdomain like `auth.cannashieldct.com`). SES will output TXT and CNAME records for verification + DKIM—publish them in Route 53 (or your DNS host) and wait for status = Verified.
   2. **Production Access:** If the account is still in the SES sandbox, open a Service Quota request to move it to production so you can email any address.
   3. **Configure MAIL FROM (optional but recommended):** Inside the identity, set a custom MAIL FROM domain (`mail.cannashieldct.com`) and publish the SPF TXT record SES provides. This boosts deliverability.
   4. **Create SMTP Credentials:** Go to **SES → SMTP settings → Create SMTP credentials**. This spins up an IAM user specifically for SMTP auth and gives you a username/password—store those values in SSM.
   5. **Bounce/Complaint Handling:** Enable SNS notifications or CloudWatch alarms on bounces to stay on top of deliverability issues.
3. **Environment Variables:**
   - `/spotter-app/{env}/EMAIL_SERVER_HOST` (SES endpoint, e.g. `email-smtp.us-east-1.amazonaws.com`)
   - `/spotter-app/{env}/EMAIL_SERVER_PORT` (465 for SSL or 587 for STARTTLS)
   - `/spotter-app/{env}/EMAIL_SERVER_USER` (SMTP username)
   - `/spotter-app/{env}/EMAIL_SERVER_PASSWORD`
   - `/spotter-app/{env}/EMAIL_SERVER_SECURE` (`true` when using port 465)
   - `/spotter-app/{env}/EMAIL_FROM` (e.g. `Kinex Fit <login@cannashieldct.com>`)
   - Optional: `/spotter-app/{env}/AWS_SES_REGION` to reuse in logging.
4. **Security Considerations:**
   - Implement a rate limiter (per IP/email) around the `/api/auth/signin/email` handler to avoid spamming.
   - Log all email sign-in requests and watch CloudWatch metrics for bounce/complaint spikes. Update privacy policy to cover magic-link delivery.
5. **Testing Flow:**
   - In SES sandbox mode, send to verified inboxes to validate NextAuth’s Email provider.
   - Once production access is granted and DNS propagates, trigger `signIn("email", { email })` on staging, click the magic link, and ensure the NextAuth callback logs the user in without Cognito involvement.

---

## 5. AWS Deployment Checklist
1. **Populate SSM Parameters:**
   - Use `aws ssm put-parameter --name /spotter-app/{env}/... --type SecureString`.
   - Grant the ECS task role `ssm:GetParameter` on the new ARNs only.
2. **Update Task Definition / Deploy Scripts:**
   - Map each SSM parameter to container env vars (for example in `task-def-*.json` or `deploy-to-aws.ps1`).
   - Remove legacy Cognito vars after full cutover (or mark them deprecated for rollback).
3. **Staging Deploy:**
   - Trigger deployment (for example `npm run build` + `deploy.sh`) so the new env vars are baked into the container definition.
   - Validate Google, Facebook, and Email flows manually plus via `tests/auth-flow.spec.ts` (extend spec in later steps).
4. **Production Deploy:**
   - Repeat parameter setup for `/spotter-app/prod/*`.
   - Promote the same image/release after staging sign-off.
5. **Monitoring:**
   - Enable CloudWatch log metric filters for NextAuth errors (failed email send, OAuth errors).
   - Add alarms for elevated `EmailSignin` failures to catch SMTP or domain issues quickly.

---

## 6. Outstanding Questions for the Team
1. Which SMTP provider should back the magic-link emails (SES vs external)?
2. Do we keep Cognito credentials around for rollback, or remove them once the new providers are live?
3. Is there any compliance requirement (for example SOC 2) that mandates storing secrets in Secrets Manager instead of SSM? Adjust accordingly.

Answer these before starting Step 2 so the provider configuration reflects the final infrastructure decisions.
