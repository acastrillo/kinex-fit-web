import { Metadata } from "next"
import Link from "next/link"
import { PublicNav } from "@/components/public/PublicNav"
import { PublicFooter } from "@/components/public/PublicFooter"
import { Mail, ChevronDown } from "lucide-react"

export const metadata: Metadata = {
    title: "Support | Kinex Fit",
    description: "Get help with Kinex Fit. Find answers to common questions or contact our support team.",
}

const faqs = [
    {
        category: "Account",
        questions: [
            {
                q: "How do I create an account?",
                a: "You can sign up for free at kinexfit.com using your email, Google, Facebook, or Apple account. Just click \"Sign Up\" and follow the prompts.",
            },
            {
                q: "How do I delete my account?",
                a: "Go to Settings in the app, scroll to the bottom, and select \"Delete Account.\" This will permanently remove your account and all associated data. This action cannot be undone.",
            },
            {
                q: "I forgot my password. How do I reset it?",
                a: "On the sign-in page, click \"Forgot password?\" and enter the email address associated with your account. You'll receive a password reset link via email.",
            },
        ],
    },
    {
        category: "Workouts & Tracking",
        questions: [
            {
                q: "How do I log a workout?",
                a: "Navigate to the Create Workout section. You can manually add exercises, sets, and reps, or use our AI to generate a workout based on your goals and equipment.",
            },
            {
                q: "Can I import workouts from Instagram?",
                a: "Yes! Kinex Fit can parse workout posts from Instagram. Use the Instagram Import tab in the Create Workout section and paste the URL of the post.",
            },
            {
                q: "How does the AI workout generator work?",
                a: "Our AI uses your training profile — including your goals, experience level, available equipment, and workout history — to generate personalized workout plans. It's powered by advanced language models and grounded in exercise science principles.",
            },
        ],
    },
    {
        category: "Subscriptions & Billing",
        questions: [
            {
                q: "What's included in the free plan?",
                a: "The free plan includes core workout tracking, manual workout creation, body metrics logging, and basic progress analytics.",
            },
            {
                q: "What does Pro unlock?",
                a: "Pro gives you unlimited AI workout generation, advanced exercise recommendations, enhanced analytics, and priority support.",
            },
            {
                q: "How do I cancel my subscription?",
                a: "You can cancel anytime from the Settings page in the app. Your Pro features will remain active until the end of your current billing period.",
            },
            {
                q: "What payment methods do you accept?",
                a: "We accept all major credit and debit cards through Stripe, our secure payment processor. We never store your card details directly.",
            },
        ],
    },
    {
        category: "Data & Privacy",
        questions: [
            {
                q: "Is my data secure?",
                a: "Yes. Your data is stored on encrypted AWS infrastructure with strict access controls. All data is encrypted in transit and at rest. For full details, see our Privacy Policy.",
            },
            {
                q: "Can I export my workout data?",
                a: "Yes. You can request a data export from your account settings. We'll provide your workout history and profile data in a standard format.",
            },
            {
                q: "Do you sell my data?",
                a: "No, never. We do not sell, rent, or share your personal data with advertisers or data brokers. See our Privacy Policy for details on how we handle your information.",
            },
        ],
    },
]

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            <PublicNav />

            <main className="pt-28 pb-20">
                <div className="container mx-auto px-6 max-w-3xl">
                    {/* Hero */}
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">How can we help?</h1>
                        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                            Find answers to common questions below, or reach out to our team directly.
                        </p>
                    </div>

                    {/* Contact Card */}
                    <div className="mb-16 p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 text-center">
                        <div className="w-14 h-14 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center mx-auto mb-5">
                            <Mail className="w-7 h-7 text-[#FF6B35]" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Contact Support</h2>
                        <p className="text-zinc-400 mb-5">
                            Have a question, found a bug, or need help with your account? We typically respond within 24 hours.
                        </p>
                        <Link
                            href="mailto:support@kinexfit.com"
                            className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-medium px-6 py-3 rounded-full transition-colors"
                        >
                            <Mail className="w-4 h-4" />
                            support@kinexfit.com
                        </Link>
                    </div>

                    {/* FAQ */}
                    <div className="space-y-12">
                        <h2 className="text-2xl font-bold text-center">Frequently Asked Questions</h2>

                        {faqs.map((section) => (
                            <div key={section.category} className="space-y-4">
                                <h3 className="text-lg font-semibold text-[#FF6B35] uppercase tracking-wider text-sm">
                                    {section.category}
                                </h3>
                                <div className="space-y-3">
                                    {section.questions.map((faq) => (
                                        <details
                                            key={faq.q}
                                            className="group border border-zinc-800 rounded-xl bg-zinc-900/30 hover:border-zinc-700 transition-colors"
                                        >
                                            <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-zinc-200 font-medium list-none">
                                                {faq.q}
                                                <ChevronDown className="w-4 h-4 text-zinc-500 group-open:rotate-180 transition-transform shrink-0 ml-4" />
                                            </summary>
                                            <div className="px-6 pb-5 text-zinc-400 leading-relaxed">
                                                {faq.a}
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Links */}
                    <div className="mt-16 pt-8 border-t border-zinc-800 text-center text-sm text-zinc-500">
                        <p>
                            Also see our{" "}
                            <Link href="/privacy" className="text-[#FF6B35] hover:text-[#FF9F2E] underline">Privacy Policy</Link>
                            {" "}and{" "}
                            <Link href="/terms" className="text-[#FF6B35] hover:text-[#FF9F2E] underline">Terms of Service</Link>.
                        </p>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    )
}
