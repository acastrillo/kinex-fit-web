import { Metadata } from "next"
import Link from "next/link"
import { PublicNav } from "@/components/public/PublicNav"
import { PublicFooter } from "@/components/public/PublicFooter"

export const metadata: Metadata = {
    title: "Terms of Service | Kinex Fit",
    description: "Read the terms and conditions for using Kinex Fit.",
}

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            <PublicNav />

            <main className="pt-28 pb-20">
                <div className="container mx-auto px-6 max-w-3xl">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Terms of Service</h1>
                    <p className="text-zinc-500 text-sm mb-12">Last updated: February 22, 2026</p>

                    <div className="space-y-10 text-zinc-400 leading-relaxed">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using Kinex Fit (&quot;the Service&quot;), you agree to be bound by these Terms
                                of Service. If you do not agree to these terms, you may not use the Service. We may update
                                these terms from time to time, and your continued use constitutes acceptance of any changes.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">2. Description of Service</h2>
                            <p>
                                Kinex Fit is an AI-powered fitness platform that provides personalized workout generation,
                                exercise tracking, body metrics logging, progress analytics, and coaching recommendations.
                                The Service is available via web browser and mobile applications.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">3. User Accounts</h2>
                            <p>
                                You must create an account to use Kinex Fit. You are responsible for maintaining the
                                confidentiality of your login credentials and for all activities that occur under your account.
                                You agree to provide accurate, current, and complete information during registration.
                            </p>
                            <p>
                                You may sign in using email/password, Google, Facebook, or Apple authentication.
                                You must be at least 16 years old to create an account.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">4. Subscriptions & Billing</h2>
                            <p>
                                Kinex Fit offers both free and paid subscription tiers. The free tier includes core
                                workout tracking features. The Pro tier unlocks advanced AI features, unlimited workout
                                generation, and priority support.
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Payments are processed securely through Stripe. We do not store your payment card details.</li>
                                <li>Pro subscriptions are billed on a recurring basis (monthly or annually) and auto-renew unless cancelled.</li>
                                <li>You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period.</li>
                                <li>Refunds are handled on a case-by-case basis. Contact support for refund requests.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">5. AI-Generated Content Disclaimer</h2>
                            <p className="p-4 border border-[#FF6B35]/30 rounded-xl bg-[#FF6B35]/5">
                                <span className="text-zinc-200 font-semibold">Important:</span> Kinex Fit&apos;s AI-generated
                                workout plans and recommendations are for informational and educational purposes only.
                                They do not constitute medical advice, diagnosis, or treatment. Always consult a qualified
                                healthcare professional or certified personal trainer before starting any new exercise program,
                                especially if you have pre-existing health conditions or injuries.
                            </p>
                            <p>
                                While our AI strives to provide safe and effective programming based on established exercise
                                science principles, you acknowledge that you use AI-generated workouts at your own risk.
                                Kinex Fit is not liable for injuries resulting from following AI-generated recommendations.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">6. Acceptable Use</h2>
                            <p>You agree not to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
                                <li>Attempt to gain unauthorized access to any part of the Service or its systems</li>
                                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                                <li>Scrape, crawl, or use automated means to access the Service without permission</li>
                                <li>Share your account credentials or allow others to use your account</li>
                                <li>Abuse the AI features by submitting harmful, misleading, or inappropriate prompts</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">7. Your Content</h2>
                            <p>
                                You retain ownership of all workout data, body metrics, and other content you submit to
                                Kinex Fit. By using the Service, you grant us a limited license to store, process, and
                                display your content solely for the purpose of providing and improving the Service.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">8. Intellectual Property</h2>
                            <p>
                                The Kinex Fit name, logo, website, application code, design, and all related intellectual
                                property are owned by Kinex Fit. You may not copy, modify, distribute, or create derivative
                                works from any part of the Service without our written consent.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">9. Limitation of Liability</h2>
                            <p>
                                To the maximum extent permitted by law, Kinex Fit and its operators shall not be liable
                                for any indirect, incidental, special, consequential, or punitive damages arising from
                                your use of the Service. Our total liability for any claims related to the Service shall
                                not exceed the amount you paid us in the 12 months preceding the claim.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">10. Service Availability</h2>
                            <p>
                                We strive to keep Kinex Fit available at all times, but we do not guarantee uninterrupted
                                access. The Service may be temporarily unavailable due to maintenance, updates, or
                                circumstances beyond our control. We are not liable for any loss or inconvenience caused
                                by downtime.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">11. Termination</h2>
                            <p>
                                We reserve the right to suspend or terminate your account at our discretion if you violate
                                these Terms or engage in activity that harms the Service or other users. You may delete
                                your account at any time from your account settings. Upon deletion, your data will be
                                permanently removed in accordance with our{" "}
                                <Link href="/privacy" className="text-[#FF6B35] hover:text-[#FF9F2E] underline">
                                    Privacy Policy
                                </Link>.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">12. Governing Law</h2>
                            <p>
                                These Terms shall be governed by and construed in accordance with the laws of the
                                United States. Any disputes arising from these Terms or the Service shall be resolved
                                through binding arbitration or in the courts of competent jurisdiction.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">Contact Us</h2>
                            <p>
                                If you have questions about these Terms, please contact us at{" "}
                                <Link href="mailto:support@kinexfit.com" className="text-[#FF6B35] hover:text-[#FF9F2E] underline">
                                    support@kinexfit.com
                                </Link>.
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    )
}
