/**
 * Dev-only endpoint that invalidates the site-context cache. Used by
 * integration tests that mutate the DB directly and need the next public
 * page render to reflect the change without going through the admin UI.
 *
 * Disabled in production builds via NODE_ENV check.
 */

import { revalidateTag } from "next/cache";
import { TAGS } from "@/lib/revalidate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
    if (process.env.NODE_ENV === "production") {
        return new Response("Not available in production", { status: 404 });
    }

    const url = new URL(req.url);
    const tag = url.searchParams.get("tag") || TAGS.ALL;

    revalidateTag(tag);

    return Response.json({ ok: true, tag, at: Date.now() });
}

export async function GET(req: Request) {
    return POST(req);
}