import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
import ContactUsClient from "./ContactUsClient";
import { getPageMetadata } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return getPageMetadata("/contact-us");
}

export default async function ContactUs() {
    const ctx = await getSiteContext();
    const pageData = ctx.pages["contact-us"] as any;
    const sections = pageData?.sections || [];

    if (sections.length > 0) {
        return (
            <SiteContextProvider value={ctx}>
                <DynamicPageRenderer sections={sections} />
            </SiteContextProvider>
        );
    }

    return (
        <SiteContextProvider value={ctx}>
            <ContactUsClient />
        </SiteContextProvider>
    );
}
