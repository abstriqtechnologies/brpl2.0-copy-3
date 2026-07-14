import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/jwt";
import SettingsClient from "./SettingsClient";

export default async function Page() {
    const session = await getAdminSession();
    if (!session) redirect("/admin/login?next=/admin/settings");
    if (session.role !== "superadmin") redirect("/admin/dashboard");

    return <SettingsClient />;
}