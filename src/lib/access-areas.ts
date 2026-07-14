/**
 * Pure, client-safe access-area helpers. NO server-only imports here — any
 * module that pulls in `next/headers` (e.g. `@/lib/jwt`) must NOT be
 * transitively imported by a `"use client"` component through this file.
 *
 * The server-side `requireArea` factory lives in `@/lib/api/require-area`
 * (`import "server-only"`).
 */

export const ACCESS_AREAS = ["seo", "content", "sales"] as const;
export type AccessArea = (typeof ACCESS_AREAS)[number];

export type AdminLikeSession = {
  role: "superadmin" | "admin";
  accessAreas?: string[];
};

export function hasAccess(session: AdminLikeSession, area: AccessArea): boolean {
  if (session.role === "superadmin") return true;
  return (session.accessAreas ?? []).includes(area);
}
