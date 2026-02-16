import { Suspense } from "react"

// Standalone layout for embed pages — no sidebar, no nav
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            {children}
        </Suspense>
    )
}
