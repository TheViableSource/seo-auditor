"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
    ArrowLeft,
    Users,
    Plus,
    Trash2,
    Globe,
    Building2,
    Mail,
    ChevronRight,
    Pencil,
    X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    getClients,
    addClient,
    removeClient,
    updateClient,
    getSites,
    assignSiteToClient,
    getLatestAuditForSite,
    getSettings,
    type StoredClient,
    type StoredSite,
    TIER_LIMITS,
} from "@/lib/local-storage"
import { useToast } from "@/components/ui/toast-provider"

function AddClientDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (name: string, email: string, company: string) => void }) {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [company, setCompany] = useState("")

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Add Client</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-3">
                    <input
                        value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name *"
                        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <input
                        value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)"
                        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <input
                        value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)"
                        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                </div>
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        disabled={!name.trim()}
                        onClick={() => { onAdd(name, email, company); setName(""); setEmail(""); setCompany(""); onClose() }}
                    >
                        Add Client
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function ClientsPage() {
    const toast = useToast()
    const [clients, setClients] = useState<StoredClient[]>([])
    const [sites, setSites] = useState<StoredSite[]>([])
    const [showAdd, setShowAdd] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [assigningSiteFor, setAssigningSiteFor] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const [isAgency, setIsAgency] = useState(false)

    const load = useCallback(() => {
        setClients(getClients())
        setSites(getSites())
        const settings = getSettings()
        setIsAgency(TIER_LIMITS[settings?.tier || "free"].clientAssignment)
    }, [])

    useEffect(() => {
        load()
        setMounted(true)
        const handler = () => load()
        window.addEventListener("auditor:update", handler)
        return () => window.removeEventListener("auditor:update", handler)
    }, [load])

    const handleAdd = (name: string, email: string, company: string) => {
        addClient(name, email || undefined, company || undefined)
        load()
        toast.success(`Client "${name}" added`)
    }

    const handleRemove = (id: string, name: string) => {
        removeClient(id)
        load()
        toast.success(`Client "${name}" removed`)
    }

    const handleAssign = (siteId: string, clientId: string) => {
        assignSiteToClient(siteId, clientId)
        load()
        setAssigningSiteFor(null)
        toast.success("Site assigned to client")
    }

    const handleUnassign = (siteId: string) => {
        assignSiteToClient(siteId, null)
        load()
        toast.success("Site unassigned")
    }

    const handleEditSave = (id: string) => {
        if (editName.trim()) {
            updateClient(id, { name: editName.trim() })
            load()
            setEditingId(null)
            toast.success("Client updated")
        }
    }

    if (!mounted) return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
            <div className="h-10 w-64 bg-muted rounded-lg animate-pulse" />
            <div className="grid md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
            </div>
        </div>
    )

    if (!isAgency) {
        return (
            <div className="p-6 md:p-8 max-w-6xl mx-auto">
                <div className="text-center py-20">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center mb-6">
                        <Users className="h-8 w-8 text-violet-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Client Management</h2>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        Assign sites to clients and manage properties from one place. This feature is available on the Agency plan.
                    </p>
                    <Link href="/settings">
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white">Upgrade to Agency</Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
                        <p className="text-muted-foreground">Manage client accounts and assign site properties</p>
                    </div>
                </div>
                <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setShowAdd(true)}>
                    <Plus className="h-4 w-4" /> Add Client
                </Button>
            </div>

            {clients.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">No clients yet. Add your first client to start assigning properties.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {clients.map((client) => {
                        const clientSites = sites.filter(s => s.clientId === client.id)
                        return (
                            <Card key={client.id} className="shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                                {client.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                {editingId === client.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            onKeyDown={(e) => e.key === "Enter" && handleEditSave(client.id)}
                                                            className="text-sm font-semibold px-2 py-0.5 border border-border rounded bg-background"
                                                            autoFocus
                                                        />
                                                        <button onClick={() => handleEditSave(client.id)} className="text-green-500 text-xs font-medium">Save</button>
                                                    </div>
                                                ) : (
                                                    <CardTitle className="text-base">{client.name}</CardTitle>
                                                )}
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                    {client.company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{client.company}</span>}
                                                    {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => { setEditingId(client.id); setEditName(client.name) }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => handleRemove(client.id, client.name)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500/70 hover:text-red-500">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-2">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-medium">Assigned Sites ({clientSites.length})</span>
                                            <button
                                                onClick={() => setAssigningSiteFor(assigningSiteFor === client.id ? null : client.id)}
                                                className="text-orange-500 hover:text-orange-600 font-medium flex items-center gap-0.5"
                                            >
                                                <Plus className="h-3 w-3" /> Assign
                                            </button>
                                        </div>
                                        {clientSites.map(site => {
                                            const latestAudit = getLatestAuditForSite(site.id)
                                            return (
                                                <div key={site.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/50 group">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                        <span className="text-sm truncate">{site.name || site.domain}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {latestAudit && (
                                                            <span className={`text-xs font-bold ${latestAudit.score >= 80 ? "text-green-600" : latestAudit.score >= 60 ? "text-orange-600" : "text-red-600"}`}>
                                                                {latestAudit.score}
                                                            </span>
                                                        )}
                                                        <button onClick={() => handleUnassign(site.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {/* Assignment dropdown */}
                                        {assigningSiteFor === client.id && (
                                            <div className="border border-border rounded-lg p-2 space-y-1 bg-background shadow-sm">
                                                {sites.filter(s => !s.clientId).length === 0 ? (
                                                    <p className="text-xs text-muted-foreground text-center py-2">All sites are assigned</p>
                                                ) : (
                                                    sites.filter(s => !s.clientId).map(site => (
                                                        <button
                                                            key={site.id}
                                                            onClick={() => handleAssign(site.id, client.id)}
                                                            className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted text-sm"
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                                                {site.name || site.domain}
                                                            </span>
                                                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            <AddClientDialog open={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAdd} />
        </div>
    )
}
