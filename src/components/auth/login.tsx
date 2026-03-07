"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dumbbell, ArrowLeft } from "lucide-react";
import Link from "next/link";

type AuthMode = "signin" | "signup";

function normalizeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }

  return raw;
}

export function Login() {
  const { login, loginWithCredentials, signup, devLogin } = useAuthStore();
  const searchParams = useSearchParams();
  const [loadingProvider, setLoadingProvider] = useState<"google" | "facebook" | "email" | "credentials" | "dev" | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("signin");
  const isDev = process.env.NODE_ENV === "development";
  const allowDevLogin = process.env.NEXT_PUBLIC_ALLOW_DEV_LOGIN === "true";
  const showDevLogin = isDev && allowDevLogin;
  const callbackUrl = normalizeCallbackUrl(searchParams.get("callbackUrl"));
  const authModeHrefSuffix = callbackUrl !== "/" ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : "";

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "signup" || modeParam === "signin") {
      setMode(modeParam);
    }

    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (!error) {
      setAuthError(null);
      return;
    }

    // Log for debugging (visible in browser console)
    console.error("Auth error:", error, errorDescription);

    switch (error) {
      case "AccessDenied":
        setAuthError("Access was denied. This may be a temporary issue. Please try again.");
        break;
      case "Configuration":
        setAuthError("Sign-in configuration issue. Please clear your cookies and try again.");
        break;
      case "OAuthSignin":
        setAuthError("OAuth sign-in failed. Please try again or use a different browser.");
        break;
      case "OAuthCallback":
        setAuthError("OAuth callback failed. The session may have expired. Please try again.");
        break;
      case "OAuthCreateAccount":
        setAuthError("Could not create account. Please contact support.");
        break;
      case "EmailCreateAccount":
        setAuthError("Could not create account with this email. Please contact support.");
        break;
      case "Callback":
        setAuthError("Callback error. Please clear your cookies and try again.");
        break;
      case "OAuthAccountNotLinked":
        setAuthError("This email is already associated with another account.");
        break;
      case "EmailSignin":
        setAuthError("Email sign-in failed. Please check your email and try again.");
        break;
      case "CredentialsSignin":
        setAuthError("Credentials sign-in failed. Please check your credentials.");
        break;
      case "SessionRequired":
        setAuthError("Session required. Please sign in again.");
        break;
      default:
        setAuthError(
          errorDescription
            ? `Sign-in error: ${errorDescription}`
            : "We could not complete the sign-in. Please try again."
        );
        break;
    }
  }, [searchParams]);

  const providers = useMemo(
    () => [
      { id: "google" as const, variant: "default" as const },
      { id: "facebook" as const, variant: "outline" as const },
    ],
    []
  );

  const isSignUp = mode === "signup";

  const getProviderLabel = (provider: "google" | "facebook") => {
    const action = isSignUp ? "Sign up" : "Sign in";
    return `${action} with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
  };

  const handleProviderSignIn = useCallback(
    async (provider: "google" | "facebook") => {
      try {
        setAuthError(null);
        setEmailStatus(null);
        setLoadingProvider(provider);
        await login(provider, callbackUrl);
      } catch (error) {
        console.error(`${provider} sign-in error:`, error);
        setAuthError("We could not start the sign-in. Please try again.");
      } finally {
        setLoadingProvider(null);
      }
    },
    [callbackUrl, login]
  );

  const handleEmailPasswordAuth = useCallback(async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    if (!trimmedPassword || trimmedPassword.length < 8) {
      setAuthError("Password must be at least 8 characters.");
      return;
    }

    try {
      setAuthError(null);
      setEmailStatus(null);
      setLoadingProvider("credentials");

      if (isSignUp) {
        // Sign up
        const result = await signup(trimmedEmail, trimmedPassword);
        if (!result.success) {
          setAuthError(result.error || "Signup failed");
          return;
        }
        trackEvent("auth_signup_succeeded", {
          callbackUrl,
        });

        try {
          await loginWithCredentials(trimmedEmail, trimmedPassword, callbackUrl);
          return;
        } catch (loginError) {
          console.warn("Auto sign-in after signup failed:", loginError);
          setEmailStatus(result.message || "Account created. Please sign in.");
          setMode("signin");
        }
      } else {
        // Sign in
        trackEvent("auth_signin_requested", {
          callbackUrl,
        });
        await loginWithCredentials(trimmedEmail, trimmedPassword, callbackUrl);
        // Auto-redirects on success
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setAuthError(error.message || "Authentication failed. Please try again.");
    } finally {
      setLoadingProvider(null);
    }
  }, [callbackUrl, email, password, isSignUp, signup, loginWithCredentials]);

  const handleDevLogin = useCallback(async () => {
    try {
      setAuthError(null);
      setEmailStatus(null);
      setLoadingProvider("dev");
      await devLogin("test@localhost.dev", callbackUrl);
    } catch (error) {
      console.error("Dev login error:", error);
      setAuthError("Dev login failed. Check console for details.");
    } finally {
      setLoadingProvider(null);
    }
  }, [callbackUrl, devLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-surface/50 backdrop-blur-md border-white/10">
        <CardHeader className="space-y-1 text-center">
          {/* Back button */}
          <div className="flex justify-start mb-2">
            <Link href="/sign-in" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-[var(--primary)]/10">
              <Dumbbell className="h-12 w-12 text-[var(--primary)]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-[var(--text-primary)]">
            {isSignUp ? "Create your account" : "Welcome back"}
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)] text-base">
            {isSignUp
              ? "Start tracking your fitness journey"
              : "Sign in to continue your progress"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          {authError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive text-center">
              {authError}
            </div>
          )}
          {emailStatus && (
            <div className="rounded-lg bg-emerald-100 border border-emerald-200 p-4 text-sm text-emerald-700 text-center">
              {emailStatus}
            </div>
          )}
          <div className="space-y-3 text-sm text-[var(--text-secondary)] text-center px-2">
            <p>Track workouts, monitor progress, and sync across all your devices.</p>
          </div>

          {/* Dev Login - Only visible in development */}
          {showDevLogin && (
            <div className="space-y-2">
              <Button
                onClick={handleDevLogin}
                className="w-full h-12 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-black"
                disabled={loadingProvider !== null}
              >
                {loadingProvider === "dev" ? "Signing in..." : "Dev Login (test@localhost.dev)"}
              </Button>
              <p className="text-xs text-center text-amber-600">Development mode only - not visible in production</p>
            </div>
          )}

          <div className="space-y-3">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                onClick={() => handleProviderSignIn(provider.id)}
                className="w-full h-12 text-base font-semibold transition-all shadow-lg"
                variant={provider.variant}
                disabled={loadingProvider !== null}
              >
                {loadingProvider === provider.id ? "Redirecting..." : getProviderLabel(provider.id)}
              </Button>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--surface)] px-2 text-[var(--text-tertiary)]">
                Or {isSignUp ? "sign up" : "sign in"} with email and password
              </span>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEmailPasswordAuth();
            }}
            className="space-y-3"
          >
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loadingProvider === "credentials"}
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loadingProvider === "credentials"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold transition-all"
              disabled={loadingProvider === "credentials"}
            >
              {loadingProvider === "credentials"
                ? (isSignUp ? "Creating account..." : "Signing in...")
                : (isSignUp ? "Create account" : "Sign in")}
            </Button>
          </form>

          {/* Mode switcher */}
          <div className="text-center pt-2">
            <p className="text-sm text-[var(--text-secondary)]">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <Link href={`/auth/login?mode=signin${authModeHrefSuffix}`} className="text-[var(--primary)] hover:underline font-medium">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <Link href={`/auth/login?mode=signup${authModeHrefSuffix}`} className="text-[var(--primary)] hover:underline font-medium">
                    Sign up
                  </Link>
                </>
              )}
            </p>
          </div>

          <p className="text-xs text-center text-[var(--text-tertiary)] pt-2">
            Secured by NextAuth and AWS. By continuing, you agree to our Terms of Service.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
