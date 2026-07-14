import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * App Router robots.txt — rendered at /robots.txt.
 *
 * Excludes admin/auth/checkout so search engines don't waste crawl
 * budget on internal surfaces or accidentally surface admin URLs in
 * search results.
 *
 * The sitemap URL is derived from env.SITE_URL (default localhost in
 * dev) so crawlers can fetch the dynamic sitemap at the same host.
 */
export default function robots(): MetadataRoute.Robots {
    const base =
        env.SITE_URL ||
        (process.env.NODE_ENV === "production"
            ? "https://brpl.example.invalid"
            : "http://localhost:3001");
    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/"],
                disallow: [
                    "/admin",
                    "/admin/*",
                    "/api",
                    "/api/*",
                    "/dashboard",
                    "/checkout",
                    "/login",
                    "/referral/*",
                ],
            },
        ],
        sitemap: `${base}/sitemap.xml`,
    };
}
