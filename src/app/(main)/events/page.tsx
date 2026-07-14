import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
import PageBanner from "@/components/PageBanner";
import SEO from "@/components/SEO";
import EventGrid from "@/components/EventGrid";
import { DEFAULT_EVENTS } from "@/components/admin/page-editor/sectionRegistry";
import { getPageMetadata } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return getPageMetadata("/events");
}

export default async function Events() {
    const ctx = await getSiteContext();
    const pageData = ctx.pages["events-page"] as any;
    const sections = pageData?.sections || [];

    if (sections.length > 0) {
        return (
            <SiteContextProvider value={ctx}>
                <DynamicPageRenderer sections={sections} pageKey="events-page" />
            </SiteContextProvider>
        );
    }

    return (
        <SiteContextProvider value={ctx}>
            <SEO title="Events" description="BRPL cricket events and zonal trials." />
            <PageBanner pageKey="events" title="Events" currentPage="Events" />
            <EventGrid title="Brpl Events" items={DEFAULT_EVENTS as any} />
        </SiteContextProvider>
    );
}
