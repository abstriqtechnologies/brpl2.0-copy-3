import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import NewsClient from "./NewsClient";
import { getPageMetadata } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return getPageMetadata("/news");
}

export default async function News() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <NewsClient />
        </SiteContextProvider>
    );
}
