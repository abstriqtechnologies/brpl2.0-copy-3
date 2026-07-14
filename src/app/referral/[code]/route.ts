import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Referral from "@/models/Referral";
import { limiterFor } from "@/lib/api/rate-limit";
import { enforceRateLimit } from "@/lib/api/rate-limit-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
    // Audit C6: /referral/[code] is unauthenticated; click-fraud on
    // linkOpenCount was unmitigated. 30/min per-IP caps the worst case.
    const blocked = enforceRateLimit(limiterFor("referral-click"), req);
    if (blocked) return blocked;

    const code = decodeURIComponent(params.code || "")
        .trim()
        .toUpperCase();
    const url = new URL("/checkout", req.url);

    if (!code) {
        return NextResponse.redirect(url);
    }

    await connectDB();
    const referral = await Referral.findOneAndUpdate(
        { code },
        { $inc: { linkOpenCount: 1 }, $set: { lastOpenedAt: new Date() } },
        { returnDocument: "after" },
    ).lean();

    if (referral?.couponCode) {
        url.searchParams.set("ref", referral.couponCode);
    }

    return NextResponse.redirect(url);
}
