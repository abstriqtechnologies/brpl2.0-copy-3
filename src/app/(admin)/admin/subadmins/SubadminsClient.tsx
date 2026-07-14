"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, RefreshCw, Power, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import SubadminForm from "@/components/admin/SubadminForm";
import api from "@/apihelper/api";

type Subadmin = {
    id: string;
    name: string;
    phone: string;
    accessAreas: string[];
    active: boolean;
};

type ApiResult<T> = {
    ok: boolean;
    data?: T;
    error?: string;
    status: number;
};

/**
 * Client component for the `/admin/subadmins` page. Loads the list on mount,
 * supports toggling `active` and soft-deleting (deactivating) via PATCH /
 * DELETE on `/api/admin/subadmins/[id]`. The add modal is `SubadminForm`;
 * on a successful create we just refresh the list.
 */
export default function SubadminsClient() {
    const [items, setItems] = useState<Subadmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [show, setShow] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        const res = await api.get<{ ok: true; data: { items: Subadmin[] } }>("/api/admin/subadmins");
        if (res.ok && res.data?.data?.items) {
            setItems(res.data.data.items);
        } else {
            setError(res.error ?? "Failed to load subadmins");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    async function toggle(id: string, active: boolean) {
        setBusyId(id);
        const res = await api.patch<ApiResult<unknown>>(`/api/admin/subadmins/${id}`, { active: !active });
        setBusyId(null);
        if (res.ok) {
            await refresh();
        } else {
            setError(res.error ?? "Failed to update");
        }
    }

    async function remove(id: string) {
        if (!confirm("Deactivate this subadmin?")) return;
        setBusyId(id);
        const res = await api.delete<ApiResult<unknown>>(`/api/admin/subadmins/${id}`);
        setBusyId(null);
        if (res.ok) {
            await refresh();
        } else {
            setError(res.error ?? "Failed to deactivate");
        }
    }

    return (
        <main className="p-6 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Subadmins
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Invite subadmins and allocate access areas.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void refresh()}
                        disabled={loading}
                        className="h-9"
                        aria-label="Refresh"
                    >
                        <RefreshCw className={"h-4 w-4 mr-1 " + (loading ? "animate-spin" : "")} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setShow(true)}
                        className="h-9 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add subadmin
                    </Button>
                </div>
            </div>

            {error && (
                <div className="mb-4 px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center justify-between">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-red-500 hover:text-red-700 ml-4 shrink-0"
                        aria-label="Dismiss"
                    >
                        &times;
                    </button>
                </div>
            )}

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="overflow-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300">
                            <tr className="text-left">
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-800">
                                    Name
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-800">
                                    Phone
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-800">
                                    Areas
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-800">
                                    Status
                                </th>
                                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-800 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && items.length === 0 && (
                                <SubadminsTableSkeleton />
                            )}
                            {!loading && items.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        No subadmins yet. Click <strong>Add subadmin</strong> to invite one.
                                    </td>
                                </tr>
                            )}
                            {items.map((it) => {
                                const busy = busyId === it.id;
                                return (
                                    <tr
                                        key={it.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                    >
                                        <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                            {it.name}
                                        </td>
                                        <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap">
                                            +91 {it.phone}
                                        </td>
                                        <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                                            {it.accessAreas.length === 0 ? (
                                                <span className="text-slate-400">—</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {it.accessAreas.map((a) => (
                                                        <span
                                                            key={a}
                                                            className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900 capitalize"
                                                        >
                                                            {a}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                                            {it.active ? (
                                                <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                    Pending first login
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => void toggle(it.id, it.active)}
                                                    disabled={busy}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                                                >
                                                    <Power className="h-3.5 w-3.5" />
                                                    {it.active ? "Deactivate" : "Activate"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void remove(it.id)}
                                                    disabled={busy || !it.active}
                                                    title={!it.active ? "Already inactive" : "Deactivate (soft delete)"}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-40"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {show && (
                <SubadminForm
                    onClose={() => setShow(false)}
                    onSaved={() => {
                        setShow(false);
                        void refresh();
                    }}
                />
            )}
        </main>
    );
}

function SubadminsTableSkeleton() {
    return (
        <>
            {Array.from({ length: 4 }).map((_, row) => (
                <tr key={row}>
                    {Array.from({ length: 5 }).map((__, col) => (
                        <td
                            key={col}
                            className="px-3 py-2 border-b border-slate-100 dark:border-slate-800"
                        >
                            <div className="h-4 w-full max-w-28 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}