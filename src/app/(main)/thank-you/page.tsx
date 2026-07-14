import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import ThankYouClient from "./ThankYouClient";
import { getPageMetadata } from "@/lib/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return getPageMetadata("/thank-you");
}

export default async function ThankYouPage() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <ThankYouClient />
        </SiteContextProvider>
    );
}