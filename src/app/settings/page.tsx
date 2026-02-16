"use client"

import { useState } from "react"
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
} from "lucide-react"
import { mockUser, mockWorkspace } from "@/lib/mock-data"

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

export default function SettingsPage() {
    const [name, setName] = useState(mockUser.name)
    const [email, setEmail] = useState(mockUser.email)
    const [workspaceName, setWorkspaceName] = useState(mockWorkspace.name)

    const [notifications, setNotifications] = useState({
        auditComplete: true,
        weeklyReport: true,
        scoreDrops: true,
        newIssues: false,
        teamUpdates: true,
    })

    const toggleNotification = (key: keyof typeof notifications) => {
        setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
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

                    <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white mt-2">
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
                            {mockWorkspace.plan}
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
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Members</p>
                            <p className="text-xl font-bold text-foreground mt-1">{mockWorkspace.memberCount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Workspace ID</p>
                            <p className="text-sm font-mono text-muted-foreground mt-2">{mockWorkspace.slug}</p>
                        </div>
                    </div>

                    <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                        <Save className="h-4 w-4" />
                        Update Workspace
                    </Button>
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
                    <Toggle
                        enabled={notifications.auditComplete}
                        onToggle={() => toggleNotification("auditComplete")}
                        label="Audit completion emails"
                    />
                    <Toggle
                        enabled={notifications.weeklyReport}
                        onToggle={() => toggleNotification("weeklyReport")}
                        label="Weekly performance reports"
                    />
                    <Toggle
                        enabled={notifications.scoreDrops}
                        onToggle={() => toggleNotification("scoreDrops")}
                        label="Alert on significant score drops"
                    />
                    <Toggle
                        enabled={notifications.newIssues}
                        onToggle={() => toggleNotification("newIssues")}
                        label="New issues detected"
                    />
                    <Toggle
                        enabled={notifications.teamUpdates}
                        onToggle={() => toggleNotification("teamUpdates")}
                        label="Team member activity"
                    />
                </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="shadow-sm border-zinc-200">
                <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="p-2 bg-orange-50 rounded-lg">
                        <Shield className="h-5 w-5 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <Lock className="h-4 w-4" />
                        Change Password
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Two-factor authentication and API key management coming soon.
                    </p>
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
        </div>
    )
}
