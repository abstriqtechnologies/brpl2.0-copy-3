import "server-only";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/jwt";

/**
 * Lightweight admin guard for bare Next.js route handlers that don't use the
 * `withAdmin` composition helper.
 *
 * Returns `null` when a valid admin session is present (caller proceeds), or a
 * ready-to-return 401 `NextResponse` when it is not.
 *
 * Usage:
 *   const denied = await requireAdminSession();
 *   if (denied) return denied;
 */
export async function requireAdminSession(): Promise<NextResponse | null> {
    const session = await getAdminSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
}
