"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCESS_AREAS } from "@/lib/access-areas";
import { X } from "lucide-react";

type Props = {
    onClose: () => void;
    onSaved: () => void;
};

/**
 * Modal form for inviting a new subadmin by phone + access areas. On submit,
 * POSTs to `/api/admin/subadmins` and reports success/error back to the
 * caller. The server already validates; we surface its error message verbatim.
 */
export default function SubadminForm({ onClose, onSaved }: Props) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [areas, setAreas] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const canSave = !busy && name.trim().length > 0 && /^\d{10}$/.test(phone) && areas.length > 0;

    function toggleArea(a: string) {
        setAreas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
    }

    async function submit() {
        setBusy(true);
        setErr(null);
        try {
            const res = await fetch("/api/admin/subadmins", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ phone, name, accessAreas: areas }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setErr(data?.message ?? data?.error ?? "Failed to add subadmin");
                return;
            }
            onSaved();
        } catch (e) {
            setErr((e as Error).message ?? "Failed to add subadmin");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add subadmin</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="sub-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Name
                        </Label>
                        <Input
                            id="sub-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Sub Admin"
                            maxLength={80}
                            className="h-9 text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="sub-phone" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Phone <span className="text-slate-400 font-normal">(10-digit)</span>
                        </Label>
                        <Input
                            id="sub-phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            placeholder="9876543210"
                            inputMode="numeric"
                            className="h-9 text-sm font-mono"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Access areas
                        </Label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Subadmin can log in via OTP and only sees these areas.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {ACCESS_AREAS.map((a) => {
                                const checked = areas.includes(a);
                                return (
                                    <label
                                        key={a}
                                        className={
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors " +
                                            (checked
                                                ? "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200"
                                                : "bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800")
                                        }
                                    >
                                        <input
                                            type="checkbox"
                                            className="h-3.5 w-3.5 accent-amber-500"
                                            checked={checked}
                                            onChange={() => toggleArea(a)}
                                        />
                                        <span className="capitalize">{a}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {err && (
                        <div className="px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                            {err}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={submit}
                        disabled={!canSave}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        {busy ? "Saving…" : "Save"}
                    </Button>
                </div>
            </div>
        </div>
    );
}