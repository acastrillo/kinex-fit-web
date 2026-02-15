# Kinex Fit iOS App Plan

**Repo**: `kinex-fit-ios`  
**Copy location**: `C:\kinex-fit-ios`  
**Source of truth (features & caps)**: `docs/PRICING.md` and backend API behavior

---

## 1) Goals & Outcomes

### Primary Goals
- Deliver a **native iOS app** that matches the current web experience for core flows: create/edit workouts, history, OCR scans, Instagram import, AI enhancements, and Workout of the Week.
- Provide a **fast, offline-first UX** with reliable sync and clear conflict resolution.
- Implement **StoreKit 2 subscriptions** with server-side entitlement sync.
- Ensure **Apple Sign-In** is supported and compliant.

### Non‑Goals (for MVP)
- Apple Watch app, HealthKit sync, or social/community features beyond existing sharing.
- Deep workout marketplace or coach management.

---

## 2) Current Product (User Perspective Summary)

### Core User Flows (Web → iOS parity)
- **Auth**: Sign in with Google/Facebook/Email (iOS must add Apple Sign-In).
- **Workout creation**:
  - Manual entry (title, notes, exercises, sets, reps, weight).
  - **OCR scan**: upload screenshot → text extraction → workout parsing → edit/save.
  - **Instagram import**: paste URL → parse caption → workout parsing → edit/save.
- **AI Enhancements**:
  - Clean up messy OCR/Instagram text.
  - AI workout generation/enhancement.
- **Workout of the Week (WOW)**:
  - Paid tiers only.
  - **Does not count toward scans or AI requests.**
- **Tracking**:
  - Workout history, calendar scheduling, PR tracking, body metrics.

### Pricing & Caps (from docs)
- **Free**: 8 scans/month (OCR + Instagram), 1 AI request/month, 90‑day history, unlimited workouts.
- **Core**: 12 scans/month, 10 AI requests/month, unlimited history.
- **Pro**: 60 scans/month, 30 AI requests/month.
- **Elite**: 120 scans/month, 100 AI requests/month.
- **All tiers**: unlimited workouts; scan caps reset **monthly** at month boundary.

### Counters
- Combined scan cap enforced via `scanQuotaUsed` (OCR + Instagram).
- Keep per‑source counters (`ocrQuotaUsed`, `instagramImportsUsed`) for analytics.
- Existing users should be reset to 0 for scan counters when switching to combined monthly caps.

---

## 3) iOS Product Scope

### MVP Scope (Must‑Have)
- **Authentication**: Google, Facebook, Apple, Email/Password.
- **Core Workouts**: list, detail, create, edit, delete.
- **Import/Scan**:
  - OCR via photo library/camera → `/api/ocr`.
  - Instagram import via URL and **Share Extension**.
- **AI Enhancements**: `/api/ai/enhance-workout`.
- **Workout of the Week**: `/api/ai/workout-of-the-week` (no AI quota consumption).
- **Offline‑first**: local persistence, queue writes, conflict resolution UI with timestamps.
- **Subscription paywall** + **StoreKit 2** subscriptions.
- **Push notifications**: weekly workout + reminders (user‑configurable).

### Near‑Term (Close Behind MVP)
- Workout of the Day (WOD)
- Workout templates
- Analytics dashboards (basic)
- Advanced timers

---

## 4) Technical Architecture (iOS)

### Recommended Stack (Native)
- **UI**: SwiftUI
- **State/Logic**: MVVM + async/await
- **Networking**: URLSession + typed API client
- **Local DB**: SQLite (GRDB) or Core Data
- **Secure Storage**: Keychain (tokens)
- **Image handling**: PhotosUI, VisionKit (scan cropping), local compression before upload
- **Background tasks**: BGTaskScheduler (sync)

### Why Native SwiftUI
- Best performance, native UX, strong support for camera/OCR flows, and share extensions.
- Lowest long‑term cost for iOS‑specific needs (Apple Sign‑In, StoreKit 2, push, share sheet).

---

## 5) Backend/API Work Required

### A) Mobile Authentication
Current backend uses NextAuth session cookies. Native iOS needs a **token‑based flow**.

**Plan**:
1. Add **mobile auth exchange endpoints**:
   - `POST /api/mobile/auth/apple`
   - `POST /api/mobile/auth/google`
   - `POST /api/mobile/auth/facebook`
   - `POST /api/mobile/auth/credentials`
2. Each endpoint validates provider token → returns **JWT access token** (and refresh token if needed).
3. Update `getAuthenticatedUserId()` to accept `Authorization: Bearer <token>` (in addition to session cookies) for mobile use.
4. Store tokens in iOS Keychain; refresh on expiry.

