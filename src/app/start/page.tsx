"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store";
import { createSampleWorkoutDraft } from "@/lib/sample-workouts";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Dumbbell, FileText, Import, LogIn, Sparkles } from "lucide-react";

function buildAuthHref(callbackUrl: string) {
  return `/auth/login?mode=signup&callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export default function StartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [isSkipping, setIsSkipping] = useState(false);

  useEffect(() => {
    trackEvent("start_page_viewed", {
      authenticated: isAuthenticated,
    });
  }, [isAuthenticated]);

  const handleBrowseSample = () => {
    if (typeof window === "undefined") return;
    trackEvent("start_sample_selected");
    sessionStorage.setItem("workoutToEdit", JSON.stringify(createSampleWorkoutDraft()));
    router.push("/add/edit?guest=1");
  };

  const handleImportWorkout = () => {
    trackEvent("start_import_selected", {
      authenticated: isAuthenticated,
    });

    if (isAuthenticated) {
      router.push("/add");
      return;
    }

    router.push("/add");
  };

  const handleSkipForNow = async () => {
    if (!isAuthenticated) {
      router.push("/landing");
      return;
    }

    setIsSkipping(true);
    try {
      trackEvent("start_skip_selected", {
        authenticated: isAuthenticated,
      });
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: false, skipped: true }),
      });
      router.push("/");
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 md:px-6 md:py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="grid gap-6 rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(249,115,22,0.18),rgba(15,23,42,0.88))] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:grid-cols-[1.2fr_0.8fr] md:p-12">
          <div className="space-y-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Import-First Onboarding
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
                Start with a workout, not a questionnaire.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/75 md:text-lg">
                Kinex Fit works best when you feel the product immediately. Import a workout, preview a sample, or come back later.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 gap-2 px-6" onClick={handleImportWorkout}>
                <Import className="h-4 w-4" />
                Import Workout
              </Button>
              <Button size="lg" variant="outline" className="h-12 gap-2 border-white/20 bg-white/5 px-6 text-white hover:bg-white/10" onClick={handleBrowseSample}>
                <FileText className="h-4 w-4" />
                Browse Sample
              </Button>
            </div>

            <div className="grid gap-3 text-sm text-white/75 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-1 font-semibold text-white">Guest import</div>
                <div>Instagram, OCR, manual text, and 1 AI assist now work before sign-up.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-1 font-semibold text-white">Guest preview</div>
                <div>Save up to 3 workouts locally and keep them view-only until account creation.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-1 font-semibold text-white">Supported now</div>
                <div>Instagram links, screenshots, manual text, and 1 guest AI action on the web path.</div>
              </div>
            </div>
          </div>

          <Card className="border-white/10 bg-black/35 text-white shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Dumbbell className="h-6 w-6 text-primary" />
                Web Flow
              </CardTitle>
              <CardDescription className="text-white/65">
                Phase 1 keeps the first click productive without opening expensive imports to anonymous abuse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-1 text-sm font-semibold text-white">1. Import or preview</div>
                <p className="text-sm text-white/70">Jump into the editor from OCR, Instagram, AI, manual text, or a sample workout.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-1 text-sm font-semibold text-white">2. Save locally or sign up</div>
                <p className="text-sm text-white/70">Guest saves stay local and capped. Sign up when you want sync, migration, and higher quotas.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-1 text-sm font-semibold text-white">3. Complete onboarding by doing</div>
                <p className="text-sm text-white/70">Authenticated users complete onboarding after their first saved workout.</p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                {!isAuthenticated && (
                  <Link href={buildAuthHref("/add")} className="block">
                    <Button variant="secondary" className="w-full gap-2">
                      <LogIn className="h-4 w-4" />
                      Sign Up For Sync
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" className="w-full justify-center gap-2 text-white/70 hover:text-white" onClick={handleSkipForNow} disabled={isSkipping}>
                  Skip For Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
