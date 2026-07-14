import "server-only";
import { hasAccess, type AccessArea } from "@/lib/access-areas";
import { getAdminSession } from "@/lib/jwt";

export type RequireAreaContext = {
  getSession?: () => Promise<{
    role: "superadmin" | "admin";
    accessAreas?: string[];
  } | null>;
};

export type RequireAreaResult =
  | { ok: true; session: { role: "superadmin" | "admin"; accessAreas?: string[] } }
  | { ok: false; status: 401 | 403; message: string };

export function requireArea(ctx: RequireAreaContext = {}, defaultArea: AccessArea) {
  const getSession = ctx.getSession ?? (async () => getAdminSession());
  return async (_req: unknown, callArea?: AccessArea): Promise<RequireAreaResult> => {
    const area = callArea ?? defaultArea;
    const session = await getSession();
    if (!session) return { ok: false, status: 401, message: "Unauthorized" };
    if (!hasAccess(session, area)) return { ok: false, status: 403, message: `Requires area: ${area}` };
    return { ok: true, session };
  };
}
