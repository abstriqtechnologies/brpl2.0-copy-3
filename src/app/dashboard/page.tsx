import { getAuthSession } from "@/lib/session";
import { staleJwtRedirect } from "@/lib/auth/stale-jwt";
import DashboardClient from "./DashboardClient";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getAuthSession();
    if (!session) {
        // Stale JWT — redirect to /login. Middleware will clear the cookie
        // on the next request (see src/lib/auth/stale-jwt.ts for rationale).
        await staleJwtRedirect("/dashboard");
        return null; // unreachable
    }
    // NOTE: We do NOT redirect to /checkout when DB says paymentStatus !== "completed".
    //
    // Earlier this page redirected unpaid users to /checkout, which created an
    // infinite loop whenever the JWT `paid` claim drifted from the DB
    // `paymentStatus` (e.g. admin toggled payment after JWT was issued, webhook
    // updated DB before refreshing the cookie, etc.):
    //   /dashboard  -> page redirects to /checkout
    //   /checkout   -> middleware sees JWT paid=true -> redirects to /dashboard
    //   repeat, ~1 req/sec
    //
    // The middleware cannot read the DB (edge runtime), so it must trust the
    // JWT claim. The page CAN read the DB. To break the loop we render the
    // dashboard with a "Complete your registration" CTA (see DashboardClient)
    // and let the user click through to /checkout on their own.
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <DashboardClient />
        </SiteContextProvider>
    );
}