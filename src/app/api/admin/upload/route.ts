/**
 * POST /api/admin/upload
 *
 * Single-shot media upload (image / video) for use in CMS pages, blogs,
 * news, etc. Writes to disk under `public/uploads/<year>/<month>/`.
 *
 * Hardening (audit H4 + C6):
 *   - `withAdmin({ allowedRoles: ["superadmin"] })` enforces the
 *     superadmin role at the wrapper layer. Subadmins — even ones with
 *     content / seo / sales area access — are rejected with 403 before
 *     the handler runs. The previous implementation checked only that
 *     an admin cookie existed, so any authenticated admin (or subadmin
 *     with no areas) could upload.
 *   - Per-IP rate limit (10/min) caps the worst case of 50 MB posts.
 *   - Type whitelist + 50 MB cap (unchanged).
 */

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { getAdminCookie } from "@/lib/auth/cookies";
import { limiterFor } from "@/lib/api/rate-limit";
import { enforceRateLimit } from "@/lib/api/rate-limit-guard";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    return (await AdminUser.findById(id).lean()) as IAdminUser | null;
}

export const POST = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        const blocked = enforceRateLimit(limiterFor("admin-upload"), req);
        if (blocked) return blocked;

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { ok: false, error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
                { status: 400 },
            );
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { ok: false, error: "File too large. Maximum size is 50 MB." },
                { status: 400 },
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate path: public/uploads/2026/06/uuid-filename.ext
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const ext = file.name.split(".").pop() || "webp";
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
        const filename = `${randomUUID()}-${safeName}`;
        const relativePath = path.join("uploads", year, month, filename);
        const absoluteDir = path.join(process.cwd(), "public", "uploads", year, month);
        const absolutePath = path.join(process.cwd(), "public", relativePath);

        await mkdir(absoluteDir, { recursive: true });
        await writeFile(absolutePath, buffer);

        return NextResponse.json({
            ok: true,
            data: { url: `/${relativePath.replace(/\\/g, "/")}`, filename: file.name },
        });
    }),
);
