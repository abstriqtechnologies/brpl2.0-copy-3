import PageBanner from "@/components/PageBanner";
import SEO from "@/components/SEO";
import { decodeHtmlEntities } from "@/utils/htmlHelper";
import { getSiteContext, getLegal } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
import LegalContentSection from "@/components/LegalContentSection";
import { PrivacyPolicyDefault } from "@/components/legal/DefaultContent";
import { getPageMetadata } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return getPageMetadata("/privacy-policy");
}

export default async function PrivacyPolicy() {
    const [ctx, legal] = await Promise.all([getSiteContext(), getLegal()]);
    const pageData = ctx.pages["privacy-page"] as any;
    const sections = pageData?.sections || [];

    if (sections.length > 0) {
        return (
            <SiteContextProvider value={ctx}>
                <DynamicPageRenderer sections={sections} pageKey="privacy-page" />
            </SiteContextProvider>
        );
    }

    const privacyContent = (legal?.privacy?.content || "").trim();

    return (
        <SiteContextProvider value={ctx}>
            <div className="min-h-screen bg-gray-50/50 font-sans text-slate-800">
                <SEO title="Privacy Policy" description="Privacy Policy of BRPL." />
                <PageBanner pageKey="privacyPolicy" title="Privacy Policy" currentPage="Privacy Policy" />
                <div className="max-w-8xl mx-auto px-4 md:px-8 py-12 lg:py-16">
                    <div className="p-8 md:p-12 rounded-3xl shadow-lg border border-gray-100 bg-white">
                        {privacyContent ? (
                            <LegalContentSection title={legal?.privacy?.title || "Privacy Policy"} content={decodeHtmlEntities(privacyContent)} />
                        ) : (
                            <PrivacyPolicyDefault />
                        )}
                    </div>
                </div>
            </div>
        </SiteContextProvider>
    );
}
