"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    User,
    Building2,
    Bell,
    Shield,
    Save,
    Crown,
    Mail,
    Lock,
    Download,
    Upload,
    CheckCircle,
    Loader2,
    ExternalLink,
    Unplug,
    Search,
    BarChart3,
    Store,
    Megaphone,
    Palette,
    ImagePlus,
    Sparkles,
    Zap,
} from "lucide-react"
import {
    getSettings,
    updateSettings,
    exportAllData,
    importData,
    getSites,
    getAudits,
    TIER_LIMITS,
} from "@/lib/local-storage"
import type { UserTier } from "@/lib/local-storage"

function Toggle({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label: string }) {
    return (
        <button
            onClick={onToggle}
            className="flex items-center gap-3 w-full group"
            role="switch"
            aria-checked={enabled}
            aria-label={label}
        >
            <div className={`relative w-10 h-6 rounded-full transition-colors ${enabled ? "bg-orange-500" : "bg-muted"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-1"}`} />
            </div>
            <span className="text-sm text-foreground">{label}</span>
        </button>
    )
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000)
        return () => clearTimeout(timer)
    }, [onClose])

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-4">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">{message}</span>
        </div>
    )
}

export default function SettingsPage() {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [workspaceName, setWorkspaceName] = useState("")
    const [notifications, setNotifications] = useState({
        auditComplete: true,
        weeklyReport: true,
        scoreDrops: true,
        newIssues: false,
        teamUpdates: true,
    })
    const [toast, setToast] = useState("")
    const [mounted, setMounted] = useState(false)
    const [dataStats, setDataStats] = useState({ sites: 0, audits: 0 })

    // Tier & branding
    const [tier, setTier] = useState<UserTier>("pro")
    const [brandLogo, setBrandLogo] = useState<string | undefined>(undefined)
    const [brandName, setBrandName] = useState("")
    const [brandColor, setBrandColor] = useState("#f97316")

    // Google Integrations
    const [googleStatus, setGoogleStatus] = useState<{
        configured: boolean
        connected: boolean
        email?: string
        sites?: { siteUrl: string; permissionLevel: string }[]
        services?: Record<string, boolean>
        error?: string
    } | null>(null)
    const [googleLoading, setGoogleLoading] = useState(false)

    const fetchGoogleStatus = async () => {
        setGoogleLoading(true)
        try {
            const res = await fetch("/api/gsc/status")
            const data = await res.json()
            setGoogleStatus(data)
        } catch {
            setGoogleStatus({ configured: false, connected: false })
        } finally {
            setGoogleLoading(false)
        }
    }

    const handleDisconnectGoogle = async () => {
        await fetch("/api/gsc/status", { method: "DELETE" })
        setGoogleStatus({ configured: true, connected: false })
        setToast("Google disconnected.")
    }

    useEffect(() => {
        const s = getSettings()
        setName(s.userName)
        setEmail(s.userEmail)
        setWorkspaceName(s.workspaceName)
        setNotifications(s.notifications)
        setTier(s.tier)
        setBrandLogo(s.brandLogo)
        setBrandName(s.brandName || "")
        setBrandColor(s.brandColor || "#f97316")
        setDataStats({ sites: getSites().length, audits: getAudits().length })
        setMounted(true)

        fetchGoogleStatus()

        // Handle OAuth redirect params
        const params = new URLSearchParams(window.location.search)
        if (params.get("google_connected") === "true") {
            setToast("Google Search Console connected successfully!")
            window.history.replaceState({}, "", "/settings")
        }
        if (params.get("google_error")) {
            setToast(`Google error: ${params.get("google_error")}`)
            window.history.replaceState({}, "", "/settings")
        }
    }, [])

    if (!mounted) return null

    const saveProfile = () => {
        updateSettings({ userName: name, userEmail: email })
        setToast("Profile saved!")
    }

    const saveWorkspace = () => {
        updateSettings({ workspaceName })
        setToast("Workspace updated!")
    }

    const saveNotifications = () => {
        updateSettings({ notifications })
        setToast("Notification preferences saved!")
    }

    const toggleNotification = (key: keyof typeof notifications) => {
        setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const handleExport = () => {
        const data = exportAllData()
        const blob = new Blob([data], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `auditor-backup-${new Date().toISOString().split("T")[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        setToast("Data exported!")
    }

    const handleImport = () => {
        const input = document.createElement("input")
        input.type = "file"
        input.accept = ".json"
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = (ev) => {
                try {
                    const result = importData(ev.target?.result as string)
                    setDataStats({ sites: getSites().length, audits: getAudits().length })
                    window.dispatchEvent(new Event("auditor:update"))
                    setToast(`Imported ${result.sites} sites and ${result.audits} audits!`)
                } catch {
                    setToast("Import failed — invalid file format.")
                }
            }
            reader.readAsText(file)
        }
        input.click()
    }

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your account and workspace preferences.</p>
            </div>

            {/* Profile Section */}
            <Card className="shadow-sm border-zinc-200">
                <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-lg text-foreground">{name}</p>
                            <p className="text-sm text-muted-foreground">{email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="profile-name" className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                            <input
                                id="profile-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                            />
                        </div>
                        <div>
                            <label htmlFor="profile-email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    id="profile-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                                />
                            </div>
                        </div>
                    </div>

                    <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white mt-2" onClick={saveProfile}>
                        <Save className="h-4 w-4" />
                        Save Changes
                    </Button>
                </CardContent>
            </Card>

            {/* Workspace Section */}
            <Card className="shadow-sm border-zinc-200">
                <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <Building2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">Workspace</CardTitle>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            <Crown className="h-3 w-3" />
                            Pro
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label htmlFor="workspace-name" className="block text-sm font-medium text-foreground mb-1.5">Workspace Name</label>
                        <input
                            id="workspace-name"
                            type="text"
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Tracked Sites</p>
                            <p className="text-xl font-bold text-foreground mt-1">{dataStats.sites}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Audits</p>
                            <p className="text-xl font-bold text-foreground mt-1">{dataStats.audits}</p>
                        </div>
                    </div>

                    <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white" onClick={saveWorkspace}>
                        <Save className="h-4 w-4" />
                        Update Workspace
                    </Button>
                </CardContent>
            </Card>

            {/* Subscription Tier */}
            <Card className="shadow-sm border-zinc-200">
                <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="p-2 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg">
                        <Crown className="h-5 w-5 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">Subscription Tier</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(Object.entries(TIER_LIMITS) as [UserTier, typeof TIER_LIMITS[UserTier]][]).map(([key, config]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    setTier(key)
                                    updateSettings({ tier: key })
                                    setToast(`Switched to ${config.label} tier`)
                                }}
                                className={`relative p-4 rounded-xl border-2 transition-all text-left ${tier === key
                                    ? "border-orange-500 bg-orange-50/50 shadow-sm"
                                    : "border-border hover:border-orange-300 hover:bg-muted/30"
                                    }`}
                            >
                                {tier === key && (
                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500" />
                                )}
                                <p className="font-bold text-sm">{config.label}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {config.sites === Infinity ? "Unlimited" : config.sites} site{config.sites !== 1 ? "s" : ""}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {config.keywords === Infinity ? "Unlimited" : config.keywords} keywords
                                </p>
                                {config.pdfBranding && (
                                    <span className="inline-block mt-2 text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                                        Custom Branding
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Report Branding (Agency only) */}
            {tier === "agency" && (
                <Card className="shadow-sm border-orange-200 bg-orange-50/20">
                    <CardHeader className="flex flex-row items-center gap-3 pb-4">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Palette className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Report Branding</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">Customize the look of your PDF reports</p>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Logo upload */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Company Logo</label>
                            <div className="flex items-center gap-4">
                                {brandLogo ? (
                                    <div className="w-16 h-16 rounded-lg border border-border bg-white p-2 flex items-center justify-center">
                                        <img src={brandLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                )}
                                <div>
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors">
                                        <ImagePlus className="h-4 w-4" />
                                        Upload Logo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    const reader = new FileReader()
                                                    reader.onloadend = () => {
                                                        const result = reader.result as string
                                                        setBrandLogo(result)
                                                        updateSettings({ brandLogo: result })
                                                        setToast("Logo updated!")
                                                    }
                                                    reader.readAsDataURL(file)
                                                }
                                            }}
                                        />
                                    </label>
                                    {brandLogo && (
                                        <button
                                            onClick={() => {
                                                setBrandLogo(undefined)
                                                updateSettings({ brandLogo: undefined })
                                                setToast("Logo removed.")
                                            }}
                                            className="ml-2 text-xs text-red-500 hover:text-red-600"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Business name */}
                        <div>
                            <label htmlFor="brand-name" className="block text-sm font-medium text-foreground mb-1.5">Business Name</label>
                            <input
                                id="brand-name"
                                type="text"
                                placeholder="e.g. Acme Digital Agency"
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                                onBlur={() => updateSettings({ brandName: brandName || undefined })}
                                className="w-full max-w-md px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                            />
                        </div>

                        {/* Brand color */}
                        <div>
                            <label htmlFor="brand-color" className="block text-sm font-medium text-foreground mb-1.5">Brand Color</label>
                            <div className="flex items-center gap-3">
                                <input
                                    id="brand-color"
                                    type="color"
                                    value={brandColor}
                                    onChange={(e) => {
                                        setBrandColor(e.target.value)
                                        updateSettings({ brandColor: e.target.value })
                                    }}
                                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                                />
                                <span className="text-sm text-muted-foreground font-mono">{brandColor}</span>
                                <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}44)` }} />
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="p-4 rounded-xl border border-border bg-white">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Report Header Preview</p>
                            <div className="flex items-center gap-3">
                                {brandLogo ? (
                                    <img src={brandLogo} alt="Logo" className="h-8 w-auto object-contain" />
                                ) : (
                                    <div className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm" style={{ background: brandColor }}>
                                        {brandName.charAt(0) || "A"}
                                    </div>
                                )}
                                <span className="font-semibold text-sm" style={{ color: brandColor }}>
                                    {brandName || "Your Business Name"}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Google Integrations */}
            <Card className="shadow-sm border-zinc-200">
                <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="p-2 bg-red-50 rounded-lg">
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                    </div>
                    <CardTitle className="text-lg">Google Integrations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {googleLoading ? (
                        <div className="flex items-center gap-2 py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Checking connection…</span>
                        </div>
                    ) : googleStatus?.connected ? (
                        <>
                            {/* Connected state */}
                            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                        Connected as {googleStatus.email}
                                    </span>
                                </div>
                                <button
                                    onClick={handleDisconnectGoogle}
                                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                                >
                                    <Unplug className="h-3 w-3" /> Disconnect
                                </button>
                            </div>

                            {/* Service status */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { key: "searchConsole", label: "Search Console", icon: Search, color: "text-blue-600 bg-blue-50" },
                                    { key: "analytics", label: "Analytics", icon: BarChart3, color: "text-yellow-600 bg-yellow-50" },
                                    { key: "myBusiness", label: "My Business", icon: Store, color: "text-green-600 bg-green-50" },
                                    { key: "ads", label: "Ads", icon: Megaphone, color: "text-red-600 bg-red-50" },
                                ].map(({ key, label, icon: Icon, color }) => {
                                    const active = googleStatus.services?.[key]
                                    return (
                                        <div
                                            key={key}
                                            className={`flex items-center gap-2 p-2.5 rounded-lg border ${active ? "border-green-200 bg-green-50/50" : "border-border bg-muted/30"
                                                }`}
                                        >
                                            <div className={`p-1.5 rounded-md ${color}`}>
                                                <Icon className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate">{label}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase ${active ? "text-green-600" : "text-muted-foreground"
                                                }`}>
                                                {active ? "Active" : "Soon"}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Verified sites */}
                            {googleStatus.sites && googleStatus.sites.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Verified Properties</p>
                                    <div className="space-y-1">
                                        {googleStatus.sites.map((site) => (
                                            <div key={site.siteUrl} className="flex items-center gap-2 text-sm p-1.5">
                                                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                                <span className="truncate">{site.siteUrl}</span>
                                                <span className="text-[10px] text-muted-foreground ml-auto">{site.permissionLevel}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Not connected */}
                            <p className="text-sm text-muted-foreground">
                                Connect your Google account to access real Search Console data, Analytics, Google My Business, and Ads campaigns.
                            </p>

                            {!googleStatus?.configured && (
                                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                    <Shield className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        Google OAuth credentials are not configured. Set <code className="bg-amber-100 px-1 rounded text-[10px]">GOOGLE_CLIENT_ID</code> and <code className="bg-amber-100 px-1 rounded text-[10px]">GOOGLE_CLIENT_SECRET</code> in your <code className="bg-amber-100 px-1 rounded text-[10px]">.env.local</code> file.
                                    </p>
                                </div>
                            )}

                            <Button
                                className="gap-2"
                                variant="outline"
                                disabled={!googleStatus?.configured}
                                onClick={() => window.location.href = "/api/auth/google"}
                            >
                                <ExternalLink className="h-4 w-4" />
                                Connect Google Account
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Notifications Section */}
            <Card className="shadow-sm border-zinc-200">
                <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="p-2 bg-green-50 rounded-lg">
                        <Bell className="h-5 w-5 text-green-600" />
                    </div>
                    <CardTitle className="text-lg">Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Toggle enabled={notifications.auditComplete} onToggle={() => toggleNotification("auditComplete")} label="Audit completion emails" />
                    <Toggle enabled={notifications.weeklyReport} onToggle={() => toggleNotification("weeklyReport")} label="Weekly performance reports" />
                    <Toggle enabled={notifications.scoreDrops} onToggle={() => toggleNotification("scoreDrops")} label="Alert on significant score drops" />
                    <Toggle enabled={notifications.newIssues} onToggle={() => toggleNotification("newIssues")} label="New issues detected" />
                    <Toggle enabled={notifications.teamUpdates} onToggle={() => toggleNotification("teamUpdates")} label="Team member activity" />

                    <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white mt-2" onClick={saveNotifications}>
                        <Save className="h-4 w-4" />
                        Save Preferences
                    </Button>
                </CardContent>
            </Card>

            {/* Data Management */}
            <Card className="shadow-sm border-zinc-200">
                <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="p-2 bg-orange-50 rounded-lg">
                        <Shield className="h-5 w-5 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">Data Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Export your sites and audit history as a JSON backup, or import from a previous backup.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="outline" className="gap-2" onClick={handleExport}>
                            <Download className="h-4 w-4" />
                            Export All Data
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={handleImport}>
                            <Upload className="h-4 w-4" />
                            Import Data
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="shadow-sm border-zinc-200">
                <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="p-2 bg-slate-50 rounded-lg">
                        <Lock className="h-5 w-5 text-slate-600" />
                    </div>
                    <CardTitle className="text-lg">Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <Lock className="h-4 w-4" />
                        Change Password
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Password management and two-factor authentication will be available when the database is connected.
                    </p>
                </CardContent>
            </Card>

            {/* AI Configuration */}
            <Card className="shadow-sm border-zinc-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-violet-500" />
                        AI Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {(() => {
                        const { getAiUsage, getAiRemaining, AI_TIER_LIMITS } = require("@/lib/ai-usage")
                        const usage = getAiUsage()
                        const remaining = getAiRemaining(tier)
                        const limit = AI_TIER_LIMITS[tier]
                        const pct = limit > 0 ? Math.round((usage.count / limit) * 100) : 0
                        return (
                            <>
                                <div>
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">Monthly AI Usage</span>
                                        <span className="font-medium">{usage.count} / {limit} requests</span>
                                    </div>
                                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-orange-500" : "bg-violet-500"}`}
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                        {remaining > 0 ? `${remaining} AI suggestions remaining this month` : "Quota reached — resets next month"}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground space-y-1">
                                    <p className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> <strong>Plan:</strong> {tier.charAt(0).toUpperCase() + tier.slice(1)} — {limit} AI requests/month</p>
                                    <p>Resets on the 1st of each month. AI suggestions use the configured API (OpenAI or Gemini).</p>
                                    <p>API keys are configured as server environment variables (OPENAI_API_KEY or GEMINI_API_KEY).</p>
                                </div>
                            </>
                        )
                    })()}
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="shadow-sm border-red-200 bg-red-50/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-red-700">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-red-600/80">
                        Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700">
                        Delete Account
                    </Button>
                </CardContent>
            </Card>

            {/* Toast */}
            {toast && <Toast message={toast} onClose={() => setToast("")} />}
        </div>
    )
}