### B) Subscription Entitlements
- iOS uses **StoreKit 2**. Purchases should sync to DynamoDB.
- Add server endpoint to validate App Store receipts or integrate **RevenueCat** webhooks.
- Map App Store product IDs → tiers (core/pro/elite).

### C) Quota Reset (All Users)
- Run a migration to reset **all scan counters to 0**:
  - `scanQuotaUsed`, `ocrQuotaUsed`, `instagramImportsUsed` → 0.
  - Update reset timestamps to current month.

### D) Push Notifications
- Add server endpoints for scheduled reminders.
- Store user notification preferences.
- Use APNs (direct) or Firebase Cloud Messaging for shared infra with Android.

---

## 6) Data Model Mapping (iOS Local DB)

### Tables
- **User**: id, email, tier, subscription status, scan counters, AI usage
- **Workouts**: workoutId, title, content, exercises, tags, source, timestamps
- **BodyMetrics**: date, weight, measurements, notes
- **SyncQueue**: pending changes (create/update/delete) with retry metadata
- **Settings**: notification preferences, last sync time

### Conflict Resolution
- Use `updatedAt` timestamps from server and local.
- If conflict, show **last updated timestamps** for user choice (as requested).

---

## 7) Offline‑First Strategy

1. **Write‑through local DB**: all edits saved locally first.
2. **Sync queue**: store pending changes with retry/backoff.
3. **Conflict handling**: server vs local timestamps → user decision UI.
4. **Read strategy**: local cache + background refresh.

---

## 8) Feature Implementation Plan

### Phase 0 – Foundations
- Create repo `kinex-fit-ios`.
- Set up SwiftUI app shell, navigation, theme.
- Add networking client + auth token storage.

### Phase 1 – Auth & Onboarding
- Implement Sign‑In with Apple (required).
- Google/Facebook sign‑in.
- Email/password signup + login.
- Connect to mobile auth endpoints.

### Phase 2 – Workouts Core
- Workout list + detail.
- Create/edit/delete workout.
- Local persistence + offline edits.

### Phase 3 – OCR + Instagram Import
- OCR: camera/photo library → upload to `/api/ocr`.
- Instagram import: URL input + share extension.
- Parse results → edit screen.

### Phase 4 – AI Enhancements
- Enhance workout button after OCR/Instagram/manual.
- Call `/api/ai/enhance-workout`.

### Phase 5 – Workout of the Week
- Add WOW card on dashboard.
- Call `/api/ai/workout-of-the-week`.
- Ensure **no AI request decrement**.

### Phase 6 – Body Metrics & PRs
- Body metrics UI + sync.
- PR tracking display.

### Phase 7 – Subscriptions (StoreKit 2)
- Implement paywall + tier comparison.
- StoreKit 2 purchases.
- Server sync of entitlements.

### Phase 8 – Notifications
- Weekly workout reminders.
- User‑configurable toggles.
- APNs integration.

### Phase 9 – QA + App Store Prep
- Unit tests, UI tests.
- TestFlight internal → external.
- App Store review checklist.

---

## 9) Compliance & App Store

- **Apple Sign‑In** required.
- **IAP required** for subscriptions in app.
- Privacy policy must list OCR/image handling, AI processing, analytics.
- Handle user data deletion requests.

---

## 10) Risks & Mitigations

- **Auth complexity** → implement dedicated mobile JWT endpoints.
- **Offline conflicts** → explicit conflict UI with timestamps.
- **OCR accuracy** → allow user edit before save.
- **Subscription mismatch** → RevenueCat or receipt validation pipeline.

---

## 11) Deliverables

- iOS app repo with full feature parity to MVP scope.
- Backend mobile auth endpoints + bearer token support.
- StoreKit 2 subscriptions + entitlement sync.
- Push notifications + preferences.
- Documentation updates reflecting quotas and WOW policy.

---

## 12) Timeline (Aggressive MVP)

- Weeks 1–2: Foundation + Auth
- Weeks 3–4: Workouts core + offline DB
- Weeks 5–6: OCR/Instagram + AI enhancements
- Weeks 7–8: Subscriptions + push notifications
- Weeks 9–10: QA, polishing, TestFlight

---

## 13) Immediate Next Actions

1. Add mobile auth endpoints + bearer token support in API.
2. Decide iOS local DB (GRDB vs Core Data) and lock architecture.
3. Set up StoreKit product IDs to match tiers.
4. Reset all scan counters to 0 in DynamoDB.

