import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/jwt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SubadminsPage() {
    const session = await getAdminSession();
    if (!session) redirect("/admin/login?next=/admin/settings?tab=subadmins");
    if (session.role !== "superadmin") redirect("/admin/dashboard");
    redirect("/admin/settings?tab=subadmins");
}
