import { Metadata } from "next"
import Link from "next/link"
import { PublicNav } from "@/components/public/PublicNav"
import { PublicFooter } from "@/components/public/PublicFooter"

export const metadata: Metadata = {
    title: "Privacy Policy | Kinex Fit",
    description: "Learn how Kinex Fit collects, uses, and protects your personal data.",
}

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            <PublicNav />

            <main className="pt-28 pb-20">
                <div className="container mx-auto px-6 max-w-3xl">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Privacy Policy</h1>
                    <p className="text-zinc-500 text-sm mb-12">Last updated: February 22, 2026</p>

                    <div className="space-y-10 text-zinc-400 leading-relaxed">
                        <section className="space-y-4">
                            <p>
                                At Kinex Fit, your privacy matters. This policy explains what information we collect,
                                how we use it, and the choices you have. By using Kinex Fit, you agree to the practices
                                described below.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">1. Information We Collect</h2>
                            <p><span className="text-zinc-200 font-medium">Account Information.</span> When you sign up, we collect your name, email address, and authentication credentials. You may sign in via Google, Facebook, email/password, or Apple.</p>
                            <p><span className="text-zinc-200 font-medium">Workout Data.</span> We store the workouts you log, including exercises, sets, reps, weight, RPE, rest times, and any notes you add.</p>
                            <p><span className="text-zinc-200 font-medium">Body Metrics.</span> If you choose to track body measurements, we store metrics such as weight, body fat percentage, and other measurements you provide.</p>
                            <p><span className="text-zinc-200 font-medium">Training Profile.</span> We collect your fitness goals, experience level, available equipment, preferred schedule, and personal records to personalize your experience.</p>
                            <p><span className="text-zinc-200 font-medium">Usage Data.</span> We automatically collect information about how you interact with the app, including pages visited, features used, and timestamps.</p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">2. How We Use Your Information</h2>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>To provide, maintain, and improve Kinex Fit&apos;s features</li>
                                <li>To generate personalized AI-powered workout plans and exercise recommendations</li>
                                <li>To track your fitness progress and display analytics</li>
                                <li>To process subscription payments and manage your account</li>
                                <li>To send important service updates and notifications</li>
                                <li>To detect and prevent fraud, abuse, or security incidents</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">3. AI-Powered Features</h2>
                            <p>
                                Kinex Fit uses artificial intelligence (powered by AWS Bedrock) to generate workout plans,
                                enhance exercises, and provide coaching recommendations. Your workout history and training
                                profile may be used as context to produce more relevant suggestions. We do not use your
                                data to train third-party AI models.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">4. Data Storage & Security</h2>
                            <p>
                                Your data is stored securely on Amazon Web Services (AWS) infrastructure in the United States,
                                using DynamoDB for structured data and S3 for file storage. All data is encrypted at rest
                                and in transit using industry-standard encryption protocols. We implement access controls,
                                monitoring, and regular security reviews to protect your information.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">5. Third-Party Services</h2>
                            <p>We use the following third-party services to operate Kinex Fit:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><span className="text-zinc-200 font-medium">Stripe</span> — Payment processing for subscriptions. Stripe handles all payment card data directly; we never store your card details.</li>
                                <li><span className="text-zinc-200 font-medium">Google & Facebook</span> — Optional sign-in providers. We only receive basic profile information (name and email) from these services.</li>
                                <li><span className="text-zinc-200 font-medium">AWS Bedrock</span> — AI model inference for workout generation and enhancement features.</li>
                                <li><span className="text-zinc-200 font-medium">Amazon S3</span> — Secure file and media storage.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">6. Data Sharing</h2>
                            <p>
                                We do not sell your personal information. We only share data with the third-party service
                                providers listed above, as necessary to operate the platform. We may disclose information
                                if required by law or to protect our rights and the safety of our users.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">7. Your Rights</h2>
                            <p>You have the right to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><span className="text-zinc-200 font-medium">Access</span> your personal data stored in Kinex Fit</li>
                                <li><span className="text-zinc-200 font-medium">Update</span> your account information and training profile at any time</li>
                                <li><span className="text-zinc-200 font-medium">Delete</span> your account and all associated data permanently</li>
                                <li><span className="text-zinc-200 font-medium">Export</span> your workout data</li>
                            </ul>
                            <p>
                                To exercise any of these rights, visit your account settings or contact us at{" "}
                                <Link href="mailto:support@kinexfit.com" className="text-[#FF6B35] hover:text-[#FF9F2E] underline">
                                    support@kinexfit.com
                                </Link>.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">8. Cookies & Local Storage</h2>
                            <p>
                                Kinex Fit uses essential cookies and browser local storage for authentication sessions
                                and app preferences. We do not use third-party advertising or tracking cookies.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">9. Children&apos;s Privacy</h2>
                            <p>
                                Kinex Fit is not intended for users under the age of 16. We do not knowingly collect
                                personal information from children. If you believe a child has provided us with personal
                                data, please contact us so we can delete it.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">10. Changes to This Policy</h2>
                            <p>
                                We may update this Privacy Policy from time to time. We will notify you of significant
                                changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date.
                                Your continued use of Kinex Fit after changes constitutes acceptance of the updated policy.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-white">Contact Us</h2>
                            <p>
                                If you have questions about this Privacy Policy, please contact us at{" "}
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
