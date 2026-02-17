import { NextResponse } from "next/server"
import { generateTasksForSite } from "@/lib/tasks-engine"

/**
 * POST /api/tasks
 *
 * Generates actionable tasks for a site.
 * Body: { siteId: string, gaData?: object, gmbData?: object }
 *
 * Returns: { tasks: ActionTask[] }
 */
export async function POST(request: Request) {
    try {
        const { siteId, gaData, gmbData } = await request.json()

        if (!siteId) {
            return NextResponse.json(
                { error: "siteId is required" },
                { status: 400 }
            )
        }

        const tasks = generateTasksForSite(siteId, gaData, gmbData)

        return NextResponse.json({ tasks, count: tasks.length })
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Failed to generate tasks"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
