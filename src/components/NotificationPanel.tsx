"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
    Bell,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Plus,
    Trash2,
    Info,
    Globe,
    X,
    Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    getNotifications,
    markAllNotificationsRead,
    clearNotifications,
    getUnreadNotificationCount,
    type AppNotification,
    type NotificationType,
} from "@/lib/local-storage"

const ICON_MAP: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
    audit_complete: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    audit_error: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    site_added: { icon: Plus, color: "text-blue-600", bg: "bg-blue-50" },
    site_removed: { icon: Trash2, color: "text-orange-600", bg: "bg-orange-50" },
    score_drop: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    info: { icon: Info, color: "text-violet-600", bg: "bg-violet-50" },
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
}

export function NotificationBell() {
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [unread, setUnread] = useState(0)
    const panelRef = useRef<HTMLDivElement>(null)

    const refresh = useCallback(() => {
        setNotifications(getNotifications(50))
        setUnread(getUnreadNotificationCount())
    }, [])

    useEffect(() => {
        refresh()
        const handler = () => refresh()
        window.addEventListener("auditor:notifications", handler)
        window.addEventListener("auditor:update", handler)
        // Poll every 30s for changes
        const interval = setInterval(refresh, 30000)
        return () => {
            window.removeEventListener("auditor:notifications", handler)
            window.removeEventListener("auditor:update", handler)
            clearInterval(interval)
        }
    }, [refresh])

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handleClick = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [open])

    const handleMarkRead = () => {
        markAllNotificationsRead()
        refresh()
    }

    const handleClear = () => {
        clearNotifications()
        refresh()
    }

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => {
                    setOpen(!open)
                    if (!open && unread > 0) {
                        // Mark read when opening
                        setTimeout(() => {
                            markAllNotificationsRead()
                            refresh()
                        }, 2000)
                    }
                }}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white min-w-[18px] h-[18px] border-2 border-background">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                        <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                        <div className="flex items-center gap-1">
                            {unread > 0 && (
                                <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={handleMarkRead}>
                                    <Check className="h-3 w-3" /> Read all
                                </Button>
                            )}
                            {notifications.length > 0 && (
                                <Button size="sm" variant="ghost" className="text-xs h-7 text-red-500 hover:text-red-600" onClick={handleClear}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setOpen(false)}>
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-10 text-center">
                                <Globe className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No notifications yet</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Activity from audits and site changes will appear here</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const config = ICON_MAP[notif.type] || ICON_MAP.info
                                const Icon = config.icon
                                return (
                                    <div
                                        key={notif.id}
                                        className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${!notif.read ? "bg-orange-50/30 dark:bg-orange-950/10" : ""
                                            }`}
                                    >
                                        <div className={`p-1.5 rounded-lg ${config.bg} shrink-0 mt-0.5`}>
                                            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium text-foreground leading-tight">{notif.title}</p>
                                                {!notif.read && (
                                                    <span className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.createdAt)}</p>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
