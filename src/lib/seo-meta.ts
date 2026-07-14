import type { Metadata } from "next";
import { getSeoAll } from "@/lib/siteContext";

/**
 * Resolve per-page SEO metadata from the SeoMeta collection, merged on top of
 * global SiteSettings defaults. Used by `generateMetadata()` in page routes.
 *
 * Falls back gracefully when no override exists — title from `homeSeoTitle`,
 * description from `homeSeoDescription`, etc.
 */
export async function getPageMetadata(path: string): Promise<Metadata> {
    const [all, ctx] = await Promise.all([getSeoAll(), import("@/lib/siteContext").then((m) => m.getSiteContext())]);
    const meta = all?.[path];
    const s = ctx.siteSettings as any;

    const title = meta?.title || s.homeSeoTitle || s.siteName || "Site";
    const description = meta?.description || s.homeSeoDescription || "";
    const keywords = meta?.keywords || s.homeSeoKeywords || undefined;
    const ogImage = meta?.ogImage || s.ogImage;
    const ogTitle = meta?.ogTitle || title;
    const ogDescription = meta?.ogDescription || description;

    const result: Metadata = {
        title,
        description,
        ...(keywords ? { keywords } : {}),
        openGraph: {
            title: ogTitle,
            description: ogDescription,
            ...(ogImage ? { images: [ogImage] } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title: ogTitle,
            description: ogDescription,
            ...(ogImage ? { images: [ogImage] } : {}),
        },
    };

    return result;
}
