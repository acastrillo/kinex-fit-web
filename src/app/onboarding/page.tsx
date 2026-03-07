'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuthStore } from '@/store';
import { createSampleWorkoutDraft } from '@/lib/sample-workouts';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Dumbbell, FileText, Loader2, Sparkles, Target } from 'lucide-react';

const QUICK_GOALS = [
  {
    id: 'hypertrophy',
    label: 'Build Muscle',
    description: 'Bias future workout recommendations toward hypertrophy-focused sessions.',
    trainingGoal: 'Build muscle (hypertrophy)',
  },
  {
    id: 'strength',
    label: 'Get Stronger',
    description: 'Favor compound lifts, progressive overload, and lower-rep strength work.',
    trainingGoal: 'Increase strength (powerlifting)',
  },
  {
    id: 'fat_loss',
    label: 'Lose Fat',
    description: 'Lean into conditioning, density, and calorie-burning training blocks.',
    trainingGoal: 'Lose fat / Weight loss',
  },
] as const;

function normalizeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/';
  }

  return raw;
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();
  const { user, isAuthenticated, isLoading: isSessionLoading } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const currentStep = searchParams.get('step');
  const isQuickGoalStep = currentStep === 'goals';
  const nextPath = useMemo(() => normalizeNextPath(searchParams.get('next')), [searchParams]);

  useEffect(() => {
    if (isSessionLoading) return;

    if (!isAuthenticated) {
      router.replace('/start');
      return;
    }

    if (user?.onboardingCompleted || user?.onboardingSkipped) {
      router.replace('/');
    }
  }, [isAuthenticated, isSessionLoading, router, user?.onboardingCompleted, user?.onboardingSkipped]);

  useEffect(() => {
    if (isSessionLoading) return;
    trackEvent('onboarding_viewed', {
      authenticated: isAuthenticated,
      step: isQuickGoalStep ? 'goals' : 'import',
    });
  }, [isAuthenticated, isQuickGoalStep, isSessionLoading]);

  const refreshSession = async () => {
    try {
      await updateSession();
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch {
      // Ignore refresh failures; DynamoDB state is already the source of truth.
    }
  };

  const handleSkipAll = async () => {
    setIsSaving(true);
    try {
      trackEvent('onboarding_skipped');
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: false, skipped: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to skip onboarding');
      }

      await refreshSession();
      window.location.replace('/');
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
      alert('Failed to skip onboarding. Please try again.');
      setIsSaving(false);
    }
  };

  const handleSampleWorkout = () => {
    if (typeof window === 'undefined') return;
    trackEvent('onboarding_sample_selected');
    sessionStorage.setItem('workoutToEdit', JSON.stringify(createSampleWorkoutDraft('sample_push_hypertrophy')));
    router.push('/add/edit');
  };

  const finishQuickGoalStep = async (goal?: string | null) => {
    setIsSaving(true);

    try {
      if (goal) {
        trackEvent('onboarding_goal_selected', {
          goal,
        });
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            goals: [goal],
            primaryGoal: goal,
            updatedAt: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save goal');
        }
      }

      const onboardingResponse = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: true }),
      });

      if (!onboardingResponse.ok) {
        throw new Error('Failed to complete onboarding');
      }

      await refreshSession();
      window.location.replace(nextPath);
    } catch (error) {
      console.error('Failed to finish onboarding:', error);
      alert('Failed to update onboarding. Please try again.');
      setIsSaving(false);
    }
  };

  if (isSessionLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (isQuickGoalStep) {
    return (
      <main className="min-h-screen px-4 py-10 md:px-6 md:py-16">
        <div className="mx-auto max-w-3xl">
          <Card className="border-primary/20 bg-[var(--surface)]/80 shadow-xl">
            <CardHeader className="space-y-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--primary)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                <Target className="h-3.5 w-3.5" />
                One Quick Thing
              </div>
              <div>
                <CardTitle className="text-3xl text-[var(--text-primary)]">What is your main goal right now?</CardTitle>
                <CardDescription className="mt-2 text-base text-[var(--text-secondary)]">
                  This is the only profile question in the web flow. You can skip it if you want.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {QUICK_GOALS.map((goal) => {
                const isSelected = selectedGoal === goal.trainingGoal;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setSelectedGoal(goal.trainingGoal)}
                    className={`w-full rounded-2xl border p-5 text-left transition-all ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                        : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]/40'
                    }`}
                  >
                    <div className="text-lg font-semibold text-[var(--text-primary)]">{goal.label}</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">{goal.description}</div>
                  </button>
                );
              })}

              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => finishQuickGoalStep(null)} disabled={isSaving}>
                  Skip
                </Button>
                <Button onClick={() => finishQuickGoalStep(selectedGoal)} disabled={!selectedGoal || isSaving}>
                  {isSaving ? 'Saving...' : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 md:px-6 md:py-16">
      <div className="mx-auto grid max-w-6xl gap-6 rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(249,115,22,0.14),rgba(15,23,42,0.92))] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:grid-cols-[1.2fr_0.8fr] md:p-12">
        <div className="space-y-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Authenticated Onboarding
          </div>

          <div className="space-y-3">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
              Import first. We will personalize after the win.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/75 md:text-lg">
              Save your first workout, then we ask a single goal question. No more 8-step setup before the product does anything useful.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/add" className="block">
              <Button size="lg" className="h-12 gap-2 px-6">
                <ArrowRight className="h-4 w-4" />
                Go To Import Flow
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 gap-2 border-white/20 bg-white/5 px-6 text-white hover:bg-white/10" onClick={handleSampleWorkout}>
              <FileText className="h-4 w-4" />
              Try Sample Workout
            </Button>
          </div>

          <div className="grid gap-3 text-sm text-white/75 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-1 font-semibold text-white">1. Import</div>
              <div>Use Instagram, OCR, or manual text in the existing authenticated flow.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-1 font-semibold text-white">2. Save</div>
              <div>The first saved workout becomes the activation event for onboarding.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-1 font-semibold text-white">3. One quick goal</div>
              <div>After save, answer one question or skip and go straight to the workout.</div>
            </div>
          </div>
        </div>

        <Card className="border-white/10 bg-black/35 text-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Dumbbell className="h-6 w-6 text-primary" />
              What Happens Next
            </CardTitle>
            <CardDescription className="text-white/65">
              The current web import stack stays intact. We are only removing the up-front friction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-1 text-sm font-semibold text-white">Supported on web right now</div>
              <p className="text-sm text-white/70">Instagram links, screenshots via OCR, manual text, and sample workouts.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-1 text-sm font-semibold text-white">Onboarding completion rule</div>
              <p className="text-sm text-white/70">First successful save routes into a single goal question and then clears onboarding.</p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <Button variant="ghost" className="w-full justify-center gap-2 text-white/70 hover:text-white" onClick={handleSkipAll} disabled={isSaving}>
                Skip For Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
