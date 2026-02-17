/**
 * Prisma Seed Script
 *
 * Creates the initial admin user and workspace.
 *
 * Usage:
 *   1. Set DATABASE_URL and ADMIN_PASSWORD env vars
 *   2. Run: npx prisma db seed
 *
 * Default admin:
 *   Email:    jeremy@theviablesource.com
 *   Password: (set via ADMIN_PASSWORD env var)
 */

import { prisma } from "../src/lib/prisma";
import { hash } from "bcryptjs";

async function main() {
    const email = process.env.ADMIN_EMAIL || "jeremy@theviablesource.com";
    const name = process.env.ADMIN_NAME || "Jeremy Marcott";
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
        console.error(
            "❌  Set ADMIN_PASSWORD environment variable before seeding.\n" +
            "   Example: ADMIN_PASSWORD=YourSecurePass123 npx prisma db seed"
        );
        process.exit(1);
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log(`⚠️  User ${email} already exists — skipping.`);
        return;
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
    });

    const workspace = await prisma.workspace.create({
        data: {
            name: "The Viable Source",
            slug: `${user.id}-default`,
            plan: "AGENCY",
            members: {
                create: {
                    userId: user.id,
                    role: "OWNER",
                },
            },
        },
    });

    console.log(`✅  Admin created:`);
    console.log(`    Email:     ${email}`);
    console.log(`    Workspace: ${workspace.name} (${workspace.plan})`);
    console.log(`    ID:        ${user.id}`);
}

main()
    .catch((e) => {
        console.error("Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
