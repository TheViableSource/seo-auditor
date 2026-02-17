"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    ArrowLeft,
    Globe,
    BarChart3,
    MapPin,
    Search,
    CheckCircle,
    XCircle,
    Loader2,
    ExternalLink,
    Unplug,
    Plug,
    Megaphone,
    RefreshCw,
    Shield,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface GoogleStatus {
    configured: boolean
    connected: boolean
    email?: string
    error?: string
    sites?: { siteUrl: string; permissionLevel: string }[]
    services?: Record<string, boolean>
}

interface IntegrationCard {
    key: string
    label: string
    description: string
    icon: React.ReactNode
    color: string
    bgColor: string
    serviceKey?: string
    available: boolean
    comingSoon?: boolean
}

export default function IntegrationsPage() {
    const [mounted, setMounted] = useState(false)
    const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null)
    const [loading, setLoading] = useState(true)

    // GA properties
    const [gaProperties, setGaProperties] = useState<
        { id: string; name: string; account: string }[]
    >([])
    const [gaLoading, setGaLoading] = useState(false)

    // GMB locations
    const [gmbLocations, setGmbLocations] = useState<
        { id: string; name: string; address: string; account: string }[]
    >([])
    const [gmbLoading, setGmbLoading] = useState(false)

    const fetchGoogleStatus = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/gsc/status")
            const data = await res.json()
            setGoogleStatus(data)
        } catch {
            setGoogleStatus({ configured: false, connected: false })
        } finally {
            setLoading(false)
        }
    }

    const fetchGaProperties = async () => {
        setGaLoading(true)
        try {
            const res = await fetch("/api/ga/overview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            })
            const data = await res.json()
            if (data.properties) setGaProperties(data.properties)
        } catch { /* silent */ }
        finally { setGaLoading(false) }
    }

    const fetchGmbLocations = async () => {
        setGmbLoading(true)
        try {
            const res = await fetch("/api/gmb/insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            })
            const data = await res.json()
            if (data.locations) setGmbLocations(data.locations)
        } catch { /* silent */ }
        finally { setGmbLoading(false) }
    }

    const handleDisconnect = async () => {
        await fetch("/api/gsc/status", { method: "DELETE" })
        setGoogleStatus({ configured: true, connected: false })
        setGaProperties([])
        setGmbLocations([])
    }

    useEffect(() => {
        setMounted(true)
        fetchGoogleStatus()
    }, [])

    useEffect(() => {
        if (googleStatus?.connected) {
            fetchGaProperties()
            fetchGmbLocations()
        }
    }, [googleStatus?.connected])

    if (!mounted) return null

    const integrations: IntegrationCard[] = [
        {
            key: "searchConsole",
            label: "Google Search Console",
            description: "Keywords, impressions, CTR, and position data directly from Google.",
            icon: <Search className="h-5 w-5" />,
            color: "text-blue-600",
            bgColor: "bg-blue-50 dark:bg-blue-950/30",
            serviceKey: "searchConsole",
            available: true,
        },
        {
            key: "analytics",
            label: "Google Analytics (GA4)",
            description: "Sessions, bounce rate, top pages, traffic sources, and user behavior.",
            icon: <BarChart3 className="h-5 w-5" />,
            color: "text-yellow-600",
            bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
            serviceKey: "analytics",
            available: true,
        },
        {
            key: "myBusiness",
            label: "Google Business Profile",
            description: "Location data, reviews, business hours, and local search visibility.",
            icon: <MapPin className="h-5 w-5" />,
            color: "text-green-600",
            bgColor: "bg-green-50 dark:bg-green-950/30",
            serviceKey: "myBusiness",
            available: true,
        },
        {
            key: "facebook",
            label: "Facebook / Meta",
            description: "Social signals, page insights, and content performance.",
            icon: <Globe className="h-5 w-5" />,
            color: "text-indigo-600",
            bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
            available: false,
            comingSoon: true,
        },
        {
            key: "bing",
            label: "Bing Webmaster Tools",
            description: "Bing search data, keyword rankings, and crawl diagnostics.",
            icon: <Megaphone className="h-5 w-5" />,
            color: "text-cyan-600",
            bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
            available: false,
            comingSoon: true,
        },
    ]

    const connected = googleStatus?.connected

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="gap-1">
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Plug className="h-6 w-6 text-orange-500" />
                            Integrations
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Connect your data sources to unlock actionable insights
                        </p>
                    </div>
                </div>
                {connected && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                            fetchGoogleStatus()
                            fetchGaProperties()
                            fetchGmbLocations()
                        }}
                    >
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </Button>
                )}
            </div>

            {/* Google Account Status */}
            <Card className="shadow-sm border-zinc-200">
                <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                    </div>
                    <CardTitle className="text-lg">Google Account</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2 py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Checking connection…</span>
                        </div>
                    ) : connected ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                    Connected as {googleStatus?.email}
                                </span>
                            </div>
                            <button
                                onClick={handleDisconnect}
                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                            >
                                <Unplug className="h-3 w-3" /> Disconnect
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Connect your Google account to access Search Console, Analytics, and Business Profile data.
                            </p>
                            {!googleStatus?.configured && (
                                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                    <Shield className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        Set <code className="bg-amber-100 px-1 rounded text-[10px]">GOOGLE_CLIENT_ID</code> and <code className="bg-amber-100 px-1 rounded text-[10px]">GOOGLE_CLIENT_SECRET</code> in your <code className="bg-amber-100 px-1 rounded text-[10px]">.env.local</code> file.
                                    </p>
                                </div>
                            )}
                            <Button
                                className="gap-2"
                                variant="outline"
                                disabled={!googleStatus?.configured}
                                onClick={() => (window.location.href = "/api/auth/google")}
                            >
                                <ExternalLink className="h-4 w-4" />
                                Connect Google Account
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Integration Cards */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Data Sources</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {integrations.map((integration) => {
                        const isActive =
                            connected &&
                            integration.available &&
                            integration.serviceKey &&
                            googleStatus?.services?.[integration.serviceKey]
                        const isAvailable = connected && integration.available

                        return (
                            <Card
                                key={integration.key}
                                className={`shadow-sm transition-all ${isActive
                                        ? "border-green-300 dark:border-green-800"
                                        : integration.comingSoon
                                            ? "border-border opacity-60"
                                            : "border-border"
                                    }`}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2.5 rounded-lg ${integration.bgColor}`}>
                                            <div className={integration.color}>{integration.icon}</div>
                                        </div>
                                        {integration.comingSoon ? (
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                                Coming Soon
                                            </span>
                                        ) : isActive ? (
                                            <div className="flex items-center gap-1">
                                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                                <span className="text-[10px] font-bold uppercase text-green-600">
                                                    Active
                                                </span>
                                            </div>
                                        ) : isAvailable ? (
                                            <div className="flex items-center gap-1">
                                                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                                    Not Found
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Connect Google
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-sm mb-1">{integration.label}</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {integration.description}
                                    </p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* Connected Properties & Locations */}
            {connected && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Search Console Properties */}
                    {googleStatus?.sites && googleStatus.sites.length > 0 && (
                        <Card className="shadow-sm border-zinc-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Search className="h-4 w-4 text-blue-500" />
                                    Search Console Properties
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1.5">
                                {googleStatus.sites.map((site) => (
                                    <div
                                        key={site.siteUrl}
                                        className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30"
                                    >
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        <span className="truncate flex-1">{site.siteUrl}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {site.permissionLevel}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* GA4 Properties */}
                    <Card className="shadow-sm border-zinc-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-yellow-500" />
                                Analytics Properties
                                {gaLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {gaProperties.length > 0 ? (
                                <div className="space-y-1.5">
                                    {gaProperties.map((prop) => (
                                        <div
                                            key={prop.id}
                                            className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{prop.name}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {prop.account} · ID: {prop.id}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    {gaLoading
                                        ? "Loading properties…"
                                        : "No GA4 properties found. Make sure your Google account has access to Analytics."}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* GMB Locations */}
                    <Card className="shadow-sm border-zinc-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-green-500" />
                                Business Locations
                                {gmbLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {gmbLocations.length > 0 ? (
                                <div className="space-y-1.5">
                                    {gmbLocations.map((loc) => (
                                        <div
                                            key={loc.id}
                                            className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{loc.name}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    {loc.address}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    {gmbLoading
                                        ? "Loading locations…"
                                        : "No Business Profile locations found. Make sure your Google account manages a Business Profile."}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* CTA to Action Items */}
            {connected && (
                <Card className="shadow-sm border-orange-200 dark:border-orange-800/30 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-base mb-1">Ready to take action?</h3>
                            <p className="text-sm text-muted-foreground">
                                We analyze your connected data to generate prioritized SEO tasks.
                            </p>
                        </div>
                        <Link href="/tasks">
                            <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                                View Action Items →
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
