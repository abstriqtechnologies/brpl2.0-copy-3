"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { SETTINGS_KEYS, isSecretKey, type SettingsKey } from "@/models/settings-keys";
import { SettingCard } from "./SettingCard";
import { CARDS, LABELS, settingsStatus, type SettingsStatus } from "./settings-labels";

// Sub-clients are mounted client-side only. ssr:false avoids pulling their
// admin-only data into the static HTML for this page.
const SubadminsClient = dynamic(() => import("../subadmins/SubadminsClient"), { ssr: false });
const ActivityClient = dynamic(() => import("../activity/ActivityClient"), { ssr: false });

type Tab = "keys" | "subadmins" | "activity";
const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: "keys", label: "Keys" },
  { id: "subadmins", label: "Subadmins" },
  { id: "activity", label: "Activity" },
];
function parseTab(raw: string | null): Tab {
  return raw === "subadmins" || raw === "activity" ? raw : "keys";
}

type SettingRow = {
  key: SettingsKey;
  secret: boolean;
  isSet: boolean;
  updatedAt: string | null;
  updatedBy: { id: string; name?: string | null; email?: string | null } | null;
};

type EnvRow = { key: SettingsKey; hasEnv: boolean; envVarName: string };

type FieldState = {
  value: string;
  revealed: boolean;
  revealedValue: string;
  busy: boolean;
  error: string | null;
  savedFlash: boolean;
};

const EMPTY_STATE: FieldState = { value: "", revealed: false, revealedValue: "", busy: false, error: null, savedFlash: false };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body?.ok === false) {
    const msg = body?.error?.message ?? `Request failed: ${r.status}`;
    throw new Error(msg);
  }
  return body.data as T;
}

function KeysTab() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [envRows, setEnvRows] = useState<EnvRow[]>([]);
  const [states, setStates] = useState<Record<string, FieldState>>({});
  const [loading, setLoading] = useState(true);
  const [partialError, setPartialError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setPartialError(null);
    const [settings, envStatus] = await Promise.allSettled([
      fetchJson<{ items: SettingRow[] }>("/api/admin/settings"),
      fetchJson<{ items: EnvRow[] }>("/api/admin/settings/env-status"),
    ]);
    if (settings.status === "fulfilled") setRows(settings.value?.items ?? []);
    if (envStatus.status === "fulfilled") setEnvRows(envStatus.value?.items ?? []);
    if (settings.status === "rejected" && envStatus.status === "rejected") {
      setPartialError("Failed to load settings. Click refresh to retry.");
    } else if (settings.status === "rejected" || envStatus.status === "rejected") {
      setPartialError("Some status info may be stale (refresh to retry).");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function setField(key: string, patch: Partial<FieldState>) {
    setStates((s) => ({ ...s, [key]: { ...(s[key] ?? EMPTY_STATE), ...patch } }));
  }

  async function handleSave(key: SettingsKey) {
    const cur = states[key] ?? EMPTY_STATE;
    if (!cur.value) return;
    setField(key, { busy: true, error: null });
    try {
      await fetchJson(`/api/admin/settings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, value: cur.value }),
      });
      setField(key, { value: "", revealed: false, revealedValue: "", busy: false, savedFlash: true });
      window.setTimeout(() => setField(key, { savedFlash: false }), 3000);
      await refresh();
    } catch (e: any) {
      setField(key, { busy: false, error: e?.message ?? "Failed to save" });
    }
  }

  function handleCancel(key: SettingsKey) {
    setField(key, { value: "", revealed: false, revealedValue: "", error: null });
  }

  async function handleReveal(key: SettingsKey) {
    const cur = states[key] ?? EMPTY_STATE;
    if (cur.revealed) {
      setField(key, { revealed: false });
      return;
    }
    try {
      const data = await fetchJson<{ value: string | null }>(`/api/admin/settings/${key}/reveal`);
      setField(key, { revealed: true, revealedValue: data.value ?? "" });
    } catch (e: any) {
      setField(key, { error: e?.message ?? "Failed to reveal" });
    }
  }

  const envByKey = useMemo(() => {
    const m = new Map<SettingsKey, EnvRow>();
    for (const e of envRows) m.set(e.key, e);
    return m;
  }, [envRows]);

  return (
    <div className="space-y-6">
      {partialError && (
        <div role="alert" className="text-sm rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-3">
          {partialError}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="space-y-4">
          {CARDS.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="h-5 w-32 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        CARDS.map((card) => (
          <section
            key={card.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
            aria-labelledby={`card-${card.id}`}
          >
            <div>
              <h2 id={`card-${card.id}`} className="text-lg font-semibold text-slate-900 dark:text-slate-100">{card.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.description}</p>
            </div>
            <div className="space-y-6">
              {SETTINGS_KEYS.filter((k) => LABELS[k].card === card.id).map((key) => {
                const row = rows.find((r) => r.key === key);
                const env = envByKey.get(key);
                const state = states[key] ?? EMPTY_STATE;
                const status: SettingsStatus = settingsStatus({
                  isSet: row?.isSet ?? false,
                  hasEnv: env?.hasEnv ?? false,
                });
                const isSecret = isSecretKey(key);
                const displayValue = state.revealed ? state.revealedValue : state.value;
                return (
                  <div key={key} className="space-y-1">
                    <SettingCard
                      meta={LABELS[key]}
                      keyName={key}
                      isSecret={isSecret}
                      status={status}
                      isSet={row?.isSet ?? false}
                      updatedAt={row?.updatedAt ?? null}
                      updatedBy={row?.updatedBy ?? null}
                      envVarName={env?.envVarName ?? null}
                      value={displayValue}
                      revealed={state.revealed}
                      busy={state.busy}
                      error={state.error}
                      onChange={(v) => setField(key, { value: v, revealed: false, error: null })}
                      onSave={() => handleSave(key)}
                      onCancel={() => handleCancel(key)}
                      onReveal={() => handleReveal(key)}
                    />
                    {state.savedFlash && (
                      <div role="status" className="text-xs rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-1.5">
                        Saved.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default function SettingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams?.get("tab") ?? null);

  function selectTab(next: Tab) {
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (next === "keys") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(`/admin/settings${qs ? `?${qs}` : ""}`);
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Settings</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Manage integration secrets, subadmin accounts, and view activity.</p>
          </div>
          <a href="/admin/dashboard" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
            ← Back to dashboard
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 lg:px-8 pt-4">
        <div role="tablist" aria-label="Settings tabs" className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => selectTab(t.id)}
              className={`px-4 h-10 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
              data-testid={`tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
        <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "keys" && <KeysTab />}
          {tab === "subadmins" && <SubadminsClient />}
          {tab === "activity" && <ActivityClient />}
        </div>
      </div>
    </main>
  );
}
