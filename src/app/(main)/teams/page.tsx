import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
import PageBanner from "@/components/PageBanner";
import SEO from "@/components/SEO";
import TeamsGrid from "@/components/TeamsGrid";
import { DEFAULT_TEAMS_ITEMS } from "@/components/admin/page-editor/sectionRegistry";
import { getPageMetadata } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return getPageMetadata("/teams");
}

export default async function TeamsPage() {
    const ctx = await getSiteContext();
    const pageData = ctx.pages["teams"] as any;
    const sections = pageData?.sections || [];

    if (sections.length > 0) {
        return (
            <SiteContextProvider value={ctx}>
                <DynamicPageRenderer sections={sections} pageKey="teams" />
            </SiteContextProvider>
        );
    }

    return (
        <SiteContextProvider value={ctx}>
            <SEO title="Teams" description="BRPL franchise teams." />
            <PageBanner pageKey="teams" title="Teams" currentPage="Teams" />
            <TeamsGrid title="Brpl Teams" items={DEFAULT_TEAMS_ITEMS as any} />
        </SiteContextProvider>
    );
}
