"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import type { AccessArea } from "@/lib/access-areas";

/**
 * Persistent admin shell. Auth is checked by the server layout; this client
 * shell keeps the sidebar mounted while switching between admin sections.
 *
 * The shell uses `h-screen overflow-hidden` so the sidebar and content area
 * are fixed-height. The sidebar never scrolls (it's short enough to fit);
 * the content area scrolls independently when its children overflow.
 */
export function AdminHomeShell({
    children,
    role,
    accessAreas,
}: {
    children: React.ReactNode;
    role: "superadmin" | "admin";
    accessAreas: AccessArea[];
}) {
    return (
        <div className="h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-950">
            <AdminSidebar role={role} accessAreas={accessAreas} />
            <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
        </div>
    );
}
