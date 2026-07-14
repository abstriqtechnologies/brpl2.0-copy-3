import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/jwt";
import { AdminHomeShell } from "@/components/admin/AdminHomeShell";
import type { AccessArea } from "@/lib/access-areas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getAdminSession();
    if (!session) {
        redirect("/admin/login?next=/admin/dashboard");
    }
    return (
        <AdminHomeShell
            role={session.role}
            accessAreas={(session.accessAreas ?? []) as AccessArea[]}
        >
            {children}
        </AdminHomeShell>
    );
}
