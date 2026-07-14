"use client";
import { useEffect, useState } from "react";

type Item = {
  _id: string;
  userId: string | null;
  role: "user" | "admin" | null;
  path: string;
  target: { tag: string; text?: string; href?: string };
  ts: string;
};

export default function ActivityClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(append = false) {
    setBusy(true);
    const params = new URLSearchParams();
    if (path) params.set("path", path);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    if (append && cursor) params.set("cursor", cursor);
    const r = await fetch(`/api/admin/activity?${params.toString()}`);
    const d = await r.json();
    setBusy(false);
    setItems((prev) => (append ? [...prev, ...(d.items ?? [])] : (d.items ?? [])));
    setCursor(d.nextCursor ?? null);
  }

  useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Activity log</h1>
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-600">Path starts with</label>
          <input className="border p-2 text-sm" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/admin" />
        </div>
        <div>
          <label className="block text-xs text-gray-600">From</label>
          <input type="datetime-local" className="border p-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600">To</label>
          <input type="datetime-local" className="border p-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={() => load(false)} disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
          {busy ? "Loading…" : "Apply"}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Time</th>
            <th className="p-2 text-left">User</th>
            <th className="p-2 text-left">Path</th>
            <th className="p-2 text-left">Target</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it._id} className="border-t">
              <td className="p-2 font-mono text-xs">{new Date(it.ts).toLocaleString()}</td>
              <td className="p-2">{it.userId ? `${it.userId.slice(-6)} (${it.role ?? "?"})` : "Anonymous"}</td>
              <td className="p-2 font-mono text-xs">{it.path}</td>
              <td className="p-2">
                <span className="text-gray-500">&lt;{it.target.tag}&gt;</span>{" "}
                {it.target.text && <span className="font-medium">{it.target.text}</span>}
                {it.target.href && <a href={it.target.href} className="text-blue-600 underline ml-1">{it.target.href}</a>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {cursor && (
        <button onClick={() => load(true)} disabled={busy} className="bg-gray-200 px-4 py-2 rounded text-sm">
          Load more
        </button>
      )}
    </div>
  );
}
