// Mock data for Phase 2 UI development
// Replace with real database queries when PostgreSQL is connected

export const mockUser = {
    id: "usr_1",
    name: "Jeremy Marcott",
    email: "jeremy@theviablesource.com",
    avatar: null,
    plan: "PRO" as const,
}

export const mockWorkspace = {
    id: "ws_1",
    name: "The Viable Source",
    slug: "viable-source",
    plan: "PRO" as const,
    memberCount: 3,
}

export interface MockSite {
    id: string
    domain: string
    url: string
    name: string
    favicon: string | null
    lastAuditScore: number | null
    lastAuditDate: string | null
    totalAudits: number
    issuesCount: number
    status: "active" | "pending" | "error"
}

export const mockSites: MockSite[] = [
    {
        id: "site_1",
        domain: "theviablesource.com",
        url: "https://theviablesource.com",
        name: "The Viable Source",
        favicon: null,
        lastAuditScore: 87,
        lastAuditDate: "2026-02-15",
        totalAudits: 12,
        issuesCount: 4,
        status: "active",
    },
    {
        id: "site_2",
        domain: "ajisaisushisteak.com",
        url: "https://ajisaisushisteak.com",
        name: "Ajisai Sushi & Steak",
        favicon: null,
        lastAuditScore: 72,
        lastAuditDate: "2026-02-14",
        totalAudits: 8,
        issuesCount: 9,
        status: "active",
    },
    {
        id: "site_3",
        domain: "backcountrywine.tours",
        url: "https://backcountrywine.tours",
        name: "Backcountry Wine Tours",
        favicon: null,
        lastAuditScore: 64,
        lastAuditDate: "2026-02-10",
        totalAudits: 3,
        issuesCount: 14,
        status: "active",
    },
    {
        id: "site_4",
        domain: "example-client.com",
        url: "https://example-client.com",
        name: "Example Client Site",
        favicon: null,
        lastAuditScore: null,
        lastAuditDate: null,
        totalAudits: 0,
        issuesCount: 0,
        status: "pending",
    },
]

export interface MockAudit {
    id: string
    siteId: string
    siteName: string
    domain: string
    url: string
    score: number
    type: "ON_PAGE" | "TECHNICAL" | "FULL"
    status: "COMPLETED" | "IN_PROGRESS" | "FAILED"
    issuesFound: number
    createdAt: string
}

export const mockAudits: MockAudit[] = [
    {
        id: "aud_1",
        siteId: "site_1",
        siteName: "The Viable Source",
        domain: "theviablesource.com",
        url: "https://theviablesource.com",
        score: 87,
        type: "FULL",
        status: "COMPLETED",
        issuesFound: 4,
        createdAt: "2026-02-15T14:30:00Z",
    },
    {
        id: "aud_2",
        siteId: "site_2",
        siteName: "Ajisai Sushi & Steak",
        domain: "ajisaisushisteak.com",
        url: "https://ajisaisushisteak.com",
        score: 72,
        type: "ON_PAGE",
        status: "COMPLETED",
        issuesFound: 9,
        createdAt: "2026-02-14T09:15:00Z",
    },
    {
        id: "aud_3",
        siteId: "site_3",
        siteName: "Backcountry Wine Tours",
        domain: "backcountrywine.tours",
        url: "https://backcountrywine.tours",
        score: 64,
        type: "TECHNICAL",
        status: "COMPLETED",
        issuesFound: 14,
        createdAt: "2026-02-10T16:45:00Z",
    },
    {
        id: "aud_4",
        siteId: "site_1",
        siteName: "The Viable Source",
        domain: "theviablesource.com",
        url: "https://theviablesource.com/services",
        score: 91,
        type: "ON_PAGE",
        status: "COMPLETED",
        issuesFound: 2,
        createdAt: "2026-02-13T11:00:00Z",
    },
    {
        id: "aud_5",
        siteId: "site_2",
        siteName: "Ajisai Sushi & Steak",
        domain: "ajisaisushisteak.com",
        url: "https://ajisaisushisteak.com/menus",
        score: 68,
        type: "ON_PAGE",
        status: "COMPLETED",
        issuesFound: 11,
        createdAt: "2026-02-12T08:30:00Z",
    },
    {
        id: "aud_6",
        siteId: "site_1",
        siteName: "The Viable Source",
        domain: "theviablesource.com",
        url: "https://theviablesource.com",
        score: 82,
        type: "FULL",
        status: "COMPLETED",
        issuesFound: 6,
        createdAt: "2026-02-08T10:00:00Z",
    },
]

// Score trend data for the last 7 audits
export const mockScoreTrend = [
    { date: "Feb 8", score: 74 },
    { date: "Feb 9", score: 76 },
    { date: "Feb 10", score: 72 },
    { date: "Feb 11", score: 79 },
    { date: "Feb 12", score: 81 },
    { date: "Feb 13", score: 85 },
    { date: "Feb 15", score: 87 },
]

// Dashboard summary stats
export const mockDashboardStats = {
    totalSites: mockSites.length,
    totalAudits: mockAudits.length,
    avgScore: Math.round(
        mockAudits.reduce((sum, a) => sum + a.score, 0) / mockAudits.length
    ),
    totalIssues: mockAudits.reduce((sum, a) => sum + a.issuesFound, 0),
    scoreChange: +5, // compared to last week
}
