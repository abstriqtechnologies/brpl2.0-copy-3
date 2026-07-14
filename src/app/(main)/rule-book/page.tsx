import PageBanner from "@/components/PageBanner";
import SEO from "@/components/SEO";
import { decodeHtmlEntities } from "@/utils/htmlHelper";
import { getSiteContext, getLegal } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
import LegalContentSection from "@/components/LegalContentSection";
import { RuleBookDefault } from "@/components/legal/DefaultContent";
import { getPageMetadata } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return getPageMetadata("/rule-book");
}

export default async function RuleBook() {
    const [ctx, legal] = await Promise.all([getSiteContext(), getLegal()]);
    const pageData = ctx.pages["rule-book"] as any;
    const sections = pageData?.sections || [];

    if (sections.length > 0) {
        return (
            <SiteContextProvider value={ctx}>
                <DynamicPageRenderer sections={sections} pageKey="rule-book" />
            </SiteContextProvider>
        );
    }

    const rulebookContent = (legal?.rulebook?.content || "").trim();

    return (
        <SiteContextProvider value={ctx}>
            <div className="min-h-screen bg-gray-50/50 font-sans text-slate-800">
                <SEO title="Rule Book" description="Rule Book of BRPL." />
                <PageBanner pageKey="ruleBook" title="Rule Book" currentPage="Rule Book" />
                <div className="max-w-8xl mx-auto px-4 md:px-8 py-12 lg:py-16">
                    <div className="p-8 md:p-12 rounded-3xl shadow-lg border border-gray-100 bg-white">
                        {rulebookContent ? (
                            <LegalContentSection title={legal?.rulebook?.title || "Rule Book"} content={decodeHtmlEntities(rulebookContent)} />
                        ) : (
                            <RuleBookDefault />
                        )}
                    </div>
                </div>
            </div>
        </SiteContextProvider>
    );
}
