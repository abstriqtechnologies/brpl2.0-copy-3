import PageBanner from "@/components/PageBanner";
import SEO from "@/components/SEO";
import { decodeHtmlEntities } from "@/utils/htmlHelper";
import { getSiteContext, getLegal } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
import LegalContentSection from "@/components/LegalContentSection";
import { TermsAndConditionsDefault } from "@/components/legal/DefaultContent";
import { getPageMetadata } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return getPageMetadata("/terms-and-conditions");
}

export default async function TermsAndConditions() {
    const [ctx, legal] = await Promise.all([getSiteContext(), getLegal()]);
    const pageData = ctx.pages["terms-page"] as any;
    const sections = pageData?.sections || [];

    if (sections.length > 0) {
        return (
            <SiteContextProvider value={ctx}>
                <DynamicPageRenderer sections={sections} pageKey="terms-page" />
            </SiteContextProvider>
        );
    }

    const termsContent = (legal?.terms?.content || "").trim();

    return (
        <SiteContextProvider value={ctx}>
            <div className="min-h-screen bg-gray-50/50 font-sans text-slate-800">
                <SEO title="Terms & Conditions" description="Terms and Conditions of BRPL." />
                <PageBanner pageKey="termsAndConditions" title="Terms & Condition" currentPage="Terms Conditions" />
                <div className="max-w-8xl mx-auto px-4 md:px-8 py-12 lg:py-16">
                    <div className="p-8 md:p-12 rounded-3xl shadow-lg border border-gray-100 bg-white">
                        {termsContent ? (
                            <LegalContentSection title={legal?.terms?.title || "Terms & Conditions"} content={decodeHtmlEntities(termsContent)} />
                        ) : (
                            <TermsAndConditionsDefault />
                        )}
                    </div>
                </div>
            </div>
        </SiteContextProvider>
    );
}
