/**
 * `/api/admin/dashboard` — single endpoint that powers the interactive
 * admin dashboard. Accepts a date range and granularity; aggregates the
 * User and Coupon collections and returns the full payload.
 *
 * Query params:
 *   - from: ISO date (inclusive). Defaults to "now - 6 months".
 *   - to:   ISO date (inclusive end-of-day). Defaults to "now".
 *   - granularity: "day" | "month" | "year". Defaults to "month".
 */

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Coupon from "@/models/Coupon";
import AdminUser from "@/models/AdminUser";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok, BadRequestError } from "@/lib/api/response";
import { getAdminCookie } from "@/lib/auth/cookies";
import {
    computeDashboard,
    type Granularity,
    type DashboardPayload,
} from "@/lib/infra/db/dashboard-aggregations";
import type { IAdminUser } from "@/models/AdminUser";
import type { IUser } from "@/models/User";
import type { ICoupon } from "@/models/Coupon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_GRANULARITIES: Granularity[] = ["day", "month", "year"];

/**
 * Audit H5: `User.find({}).lean()` + `Coupon.find().lean()` will OOM
 * the function once the collections grow past a few thousand docs.
 * This cap is a stopgap — the long-term fix is to push the
 * aggregations into MongoDB (per-day/month counts via `$group`).
 * When the cap is exceeded we return an empty result rather than
 * unbounded load, and surface `payload.truncated: true` so the UI
 * can warn the admin.
 *
 * Bump this when the dashboard API migrates to native aggregation.
 */
const DASHBOARD_LOAD_CAP = 10_000;

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    return (await AdminUser.findById(id).lean()) as unknown as IAdminUser | null;
}

function parseDate(v: string | null, fallback: Date): Date {
    if (!v) return fallback;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
        throw new BadRequestError(`Invalid date: ${v}`);
    }
    return d;
}

function parseGranularity(v: string | null): Granularity {
    if (!v) return "month";
    if (!VALID_GRANULARITIES.includes(v as Granularity)) {
        throw new BadRequestError(`Invalid granularity: ${v}`);
    }
    return v as Granularity;
}

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
    })(async (ctx) => {
        await connectDB();
        const url = new URL(ctx.req.url);
        const now = new Date();
        const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const endOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999,
        );

        const from = parseDate(url.searchParams.get("from"), defaultFrom);
        const to = parseDate(url.searchParams.get("to"), endOfToday);
        const granularity = parseGranularity(url.searchParams.get("granularity"));

        if (from > to) {
            throw new BadRequestError("`from` must be on or before `to`");
        }

        const [users, coupons, userTotal, couponTotal] = await Promise.all([
            User.find({}).sort({ createdAt: -1 }).limit(DASHBOARD_LOAD_CAP).lean() as unknown as Promise<IUser[]>,
            Coupon.find({}).sort({ createdAt: -1 }).limit(DASHBOARD_LOAD_CAP).lean() as unknown as Promise<ICoupon[]>,
            User.countDocuments({}),
            Coupon.countDocuments({}),
        ]);

        const truncated = users.length < userTotal || coupons.length < couponTotal;

        const computed = computeDashboard(users, coupons, {
            from,
            to,
            granularity,
        });

        // Audit H5: preserve the structured `totals` object from
        // `computeDashboard` (conversion / revenue / counts) and append
        // the truncation flag + true collection size for the UI.
        const payload = {
            ...computed,
            truncated,
            collectionTotals: { users: userTotal, coupons: couponTotal },
        } as DashboardPayload & {
            truncated: boolean;
            collectionTotals: { users: number; coupons: number };
        };

        return ok(payload);
    }),
);