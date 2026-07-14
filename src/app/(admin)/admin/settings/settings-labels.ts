/**
 * Client-safe metadata for the Settings UI. NO mongoose/server imports.
 * Importable from `"use client"` components and from the SettingsClient
 * test (which mocks `next/cache` but never wants the real mongoose
 * driver pulled in).
 */
import { SETTINGS_KEYS, type SettingsKey } from "@/models/settings-keys";

export type FieldMeta = {
  title: string;
  subtitle: string;
  card: "razorpay" | "sms";
};

export const LABELS: Record<SettingsKey, FieldMeta> = {
  razorpay_key_id: { title: "Razorpay Key ID", subtitle: "Public; safe to expose to the browser.", card: "razorpay" },
  razorpay_key_secret: { title: "Razorpay Key Secret", subtitle: "Server-side only. Never logged or shipped to the client.", card: "razorpay" },
  razorpay_webhook_secret: { title: "Razorpay Webhook Secret", subtitle: "Used to verify webhook signatures from Razorpay.", card: "razorpay" },
  sms_api_key: { title: "SMS API Key", subtitle: "Server-side only. Used for OTP delivery via SMSIndiaHub.", card: "sms" },
};

export type CardMeta = { id: "razorpay" | "sms"; title: string; description: string };

export const CARDS: ReadonlyArray<CardMeta> = [
  { id: "razorpay", title: "Razorpay", description: "Public key, secret, and webhook signing secret used by /checkout and /api/webhooks/razorpay." },
  { id: "sms", title: "SMS Gateway", description: "SMSIndiaHub API key used to deliver OTP messages during registration." },
];

export type SettingsStatus = "db" | "env" | "none";

export function settingsStatus({ isSet, hasEnv }: { isSet: boolean; hasEnv: boolean }): SettingsStatus {
  if (isSet) return "db";
  if (hasEnv) return "env";
  return "none";
}

export const STATUS_LABEL: Record<SettingsStatus, string> = {
  db: "Set in DB",
  env: "Using env fallback",
  none: "Not configured",
};

export function statusPillClasses(status: SettingsStatus): string {
  switch (status) {
    case "db":
      return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "env":
      return "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "none":
      return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  }
}
