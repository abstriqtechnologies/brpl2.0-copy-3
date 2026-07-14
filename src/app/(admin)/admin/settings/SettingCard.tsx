"use client";
import { Eye, EyeOff } from "lucide-react";
import { settingsStatus, statusPillClasses, STATUS_LABEL, type FieldMeta, type SettingsStatus } from "./settings-labels";

type AdminUserLite = { id: string; name?: string | null; email?: string | null } | null;

export type SettingCardProps = {
  meta: FieldMeta;
  keyName: string;
  isSecret: boolean;
  status: SettingsStatus;
  isSet: boolean;
  updatedAt: string | null;
  updatedBy: AdminUserLite;
  envVarName: string | null;
  value: string;
  revealed: boolean;
  busy: boolean;
  error: string | null;
  onChange: (next: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onReveal: () => void;
};

function formatRelative(iso: string | null): string {
  if (!iso) return "Never updated";
  const ts = new Date(iso).getTime();
  const deltaMs = Date.now() - ts;
  const abs = Math.abs(deltaMs);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60_000) return "just now";
  if (abs < 60 * 60_000) return rtf.format(-Math.round(deltaMs / 60_000), "minute");
  if (abs < 24 * 60 * 60_000) return rtf.format(-Math.round(deltaMs / (60 * 60_000)), "hour");
  return new Date(iso).toLocaleString();
}

function fullIso(iso: string | null): string | undefined {
  return iso ? new Date(iso).toISOString() : undefined;
}

function updatedByLabel(u: AdminUserLite): string {
  if (!u) return "unknown admin";
  return u.name || u.email || `${u.id.slice(-6)}`;
}

export function SettingCard(props: SettingCardProps) {
  const {
    meta, keyName, isSecret, status, isSet, updatedAt, updatedBy, envVarName,
    value, revealed, busy, error, onChange, onSave, onCancel, onReveal,
  } = props;

  const inputType = isSecret && !revealed ? "password" : "text";
  const pillCls = statusPillClasses(status);
  const showEnvChip = !!envVarName && status !== "db";

  return (
    <div className="space-y-2" data-testid={`setting-row-${keyName}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <label htmlFor={`input-${keyName}`} className="block text-sm font-medium text-slate-900 dark:text-slate-100">
            {meta.title}
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">{meta.subtitle}</p>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${pillCls}`}
          aria-label={`Status ${STATUS_LABEL[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`input-${keyName}`}
          data-no-track
          type={inputType}
          className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-shadow rounded-lg px-3 py-2 font-mono text-sm"
          placeholder={isSet ? (isSecret ? "••••••••" : "(set)") : "Not configured"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={meta.title}
        />
        {isSecret && (
          <button
            type="button"
            onClick={onReveal}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={revealed ? "Hide value" : "Reveal value"}
            data-testid={`reveal-${keyName}`}
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={busy || !value}
          className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Save ${meta.title}`}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-3 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={`Cancel editing ${meta.title}`}
        >
          Cancel
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="text-xs rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-2"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span title={fullIso(updatedAt)}>
          {updatedAt ? `Updated ${formatRelative(updatedAt)} by ${updatedByLabel(updatedBy)}` : "Never updated"}
        </span>
        {showEnvChip && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono">
            Env: {envVarName}
          </span>
        )}
      </div>
    </div>
  );
}

export { settingsStatus };
