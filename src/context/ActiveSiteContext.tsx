"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { getSites, getSiteById, type StoredSite } from "@/lib/local-storage"

// ============================================================
// Active Site Context
// ============================================================
// Global state for the currently selected site. Persists to
// localStorage so it survives page refreshes. All pages consume
// this instead of managing their own selectedSiteId state.
// ============================================================

const STORAGE_KEY = "auditor:activeSiteId"

interface ActiveSiteContextValue {
    /** The full site object, or null if no sites exist */
    activeSite: StoredSite | null
    /** Just the ID string, or null */
    activeSiteId: string | null
    /** All available sites */
    sites: StoredSite[]
    /** Switch to a different site */
    setActiveSiteId: (id: string | null) => void
    /** Whether context has finished initializing */
    ready: boolean
}

const ActiveSiteContext = createContext<ActiveSiteContextValue>({
    activeSite: null,
    activeSiteId: null,
    sites: [],
    setActiveSiteId: () => { },
    ready: false,
})

export function ActiveSiteProvider({ children }: { children: ReactNode }) {
    const [activeSiteId, setActiveSiteIdState] = useState<string | null>(null)
    const [sites, setSites] = useState<StoredSite[]>([])
    const [ready, setReady] = useState(false)

    // Load sites and restore persisted selection
    const loadSites = useCallback(() => {
        const allSites = getSites()
        setSites(allSites)
        return allSites
    }, [])

    // Initialize on mount
    useEffect(() => {
        const allSites = loadSites()
        const stored = localStorage.getItem(STORAGE_KEY)

        if (stored && allSites.some((s) => s.id === stored)) {
            // Restore persisted selection
            setActiveSiteIdState(stored)
        } else if (allSites.length > 0) {
            // Default to first site
            setActiveSiteIdState(allSites[0].id)
            localStorage.setItem(STORAGE_KEY, allSites[0].id)
        }

        setReady(true)
    }, [loadSites])

    // Listen for storage changes (other tabs) and data updates
    useEffect(() => {
        const handleUpdate = () => {
            const allSites = loadSites()

            // If active site was deleted, fallback to first
            setActiveSiteIdState((prev) => {
                if (prev && allSites.some((s) => s.id === prev)) return prev
                const fallback = allSites.length > 0 ? allSites[0].id : null
                if (fallback) localStorage.setItem(STORAGE_KEY, fallback)
                return fallback
            })
        }

        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                setActiveSiteIdState(e.newValue)
            }
            handleUpdate()
        }

        window.addEventListener("storage", handleStorage)
        window.addEventListener("auditor:update", handleUpdate)
        return () => {
            window.removeEventListener("storage", handleStorage)
            window.removeEventListener("auditor:update", handleUpdate)
        }
    }, [loadSites])

    // Set active site and persist
    const setActiveSiteId = useCallback((id: string | null) => {
        setActiveSiteIdState(id)
        if (id) {
            localStorage.setItem(STORAGE_KEY, id)
        } else {
            localStorage.removeItem(STORAGE_KEY)
        }
    }, [])

    const activeSite = activeSiteId ? getSiteById(activeSiteId) ?? null : null

    return (
        <ActiveSiteContext.Provider
            value={{ activeSite, activeSiteId, sites, setActiveSiteId, ready }}
        >
            {children}
        </ActiveSiteContext.Provider>
    )
}

/** Hook to access the active site context */
export function useActiveSite() {
    const ctx = useContext(ActiveSiteContext)
    if (!ctx) throw new Error("useActiveSite must be used inside ActiveSiteProvider")
    return ctx
}
