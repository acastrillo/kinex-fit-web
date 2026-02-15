"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, ArrowRight, Zap, Target, Dumbbell, Clock } from "lucide-react"
import Link from "next/link"

export default function DemoPage() {
    const [prompt, setPrompt] = useState("")

    const examplePrompts = [
        "Upper body push, 45 min, dumbbells",
        "Full body HIIT, 30 min, bodyweight",
        "Leg day with squats, strength focus",
        "Core workout, 20 min, no equipment",
    ]

    const mockWorkout = {
        title: "Upper Body Push Workout",
        description: "Dumbbell-focused pushing exercises targeting chest, shoulders, and triceps",
        exercises: 6,
        duration: 45,
        difficulty: "intermediate"
    }

    return (
        <>
            <Header />
            <main className="min-h-screen pb-20 md:pb-8">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    {/* Demo Banner */}
                    <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <h2 className="font-semibold text-text-primary">Demo: Simplified UI</h2>
                        </div>
                        <p className="text-sm text-text-secondary">
                            This is a preview of the new, less wordy interface. Compare with the{" "}
                            <Link href="/add/generate" className="text-primary hover:underline">
                                current version
                            </Link>
                        </p>
                    </div>

                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="h-8 w-8 text-primary" />
                            <h1 className="text-3xl font-bold text-text-primary">
                                AI Workout Generator
                            </h1>
                        </div>
                        <p className="text-text-secondary">
                            Describe your workout. AI builds the plan.
                        </p>
                    </div>

                    {/* Main Content */}
                    <div className="grid gap-6">
                        {/* Quota Display - Simplified */}
                        <Card className="border-primary/20">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Zap className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-text-primary">
                                                AI Generations
                                            </p>
                                            <p className="text-xs text-text-secondary">
                                                Resets monthly
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-primary">
                                        5 / 10
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Input Card - More ChatGPT-like */}
                        <Card>
                            <CardHeader>
                                <CardTitle>What workout do you want?</CardTitle>
                                <CardDescription>
                                    Be specific: movement type, duration, equipment
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Upper body push, 45 minutes, dumbbells and barbell..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={4}
                                    className="resize-none text-base"
                                />

                                {/* Example Chips - More Visible */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-text-primary">
                                        Try these:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {examplePrompts.map((example, index) => (
                                            <Button
                                                key={index}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPrompt(example)}
                                                className="text-xs cursor-pointer"
                                            >
                                                {example}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Generate Button */}
                                <Button
                                    className="w-full"
                                    size="lg"
                                    disabled={!prompt.trim()}
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Generate Workout
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Preview: What a generated workout looks like */}
                        <Card className="border-primary bg-primary/5">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                                        <Sparkles className="h-6 w-6 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <CardTitle>Workout Generated!</CardTitle>
                                        <CardDescription>
                                            Saved to your library
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Workout Preview */}
                                <div className="bg-background rounded-lg p-4 space-y-2">
                                    <h3 className="font-semibold text-lg text-text-primary">
                                        {mockWorkout.title}
                                    </h3>
                                    <p className="text-sm text-text-secondary">
                                        {mockWorkout.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-text-secondary pt-2">
                                        <div className="flex items-center gap-1">
                                            <Dumbbell className="h-4 w-4" />
                                            <span>{mockWorkout.exercises} exercises</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            <span>{mockWorkout.duration} min</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Target className="h-4 w-4" />
                                            <span className="capitalize">{mockWorkout.difficulty}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <Button className="flex-1" size="lg">
                                        View Workout
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                    >
                                        Generate Another
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Comparison Section */}
                        <Card className="border-primary/20 bg-surface/50">
                            <CardHeader>
                                <CardTitle className="text-lg">What Changed?</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-medium text-red-500 mb-2">❌ Before (Wordy)</h4>
                                        <ul className="space-y-1 text-text-secondary">
                                            <li>• "Describe your perfect workout and let AI create..."</li>
                                            <li>• "Tell us what you want to work on, how much time..."</li>
                                            <li>• "The AI will use your Training Profile to personalize..."</li>
                                            <li>• Multiple paragraphs explaining steps</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-green-500 mb-2">✅ After (Concise)</h4>
                                        <ul className="space-y-1 text-text-secondary">
                                            <li>• "Describe your workout. AI builds the plan."</li>
                                            <li>• "Be specific: movement type, duration, equipment"</li>
                                            <li>• "Uses your Training Profile for personalized weights."</li>
                                            <li>• Quick bullet points and examples</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-border">
                                    <p className="text-text-primary font-medium mb-2">Key Improvements:</p>
                                    <ul className="space-y-1 text-text-secondary">
                                        <li>✨ 60% less text overall</li>
                                        <li>🎯 Action-focused language</li>
                                        <li>⚡ Faster to scan and understand</li>
                                        <li>💬 More conversational, like ChatGPT</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Call to Action */}
                        <div className="text-center space-y-3">
                            <p className="text-sm text-text-secondary">
                                Ready to try the real thing?
                            </p>
                            <div className="flex gap-3 justify-center">
                                <Link href="/add/generate">
                                    <Button size="lg" variant="outline">
                                        Go to AI Generator
                                    </Button>
                                </Link>
                                <Link href="/add">
                                    <Button size="lg">
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Create Workout
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <MobileNav />
        </>
    )
}
