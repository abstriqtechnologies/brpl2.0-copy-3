import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import NewsPostClient from "./NewsPostClient";
import { getPageMetadata } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    // Pass through SeoMeta helper — slug-specific overrides exist at /news/:slug path
    return getPageMetadata(`/news/${slug}`);
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <NewsPostClient slug={slug} />
        </SiteContextProvider>
    );
}
