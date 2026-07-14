import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

// The Razorpay key id can change via /admin/settings at runtime, so this
// route must NOT be prerendered (which is what `revalidate` would force
// during `next build` — it would try to query MongoDB at build time).
export const dynamic = "force-dynamic";

export async function GET() {
    const keyId = (await getSetting("razorpay_key_id")) ?? "";
    return NextResponse.json({ keyId });
}