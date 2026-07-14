import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";
import NewsArticle from "@/models/NewsArticle";
import Event from "@/models/Event";
import Job from "@/models/Job";
import { env } from "@/lib/env";

/**
 * App Router sitemap — Next renders this at /sitemap.xml.
 *
 * Combines:
 *   - Static public marketing pages (hard-coded list).
 *   - CMS-driven pages: published blog posts, news articles, events,
 *     jobs. Each becomes <url><loc>...</loc><lastmod>...</lastmod></url>.
 *
 * Auth-protected pages (/login, /dashboard, /checkout, /admin/*) are
 * intentionally excluded via robots.ts.
 *
 * The base URL comes from `env.SITE_URL`. If unset (dev only), we
 * fall back to a localhost default so the build doesn't hard-fail.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base =
        env.SITE_URL ||
        (process.env.NODE_ENV === "production"
            ? "https://brpl.example.invalid"
            : "http://localhost:3001");

    const now = new Date();
    const staticEntries: MetadataRoute.Sitemap = [
        { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
        { url: `${base}/about-us`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
        { url: `${base}/contact-us`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
        { url: `${base}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
        { url: `${base}/news`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
        { url: `${base}/events`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
        { url: `${base}/partners`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
        { url: `${base}/faqs`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
        { url: `${base}/teams`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
        { url: `${base}/career`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
        { url: `${base}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
        { url: `${base}/terms-and-conditions`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ];

    // CMS collections — feature-gated by CMS_LIVE so a half-populated dev
    // DB doesn't pollute the sitemap with drafts.
    if (!env.CMS_LIVE) return staticEntries;

    try {
        await connectDB();
        const [posts, news, events, jobs] = await Promise.all([
            BlogPost.find({ published: true }).select("slug updatedAt").lean(),
            NewsArticle.find({ published: true }).select("slug updatedAt").lean(),
            Event.find({ active: true }).select("_id startDate").lean(),
            Job.find({ active: true }).select("_id updatedAt").lean(),
        ]);

        const dynamic: MetadataRoute.Sitemap = [];

        for (const p of posts) {
            if (!p.slug) continue;
            dynamic.push({
                url: `${base}/blog/${encodeURIComponent(String(p.slug))}`,
                lastModified: p.updatedAt ?? now,
                changeFrequency: "weekly",
                priority: 0.7,
            });
        }
        for (const n of news) {
            if (!n.slug) continue;
            dynamic.push({
                url: `${base}/news/${encodeURIComponent(String(n.slug))}`,
                lastModified: n.updatedAt ?? now,
                changeFrequency: "weekly",
                priority: 0.7,
            });
        }
        for (const e of events) {
            dynamic.push({
                url: `${base}/events#${String(e._id)}`,
                lastModified: e.startDate ?? now,
                changeFrequency: "weekly",
                priority: 0.6,
            });
        }
        for (const j of jobs) {
            dynamic.push({
                url: `${base}/career#${String(j._id)}`,
                lastModified: j.updatedAt ?? now,
                changeFrequency: "weekly",
                priority: 0.6,
            });
        }

        return [...staticEntries, ...dynamic];
    } catch {
        // Sitemap MUST NOT 500 — fall back to static entries so crawlers
        // still get a usable sitemap even if Mongo is degraded.
        return staticEntries;
    }
}
