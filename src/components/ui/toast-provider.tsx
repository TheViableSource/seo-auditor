"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================
// TYPES
// ============================================================

type ToastVariant = "success" | "error" | "warning" | "info"

interface Toast {
    id: string
    message: string
    variant: ToastVariant
    duration?: number
}

interface ToastContextValue {
    toast: (message: string, variant?: ToastVariant, duration?: number) => void
    success: (message: string) => void
    error: (message: string) => void
    warning: (message: string) => void
    info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ============================================================
// HOOK
// ============================================================

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error("useToast must be used within ToastProvider")
    return ctx
}

// ============================================================
// TOAST ITEM
// ============================================================

const icons: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />,
    error: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
}

const bgColors: Record<ToastVariant, string> = {
    success: "bg-green-50 border-green-200 dark:bg-green-950/60 dark:border-green-800",
    error: "bg-red-50 border-red-200 dark:bg-red-950/60 dark:border-red-800",
    warning: "bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:border-amber-800",
    info: "bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:border-blue-800",
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const [exiting, setExiting] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    useEffect(() => {
        const dur = toast.duration ?? 4000
        timerRef.current = setTimeout(() => {
            setExiting(true)
            setTimeout(() => onDismiss(toast.id), 300)
        }, dur)
        return () => clearTimeout(timerRef.current)
    }, [toast, onDismiss])

    const dismiss = () => {
        clearTimeout(timerRef.current)
        setExiting(true)
        setTimeout(() => onDismiss(toast.id), 300)
    }

    return (
        <div
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm max-w-sm transition-all duration-300",
                bgColors[toast.variant],
                exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0 animate-in slide-in-from-right-5"
            )}
            role="alert"
        >
            {icons[toast.variant]}
            <span className="flex-1 text-foreground">{toast.message}</span>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}

// ============================================================
// PROVIDER
// ============================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((message: string, variant: ToastVariant = "info", duration?: number) => {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        setToasts(prev => [...prev, { id, message, variant, duration }])
    }, [])

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const ctx: ToastContextValue = {
        toast: addToast,
        success: (msg) => addToast(msg, "success"),
        error: (msg) => addToast(msg, "error"),
        warning: (msg) => addToast(msg, "warning"),
        info: (msg) => addToast(msg, "info"),
    }

    return (
        <ToastContext.Provider value={ctx}>
            {children}
            {/* Toast container — fixed bottom-right */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className="pointer-events-auto">
                        <ToastItem toast={t} onDismiss={dismiss} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
