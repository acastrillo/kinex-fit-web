# Google OAuth Setup Guide for Kinex Fit

## Step 1: Access Google Cloud Console
1. Go to https://console.cloud.google.com/apis/credentials
2. Sign in with your Google account

## Step 2: Create or Select Project
- If you have an existing project for Kinex Fit, select it
- Otherwise, click "Create Project" and name it "Kinex Fit" (or similar)

## Step 3: Configure OAuth Consent Screen
1. Click "OAuth consent screen" in the left sidebar
2. Select "External" user type (unless you have Google Workspace)
3. Fill in:
   - App name: **Kinex Fit**
   - User support email: **alejo@kinexfit.com**
   - Developer contact: **alejo@kinexfit.com**
4. Add authorized domains:
   - **kinexfit.com**
5. Scopes: Add the following (should be default):
   - `openid`
   - `email`
   - `profile`
6. Click "Save and Continue"

## Step 4: Create OAuth Client ID
1. Click "Credentials" in the left sidebar
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: **Kinex Fit Web**
5. Authorized JavaScript origins:
   - `https://kinexfit.com`
   - `http://localhost:3000` (for testing)
6. Authorized redirect URIs:
   - `https://kinexfit.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for testing)
7. Click "Create"

## Step 5: Copy Credentials
After creating, you'll see a popup with:
- **Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-AbCdEf123456`)

**IMPORTANT:** Keep these credentials secure! We'll add them to AWS SSM next.

## Step 6: Run This Command
After you get the credentials, run:

```bash
# Replace with your actual credentials
GOOGLE_CLIENT_ID="your-client-id-here"
GOOGLE_CLIENT_SECRET="your-client-secret-here"

# Store in AWS SSM
MSYS_NO_PATHCONV=1 aws ssm put-parameter \
  --name "/spotter-app/prod/GOOGLE_CLIENT_ID" \
  --value "$GOOGLE_CLIENT_ID" \
  --type "String" \
  --region us-east-1 \
  --overwrite

MSYS_NO_PATHCONV=1 aws ssm put-parameter \
  --name "/spotter-app/prod/GOOGLE_CLIENT_SECRET" \
  --value "$GOOGLE_CLIENT_SECRET" \
  --type "SecureString" \
  --region us-east-1 \
  --overwrite
```

## Verification
After adding the credentials, verify they're in SSM:

```bash
MSYS_NO_PATHCONV=1 aws ssm get-parameter --name "/spotter-app/prod/GOOGLE_CLIENT_ID" --region us-east-1
```

Then you're ready to deploy!
