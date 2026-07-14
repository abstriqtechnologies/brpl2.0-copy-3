"use client";
import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";

type Item = {
  _id: string;
  userId: string | null;
  role: "user" | "admin" | null;
  path: string;
  target: { tag: string; text?: string; href?: string };
  ts: string;
};

type ApiResp = { items?: Item[]; nextCursor?: string | null };

async function fetchActivity(params: URLSearchParams): Promise<ApiResp> {
  const r = await fetch(`/api/admin/activity?${params.toString()}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d?.ok === false) {
    throw new Error(d?.error?.message ?? `Request failed: ${r.status}`);
  }
  return (d.data ?? {}) as ApiResp;
}

export default function ActivityClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (append = false) => {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (path) params.set("path", path);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      if (append && cursor) params.set("cursor", cursor);
      const d = await fetchActivity(params);
      setItems((prev) => (append ? [...prev, ...(d.items ?? [])] : (d.items ?? [])));
      setCursor(d.nextCursor ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load activity");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, [path, from, to, cursor]);

  useEffect(() => {
    refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="activity-filters"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="activity-filters" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Activity log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Browse tracked admin and user actions across the app.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refresh(false)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label htmlFor="activity-path" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Path starts with
            </label>
            <input
              id="activity-path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/admin"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="activity-from" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              From
            </label>
            <input
              id="activity-from"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="activity-to" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              To
            </label>
            <input
              id="activity-to"
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => refresh(false)}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="h-3.5 w-3.5" />
              {busy ? "Loading…" : "Apply"}
            </button>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="activity-results"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="activity-results" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Results
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {items.length} {items.length === 1 ? "event" : "events"}
            {cursor ? " · more available" : ""}
          </p>
        </div>

        {error && (
          <div role="alert" className="text-sm border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-6 py-3">
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4 space-y-2">
                <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-3 w-64 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            No activity matches the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr className="text-left">
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Path</th>
                  <th className="px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it) => (
                  <tr key={it._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40">
                    <td className="px-6 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {new Date(it.ts).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">
                      {it.userId ? (
                        <span>
                          <span className="font-mono text-xs">…{it.userId.slice(-6)}</span>
                          <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                            ({it.role ?? "?"})
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 italic">Anonymous</span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{it.path}</td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        &lt;{it.target.tag}&gt;
                      </span>{" "}
                      {it.target.text && (
                        <span className="font-medium text-slate-900 dark:text-slate-100">{it.target.text}</span>
                      )}
                      {it.target.href && (
                        <a
                          href={it.target.href}
                          className="ml-1 text-amber-600 dark:text-amber-400 hover:underline text-xs"
                        >
                          {it.target.href}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {cursor && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
            <button
              type="button"
              onClick={() => refresh(true)}
              disabled={busy}
              className="inline-flex items-center h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}