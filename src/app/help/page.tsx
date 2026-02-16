"use client"

import { useState } from "react"
import Link from "next/link"
import {
    ArrowLeft,
    HelpCircle,
    Send,
    CheckCircle,
    Mail,
    MessageSquare,
    AlertCircle,
    LifeBuoy,
    Loader2,
    BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const CATEGORIES = [
    { value: "general", label: "General Question", icon: <MessageSquare className="h-4 w-4" /> },
    { value: "bug", label: "Bug Report", icon: <AlertCircle className="h-4 w-4" /> },
    { value: "feature", label: "Feature Request", icon: <LifeBuoy className="h-4 w-4" /> },
    { value: "billing", label: "Billing & Plans", icon: <Mail className="h-4 w-4" /> },
]

export default function HelpPage() {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [subject, setSubject] = useState("")
    const [message, setMessage] = useState("")
    const [category, setCategory] = useState("general")
    const [sending, setSending] = useState(false)
    const [ticketId, setTicketId] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !subject || !message) return
        setSending(true)
        setError("")

        try {
            const res = await fetch("/api/help", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, subject, message, category }),
            })
            const data = await res.json()
            if (data.success) {
                setTicketId(data.ticketId)
            } else {
                setError(data.error || "Failed to submit")
            }
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setSending(false)
        }
    }

    if (ticketId) {
        return (
            <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
                <div className="text-center py-16">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center mb-6">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Ticket Submitted!</h2>
                    <p className="text-muted-foreground max-w-md mx-auto mb-4">
                        Your support ticket has been received. We&apos;ll get back to you as soon as possible.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm font-mono">
                        Ticket ID: <span className="font-bold text-orange-500">{ticketId}</span>
                    </div>
                    <div className="mt-8 flex gap-3 justify-center">
                        <Button variant="outline" onClick={() => { setTicketId(""); setSubject(""); setMessage("") }}>
                            Submit Another
                        </Button>
                        <Link href="/dashboard">
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white">Back to Dashboard</Button>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <HelpCircle className="h-7 w-7 text-orange-500" />
                        Help Desk
                    </h2>
                    <p className="text-muted-foreground">Get help from our team or report an issue</p>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid sm:grid-cols-2 gap-3">
                <Link href="/knowledge">
                    <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-violet-500" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Knowledge Base</p>
                                <p className="text-xs text-muted-foreground">Search SEO guides and glossary</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <a href="mailto:support@auditorpro.app">
                    <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                                <Mail className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Email Us</p>
                                <p className="text-xs text-muted-foreground">support@auditorpro.app</p>
                            </div>
                        </CardContent>
                    </Card>
                </a>
            </div>

            {/* Ticket Form */}
            <Card className="shadow-sm">
                <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">Submit a Support Ticket</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Category */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Category</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setCategory(cat.value)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${category === cat.value
                                                ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600"
                                                : "border-border text-muted-foreground hover:border-muted-foreground/30"
                                            }`}
                                    >
                                        {cat.icon} {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Name</label>
                                <input
                                    value={name} onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Email *</label>
                                <input
                                    type="email" required
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Subject *</label>
                            <input
                                required
                                value={subject} onChange={(e) => setSubject(e.target.value)}
                                placeholder="Brief description of your issue"
                                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Message *</label>
                            <textarea
                                required
                                rows={5}
                                value={message} onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe your issue in detail..."
                                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-orange-500 outline-none resize-y"
                            />
                        </div>

                        {error && (
                            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={sending || !email || !subject || !message}
                            className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {sending ? "Sending..." : "Submit Ticket"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
