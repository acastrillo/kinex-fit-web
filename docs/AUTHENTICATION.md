# Kinex Fit - Authentication System

**Last Updated:** January 2026
**Auth Library:** NextAuth.js v4.24.7
**Session Type:** JWT (stateless)
**Purpose:** Complete authentication architecture documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Providers](#authentication-providers)
3. [Session Management](#session-management)
4. [Database Schema](#database-schema)
5. [Request Flow](#request-flow)
6. [Security Features](#security-features)
7. [Rate Limiting](#rate-limiting)
8. [Implementation Details](#implementation-details)
9. [Testing & Debugging](#testing--debugging)

---

## Overview

Kinex Fit uses **NextAuth.js** for authentication with support for multiple providers:

1. **Google OAuth** - Social login with Google accounts
2. **Facebook OAuth** - Social login with Facebook accounts
3. **Email/Password (Credentials)** - Traditional username/password auth
4. **Dev Login** - Development-only testing provider
5. **Apple Sign-In** - **Required for iOS release** (planned; not yet implemented in `src/lib/auth-options.ts`)

### Key Features

- ✅ Multi-provider support (OAuth + Credentials)
- ✅ Apple Sign-In required for iOS (pending implementation)
- ✅ JWT sessions (stateless, scalable)
- ✅ CSRF protection (built-in)
- ✅ Rate limiting (IP-based for login attempts)
- ✅ Password hashing (bcryptjs with 10 rounds)
- ✅ Session refresh (automatic token renewal)
- ✅ Dual database sync (SQLite for sessions, DynamoDB for user data)

---

## Authentication Providers

### 1. Google OAuth

**Configuration:** `src/lib/auth-options.ts`

```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      prompt: "select_account",  // Force account selection
      access_type: "offline",    // Get refresh token
      response_type: "code"
    }
  },
  profile(profile) {
    return {
      id: profile.sub,
      email: profile.email,
      firstName: profile.given_name,
      lastName: profile.family_name,
      image: profile.picture
    };
  }
})
```

**Requirements:**
- User must have verified email
- OAuth consent screen configured in Google Cloud Console
- Redirect URI: `https://kinexfit.com/api/auth/callback/google`

**Setup Guide:** See [setup-google-oauth.md](setup-google-oauth.md)

---

### 2. Facebook OAuth

**Configuration:** `src/lib/auth-options.ts`

```typescript
FacebookProvider({
  clientId: process.env.FACEBOOK_CLIENT_ID!,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
  profile(profile) {
    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      image: profile.picture?.data?.url
    };
  }
})
```

**Requirements:**
- App configured in Facebook App Dashboard
- Email permission requested
- Redirect URI: `https://kinexfit.com/api/auth/callback/facebook`

---

### 3. Email/Password (Credentials)

**Configuration:** `src/lib/auth-options.ts`

```typescript
CredentialsProvider({
  id: "credentials",
  name: "Email and Password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials, req) {
    // 1. Check rate limit
    const rateLimit = await checkRateLimit(ip, 'auth:login');
    if (!rateLimit.success) return null;

    // 2. Fetch user from DynamoDB
    const user = await dynamoDBUsers.getByEmail(credentials.email);
    if (!user || !user.passwordHash) return null;

    // 3. Verify password with bcrypt
    const isValid = await compare(credentials.password, user.passwordHash);
    if (!isValid) return null;

    // 4. Return user object
    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName
    };
  }
})
```

**Password Requirements:**
- Minimum 8 characters
- Hashed with bcryptjs (10 rounds)
- Stored in DynamoDB `spotter-users` table

**Signup Flow:**
1. User submits email + password via `/api/auth/signup`
2. Password hashed with bcryptjs
3. User created in DynamoDB
4. User automatically signed in with NextAuth

---

### 4. Apple Sign-In (Required for iOS - Planned)

**Status:** Not implemented yet in `src/lib/auth-options.ts` (NextAuth AppleProvider needed)

**Requirements:**
- Apple Developer Program membership
- Services ID, Key ID, and private key (.p8)
- Redirect URI: `https://kinexfit.com/api/auth/callback/apple`

**NextAuth Setup (to add):**
- Add `AppleProvider` with `clientId`, `clientSecret`, and `authorization` params
- Ensure email is requested and mapped into the user profile

**iOS Requirement:** Apple requires Sign in with Apple if any third-party social login is offered.

---

### 5. Dev Login (Development Only)

**Enabled When:** `NODE_ENV !== 'production' && ALLOW_DEV_LOGIN=true`

```typescript
CredentialsProvider({
  id: "dev-credentials",
  name: "Dev Login",
  credentials: {
    email: { label: "Email", type: "email" }
  },
  async authorize(credentials) {
    // Skip password check, create/fetch dev user
    return {
      id: "dev-user-123",
      email: credentials.email,
      name: "Dev User"
    };
  }
})
```

**Use Case:** Rapid testing without OAuth setup or password entry

---

## Session Management

### JWT Sessions (Stateless)

**Why JWT over Database Sessions:**
- ✅ No database lookup on every request (faster)
- ✅ Works across multiple ECS instances (no sticky sessions)
- ✅ Scalable (stateless)
- ❌ Cannot revoke immediately (must wait for expiration)

**Session Structure:**

```typescript
{
  user: {
    id: "user-550e8400-e29b-41d4-a716-446655440000",
    email: "john@example.com",
    name: "John Doe",
    image: "https://kinexfit.com/avatars/john.jpg",
    subscriptionTier: "pro"  // Cached for quick access
  },
  expires: "2025-02-08T12:00:00Z"  // 30 days from now
}
```

**JWT Claims:**
```json
{
  "sub": "user-123",
  "name": "John Doe",
  "email": "john@example.com",
  "picture": "https://...",
  "iat": 1704823200,
  "exp": 1707415200,
  "jti": "abc123"
}
```

### Session Lifecycle

```
1. USER LOGS IN
   └─> NextAuth creates JWT token
       Signed with AUTH_SECRET (HS256)
       Stored as HTTP-only cookie

2. USER MAKES REQUEST
   └─> Browser sends cookie automatically
       NextAuth verifies JWT signature
       Extracts user ID from token
       No database query needed!

3. SESSION REFRESH (after 24 hours)
   └─> NextAuth issues new JWT with updated expiration
       Cookie updated automatically

4. SESSION EXPIRES (after 30 days)
   └─> User must log in again
       Cannot extend expired session
```

### Session Configuration

```typescript
export const authOptions: NextAuthOptions = {
  providers: [...],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,  // 30 days
    updateAge: 24 * 60 * 60      // Refresh every 24 hours
  },
  jwt: {
    secret: process.env.AUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,        // Cannot be accessed by JavaScript
        sameSite: "lax",       // CSRF protection
        path: "/",
        secure: true           // HTTPS only (production)
      }
    }
  }
};
```

---

## Database Schema

### SQLite (Prisma) - NextAuth Tables

**File:** `prisma/schema.prisma`

**Tables:**
1. **User** - User identity (synced with DynamoDB)
2. **Account** - OAuth account links
3. **Session** - JWT session metadata (rarely used with JWT strategy)
4. **VerificationToken** - Email verification tokens

**Sync Strategy:**

```
SQLite (Prisma)                DynamoDB (spotter-users)
┌──────────────────┐          ┌──────────────────────────┐
│ User             │          │ User                     │
│ ├─ id            │ ◄────────┤ ├─ id (same UUID)       │
│ ├─ email         │   sync   │ ├─ email                │
│ ├─ name          │          │ ├─ firstName            │
│ └─ image         │          │ ├─ lastName             │
└──────────────────┘          │ ├─ subscriptionTier     │
                               │ ├─ trainingProfile      │
                               │ └─ ... (app-specific)   │
                               └──────────────────────────┘
```

**Why Dual Database?**
- NextAuth.js requires relational database for OAuth
- DynamoDB used for application-specific user data
- Same `id` field keeps them in sync

---

## Request Flow

### Complete Authentication Flow: Google OAuth

```
1. USER CLICKS "Sign in with Google"
   └─> Frontend: <button onClick={() => signIn('google')}>

2. NEXTAUTH REDIRECTS TO GOOGLE
   └─> URL: https://accounts.google.com/o/oauth2/v2/auth?
       client_id=...
       redirect_uri=https://kinexfit.com/api/auth/callback/google
       response_type=code
       scope=openid%20email%20profile

3. USER AUTHORIZES APP ON GOOGLE
   └─> Google redirects back to callback URL with code
       https://kinexfit.com/api/auth/callback/google?code=abc123

4. NEXTAUTH EXCHANGES CODE FOR TOKENS
   └─> POST https://oauth2.googleapis.com/token
       code=abc123
       client_id=...
       client_secret=...
   └─> Google returns access_token + id_token

5. NEXTAUTH FETCHES USER PROFILE
   └─> GET https://www.googleapis.com/oauth2/v3/userinfo
       Authorization: Bearer <access_token>
   └─> Google returns { sub, email, name, picture }

6. SIGNIN CALLBACK (src/lib/auth-options.ts)
   └─> Check if user exists in DynamoDB
   └─> If new: Create user in DynamoDB + Prisma
   └─> If existing: Update last login timestamp
   └─> Set default subscription tier (free)

7. JWT CALLBACK (src/lib/auth-options.ts)
   └─> Add custom claims to JWT:
       * subscriptionTier (for quick access)
       * firstName, lastName

8. SESSION CALLBACK (src/lib/auth-options.ts)
   └─> Expose JWT claims to client:
       session.user.subscriptionTier = jwt.subscriptionTier

9. NEXTAUTH SETS COOKIE
   └─> Set-Cookie: next-auth.session-token=<JWT>
       HttpOnly; Secure; SameSite=Lax; Path=/
       Max-Age=2592000 (30 days)

10. USER REDIRECTED TO DASHBOARD
    └─> Frontend: signIn() promise resolves
        window.location = "/dashboard"
```

### Authenticating API Requests

**Server-Side (API Routes):**

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  // ... fetch user-specific data
}
```

**Client-Side (React Components):**

```typescript
import { useSession } from "next-auth/react";

export function ProfileComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") return <Spinner />;
  if (status === "unauthenticated") return <LoginPrompt />;

  return <div>Welcome, {session.user.name}!</div>;
}
```

---

## Security Features

### 1. CSRF Protection

**Built into NextAuth.js:**
- CSRF token generated for each session
- Token verified on all POST requests to `/api/auth/*`
- Cookie: `next-auth.csrf-token`

**How it works:**
```
1. User loads login page
   └─> NextAuth sets CSRF token cookie

2. User submits login form
   └─> Form includes hidden CSRF token input
   └─> NextAuth verifies cookie matches form token

3. If mismatch: Request rejected (403 Forbidden)
```

---

### 2. Password Hashing

**Algorithm:** bcryptjs
**Rounds:** 10 (2^10 = 1,024 iterations)
**Salt:** Automatically generated per password

**Signup Flow:**
```typescript
import { hash } from "bcryptjs";

const hashedPassword = await hash(plainPassword, 10);

await dynamoDBUsers.create({
  id: randomUUID(),
  email: email,
  passwordHash: hashedPassword,  // Never store plain password!
  ...
});
```

**Login Flow:**
```typescript
import { compare } from "bcryptjs";

const isValid = await compare(plainPassword, user.passwordHash);
if (!isValid) {
  return null;  // Invalid credentials
}
```

---

### 3. Session Security

**HTTP-Only Cookies:**
- JavaScript cannot access session token
- Prevents XSS attacks from stealing tokens

**Secure Flag:**
- Cookie only sent over HTTPS
- Prevents man-in-the-middle attacks

**SameSite=Lax:**
- Cookie not sent on cross-site POST requests
- Prevents CSRF attacks

**Example Cookie Header:**
```
Set-Cookie: next-auth.session-token=eyJhbGciOiJIUzI1NiJ9...;
  Path=/;
  Expires=Sat, 08 Feb 2025 12:00:00 GMT;
  HttpOnly;
  Secure;
  SameSite=Lax
```

---

### 4. OAuth Security

**State Parameter:**
- Random string generated before OAuth redirect
- Verified when user returns from provider
- Prevents CSRF in OAuth flow

**PKCE (Proof Key for Code Exchange):**
- Not yet implemented (planned for future)
- Would prevent authorization code interception

---

## Rate Limiting

### Login Attempt Limiting

**Location:** `src/lib/auth-options.ts`

**Strategy:**
- IP-based rate limiting
- 10 attempts per hour
- Uses Upstash Redis for distributed counting

**Implementation:**
```typescript
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

const rateLimit = await checkRateLimit(
  getRequestIp(req.headers),
  'auth:login'
);

if (!rateLimit.success) {
  return null;  // Too many attempts
}
```

**Redis Key Structure:**
```
ratelimit:auth:login:192.168.1.100
  └─ Value: 5 (attempts)
  └─ TTL: 3600 seconds (1 hour)
```

**User Experience:**
```
Attempt 1-10: Login allowed
Attempt 11+:  "Too many login attempts. Try again in 1 hour."
```

---

## Implementation Details

### File Structure

```
src/
├── lib/
│   ├── auth-options.ts          # NextAuth configuration
│   ├── api-auth.ts              # Helper functions for API routes
│   └── rate-limit.ts            # Rate limiting logic
│
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/   # NextAuth API route
│   │       │   └── route.ts
│   │       └── signup/          # Custom signup endpoint
│   │           └── route.ts
│   │
│   └── (pages)/
│       ├── auth/
│       │   ├── signin/          # Custom sign-in page
│       │   └── error/           # Auth error page
│       └── onboarding/          # Post-signup flow
│
└── components/
    └── auth/
        ├── LoginForm.tsx        # Email/password login
        ├── SignupForm.tsx       # Email/password signup
        └── OAuthButtons.tsx     # Social login buttons
```

---

### Custom Callbacks

**signIn Callback:**
```typescript
callbacks: {
  async signIn({ user, account, profile }) {
    // 1. Check if user exists in DynamoDB
    let existingUser = await dynamoDBUsers.getByEmail(user.email);

    // 2. Create new user if first-time OAuth login
    if (!existingUser && account.type === "oauth") {
      existingUser = await dynamoDBUsers.create({
        id: randomUUID(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        subscriptionTier: "free",
        subscriptionStatus: "active"
      });
    }

    // 3. Allow sign-in
    return true;
  }
}
```

**jwt Callback:**
```typescript
callbacks: {
  async jwt({ token, user, account, trigger }) {
    // On initial sign-in, add custom claims
    if (user) {
      token.id = user.id;
      token.subscriptionTier = user.subscriptionTier;
      token.firstName = user.firstName;
      token.lastName = user.lastName;
    }

    // On session update (e.g., subscription change)
    if (trigger === "update") {
      const freshUser = await dynamoDBUsers.get(token.id);
      token.subscriptionTier = freshUser.subscriptionTier;
    }

    return token;
  }
}
```

**session Callback:**
```typescript
callbacks: {
  async session({ session, token }) {
    // Expose JWT claims to client
    session.user.id = token.id;
    session.user.subscriptionTier = token.subscriptionTier;
    session.user.firstName = token.firstName;
    session.user.lastName = token.lastName;
    return session;
  }
}
```

---

## Testing & Debugging

### Test Authentication Locally

**1. Dev Login (quickest):**
```bash
# Enable dev login
ALLOW_DEV_LOGIN=true

# Use any email to log in (no password)
```

**2. Google OAuth:**
```bash
# Set up Google OAuth credentials
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret

# Add http://localhost:3000/api/auth/callback/google to redirect URIs
```

**3. Email/Password:**
```bash
# Create test user via signup API
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

### Debug Session Issues

**Check Session:**
```typescript
import { getServerSession } from "next-auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  return Response.json(session);
}
```

**Check JWT:**
```bash
# Decode JWT token (copy from cookie)
echo "eyJhbGc..." | base64 -d | jq
```

**Common Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| `null` session | Cookie not sent | Check Secure flag (HTTPS required) |
| Session expired | Past 30 days | User must log in again |
| Wrong user data | Stale JWT | Trigger session update |
| CSRF error | Token mismatch | Clear cookies, try again |

---

## Best Practices

### 1. Never Trust Client-Side Sessions

❌ **Bad:**
```typescript
// Client can manipulate this!
const { session } = useSession();
if (session.user.subscriptionTier === 'pro') {
  // Show premium feature
}
```

✅ **Good:**
```typescript
// Verify on server
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = await dynamoDBUsers.get(session.user.id);
  if (user.subscriptionTier !== 'pro') {
    return new Response("Forbidden", { status: 403 });
  }
  // ... return premium data
}
```

### 2. Always Verify Sessions in API Routes

```typescript
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ... proceed with authenticated request
}
```

### 3. Use Rate Limiting for Sensitive Endpoints

```typescript
// Limit login attempts
const rateLimit = await checkRateLimit(ip, 'auth:login');

// Limit signup attempts
const rateLimit = await checkRateLimit(ip, 'auth:signup');

// Limit password reset
const rateLimit = await checkRateLimit(ip, 'auth:reset');
```

---

## Next Steps

- Read [API-REFERENCE.md](API-REFERENCE.md) for protected endpoint documentation
- Read [DATABASE.md](DATABASE.md) for user schema details
- Read [FRONTEND.md](FRONTEND.md) for auth UI components
- Review [EMAIL-PASSWORD-AUTH-SETUP.md](EMAIL-PASSWORD-AUTH-SETUP.md) for setup guide

---

**Last Updated:** January 2025
**Maintained By:** Development Team
**Questions?** Check NextAuth.js documentation or contact the team
