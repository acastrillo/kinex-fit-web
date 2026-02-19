import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function BlogCTA() {
  return (
    <section className="mt-16 py-16 bg-gradient-to-br from-[#FF6B35] to-[#E55A2B] rounded-2xl text-center">
      <h2 className="text-3xl font-bold text-white mb-4">
        Transform Your Fitness Journey
      </h2>
      <p className="text-white/80 mb-8 max-w-xl mx-auto">
        Join Kinex Fit and get AI-powered workout plans tailored to your goals.
      </p>
      <Link
        href="/beta-signup"
        className={cn(
          buttonVariants({ size: "lg" }),
          "bg-white text-[#FF6B35] hover:bg-white/90 rounded-full px-8"
        )}
      >
        Get Started Free
      </Link>
    </section>
  );
}
