"use client"

import { useState, useEffect } from "react"
import { X, Zap, BarChart3, Shield, Globe, Sparkles, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "auditor:onboarded"

const STEPS = [
    {
        icon: <Zap className="w-8 h-8 text-orange-500" />,
        title: "Run Your First Audit",
        description: "Enter any URL on the Quick Audit page to get a comprehensive SEO analysis across 75+ checks — including AEO, GEO, and performance.",
        tip: "Start with your own homepage to see where you stand.",
    },
    {
        icon: <BarChart3 className="w-8 h-8 text-blue-500" />,
        title: "Track Progress Over Time",
        description: "Every audit is automatically saved. Use the Dashboard and Audit History to monitor trends and compare scores across multiple runs.",
        tip: "Re-audit monthly to track improvement.",
    },
    {
        icon: <Shield className="w-8 h-8 text-green-500" />,
        title: "Competitor Gap Analysis",
        description: "Compare your SEO performance head-to-head with any competitor. Identify exactly where you lead and where you trail.",
        tip: "Focus on categories where competitors score higher.",
    },
    {
        icon: <Globe className="w-8 h-8 text-purple-500" />,
        title: "Schema Markup Generator",
        description: "Generate structured data (JSON-LD) for 7+ schema types — Organization, LocalBusiness, Article, Product, FAQ, HowTo, and Breadcrumb.",
        tip: "Add schema to every key page for rich search results.",
    },
    {
        icon: <Sparkles className="w-8 h-8 text-amber-500" />,
        title: "AI-Powered Fix Suggestions",
        description: "Get intelligent, actionable fix suggestions for every failed audit check. Powered by AI with built-in smart templates as fallback.",
        tip: "Configure an OpenAI or Gemini key in Settings for best results.",
    },
]

export function WelcomeModal() {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState(0)

    useEffect(() => {
        const seen = localStorage.getItem(STORAGE_KEY)
        if (!seen) setOpen(true)
    }, [])

    const dismiss = () => {
        localStorage.setItem(STORAGE_KEY, "true")
        setOpen(false)
    }

    const next = () => {
        if (step < STEPS.length - 1) setStep(step + 1)
        else dismiss()
    }

    const prev = () => {
        if (step > 0) setStep(step - 1)
    }

    if (!open) return null

    const current = STEPS[step]
    const isLast = step === STEPS.length - 1

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Welcome to AuditorPro">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                {/* Close */}
                <button onClick={dismiss} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10" aria-label="Close">
                    <X className="w-5 h-5" />
                </button>

                {/* Header gradient */}
                <div className="h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-600" />

                {/* Content */}
                <div className="p-8">
                    {step === 0 && (
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-foreground mb-1">Welcome to AuditorPro 🎉</h2>
                            <p className="text-muted-foreground text-sm">Here&apos;s a quick tour of what you can do.</p>
                        </div>
                    )}

                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                            {current.icon}
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">{current.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{current.description}</p>
                        <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-800 rounded-lg px-4 py-2.5 text-left">
                            <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                            <span className="text-xs text-orange-800 dark:text-orange-200">{current.tip}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 pb-6 flex items-center justify-between">
                    {/* Progress dots */}
                    <div className="flex gap-1.5">
                        {STEPS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setStep(i)}
                                className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-orange-500 w-6" : i < step ? "bg-orange-300" : "bg-muted"
                                    }`}
                                aria-label={`Go to step ${i + 1}`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-2">
                        {step > 0 && (
                            <Button variant="ghost" size="sm" onClick={prev}>Back</Button>
                        )}
                        <Button size="sm" onClick={next} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
                            {isLast ? "Get Started" : "Next"}
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
