# Kinex Fit Web: Import-First Onboarding Execution Spec

Status: Phase 1 Implemented
Owner: Codex
Scope: Web app only (`kinex-fit-web`)

## Goal

Move the web app from auth-first onboarding to import-first onboarding.

The first meaningful win on web is:

1. User lands on a public entry point.
2. User starts importing or previews a sample workout immediately.
3. User reaches the workout editor/view before being forced through legacy onboarding.

## Current Constraints

- The legacy onboarding flow is 8 steps and lives in `src/app/onboarding/page.tsx`.
- The existing import flow already exists in `src/app/add/page.tsx`.
- OCR, Instagram import, ingest, AI generation, and workout persistence are all authenticated server flows today.
- The signed-in free tier already has its own quota model, so guest limits must be tracked separately.

## Web Adaptation

Phase 1 is intentionally a soft-guest version:

- Public entry point is import-first.
- Guests can preview a sample workout and save locally.
- Authenticated users can continue into the full `/add` import flow.
- Auth callbacks preserve the intended destination.
- Import success on the authenticated path becomes the new onboarding completion trigger.

This keeps the funnel moving without immediately opening expensive OCR/social/AI endpoints to anonymous abuse.

## Phase 1 Deliverables

1. Add a public `/start` route for import-first onboarding.
2. Redirect unauthenticated home traffic to `/start` instead of the old marketing-only path.
3. Make auth flows respect `callbackUrl` so import CTA handoff works.
4. Add a guest sample-workout path that reaches the workout editor without login.
5. Allow guest local save/view/delete for sample workouts.
6. Mark onboarding complete for authenticated users after first successful workout save from the import flow.
7. Route authenticated first-save users through a one-question quick-goal step before onboarding is cleared.

## Follow-Up Work After Phase 1

1. Replace the legacy 8-step onboarding UI with a true 2-step web onboarding route.
2. Add a quick-goal capture step after first import.
3. Add a thin analytics abstraction and instrument the new funnel.
4. Decide whether to support anonymous OCR/social/AI with guest tokens and stricter rate limiting.
5. Expand source support beyond Instagram only if product wants TikTok/YouTube parity.

## Implementation Notes

- Guest saves are local-only and capped at 3.
- Guest AI remains deferred until a later slice.
- The current web entry should not claim TikTok or generic URL support until the backend supports it.
