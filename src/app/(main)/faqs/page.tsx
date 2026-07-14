import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
import FaqListSection from "@/components/FaqListSection";
import { DEFAULT_FAQS } from "@/components/admin/page-editor/sectionRegistry";
import { getPageMetadata } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return getPageMetadata("/faqs");
}

export default async function FAQsPage() {
    const ctx = await getSiteContext();
    const pageData = ctx.pages["faqs-page"] as any;
    const sections = pageData?.sections || [];

    if (sections.length > 0) {
        return (
            <SiteContextProvider value={ctx}>
                <DynamicPageRenderer sections={sections} pageKey="faqs-page" />
            </SiteContextProvider>
        );
    }

    return (
        <SiteContextProvider value={ctx}>
            <FaqListSection title="Frequently Asked Questions" items={DEFAULT_FAQS as any} />
        </SiteContextProvider>
    );
}