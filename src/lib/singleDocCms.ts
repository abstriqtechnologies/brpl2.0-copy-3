import { connectDB } from "@/lib/mongodb";
import { requireAdminDb, ok, fail, notFound, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS, type SiteTag } from "@/lib/revalidate";
import type { Model } from "mongoose";
import { z } from "zod";

/**
 * Reject prototype-pollution keys in user-supplied JSON bodies.
 */
function isSafeObject(body: Record<string, unknown>): boolean {
    for (const k of Object.keys(body)) {
        if (k === "__proto__" || k === "constructor" || k === "prototype") return false;
    }
    return true;
}

/**
 * Build GET/PATCH handlers for a single-document CMS collection. The
 * document is fetched/upserted on first read.
 *
 * The optional `bodySchema` param lets callers define an explicit Zod schema
 * for the PATCH body — when provided, `.strict()` rejects unknown fields,
 * preventing mass-assignment of mongoose internal keys.
 */
export function buildSingleDocHandlers<T>(
    getModel: () => Model<T>,
    defaultDoc: () => Partial<T> = () => ({}) as Partial<T>,
    revalidateTag: SiteTag = TAGS.ALL,
    bodySchema?: z.ZodTypeAny,
) {
    async function GET() {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        await connectDB();
        const Model = getModel();
        let doc: any = await Model.findOne({}).lean();
        if (!doc) {
            const created = await Model.create(defaultDoc() as any);
            doc = created.toObject();
        }
        return ok({ ...doc, _id: doc._id?.toString() });
    }

    async function PATCH(req: Request) {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const body = await req.json().catch(() => ({}));
        if (typeof body !== "object" || body === null) return fail("Invalid body", 400);
        if (!isSafeObject(body)) return fail("Prototype keys not allowed", 400);
        const parsed = bodySchema ? (bodySchema as z.ZodObject<z.ZodRawShape>).strict().safeParse(body) : null;
        if (parsed && !parsed.success) return fail("Invalid body", 400);
        const safeBody = parsed ? parsed.data : body;
        await connectDB();
        const Model = getModel();
        const existingDoc = await Model.findOne({});
        if (!existingDoc) {
            const created = await Model.create({ ...defaultDoc(), ...safeBody } as any);
            revalidateSite(revalidateTag);
            return ok({ ...created.toObject(), _id: String(created._id) });
        }
        Object.assign(existingDoc, safeBody);
        await existingDoc.save();
        revalidateSite(revalidateTag);
        return ok({ ...existingDoc.toObject(), _id: String(existingDoc._id) });
    }

    return { GET, PATCH };
}
