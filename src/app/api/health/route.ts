import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Disable caching for health checks
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    checks: {
      database: "unknown",
      redis: "not_configured"
    }
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = "connected";
  } catch (error) {
    health.status = "degraded";
    health.checks.database = "disconnected";
    console.error("Database health check failed:", error);
  }

  const responseTime = Date.now() - startTime;

  return NextResponse.json(
    {
      ...health,
      responseTime: `${responseTime}ms`
    },
    {
      status: health.status === "ok" ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    }
  );
}
