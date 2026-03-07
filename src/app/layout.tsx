import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "@/components/providers/session-provider";
import { VersionChecker } from "@/components/VersionChecker";
import { GuestWorkoutMigrator } from "@/components/auth/guest-workout-migrator";

// TEMPORARILY DISABLED - TESTING IF GOOGLE FONTS CAUSING HANG
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Kinex Fit - Your AI-Powered Fitness Partner",
  description: "Transform your fitness journey with AI-powered workout plans, smart tracking, and personalized guidance. Kinex Fit helps you achieve your fitness goals.",
};

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

// Script to handle chunk loading failures after deployments
// When chunks are stale (old deployment), force a page reload
// Catches both: 1) unhandledrejection for ChunkLoadError, 2) script element errors
const chunkErrorHandler = `
  (function() {
    var STORAGE_KEY = 'chunk_reload_attempted';
    var hasAttemptedReload = sessionStorage.getItem(STORAGE_KEY) === 'true';

    function shouldReload() {
      if (hasAttemptedReload) return false;
      sessionStorage.setItem(STORAGE_KEY, 'true');
      return true;
    }

    function isChunkError(error) {
      if (!error) return false;
      var message = error.message || error.toString() || '';
      var name = error.name || '';
      return (
        name === 'ChunkLoadError' ||
        message.indexOf('Loading chunk') !== -1 ||
        message.indexOf('ChunkLoadError') !== -1 ||
        message.indexOf('Failed to fetch dynamically imported module') !== -1 ||
        message.indexOf('error loading dynamically imported module') !== -1
      );
    }

    // Handle unhandled promise rejections (ChunkLoadError from webpack dynamic imports)
    window.addEventListener('unhandledrejection', function(event) {
      var error = event.reason;
      if (isChunkError(error) && shouldReload()) {
        console.log('[ChunkErrorHandler] ChunkLoadError detected, reloading page...');
        event.preventDefault();
        window.location.reload();
      }
    });

    // Handle script element loading errors (static script tags that 404)
    window.addEventListener('error', function(event) {
      var target = event.target;
      // Check if it's a script element that failed to load
      if (target && target.tagName === 'SCRIPT') {
        var src = target.src || '';
        // Only reload for Next.js chunks, not external scripts like Stripe
        if (src.indexOf('/_next/') !== -1 && shouldReload()) {
          console.log('[ChunkErrorHandler] Script load failed:', src, '- reloading page...');
          window.location.reload();
        }
      }
    }, true);

    // Clear the flag after successful page load (5 seconds should be enough)
    if (hasAttemptedReload) {
      setTimeout(function() {
        sessionStorage.removeItem(STORAGE_KEY);
      }, 5000);
    }
  })();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Force dynamic rendering by accessing headers - this prevents Next.js from caching
  await headers();

  return (
    <html lang="en">
      <head>
        {/* Handle chunk loading failures from stale deployments */}
        <script dangerouslySetInnerHTML={{ __html: chunkErrorHandler }} />
      </head>
      <body
        className="antialiased relative min-h-screen bg-background text-text-primary overflow-x-hidden selection:bg-primary selection:text-white"
      >
        {/* Global PRO MAX Background Effects */}
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[100px] mix-blend-screen opacity-50 animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-500/5 rounded-full blur-[100px] mix-blend-screen opacity-50" />
        </div>

        <AuthSessionProvider>
          <VersionChecker />
          <GuestWorkoutMigrator />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
