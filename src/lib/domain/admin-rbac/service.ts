import { normalizePhone } from "@/lib/phone";
import type { IAdminUser } from "@/models/AdminUser";
import { ACCESS_AREAS, type AccessArea } from "@/lib/access-areas";

export interface AdminRepo {
  findByPhone(phone: string): Promise<IAdminUser | null>;
  findMany(query: Partial<Pick<IAdminUser, "role" | "active">>): Promise<IAdminUser[]>;
  create(input: Partial<IAdminUser>): Promise<IAdminUser>;
  update(id: string, patch: Partial<IAdminUser>): Promise<IAdminUser | null>;
}

export type CreateSubadminDeps = {
  adminRepo: AdminRepo;
  phone: string;
  name: string;
  accessAreas: AccessArea[];
  now?: () => number;
};

export async function createSubadmin(deps: CreateSubadminDeps): Promise<IAdminUser> {
  const { adminRepo, accessAreas } = deps;
  const phone = normalizePhone(deps.phone);
  if (!phone || !/^\d{10}$/.test(phone)) throw new Error("Invalid phone");
  if (!accessAreas.length) throw new Error("At least one access area required");
  if (accessAreas.some((a) => !ACCESS_AREAS.includes(a))) {
    throw new Error(`Unknown access area; allowed: ${ACCESS_AREAS.join(", ")}`);
  }
  const existing = await adminRepo.findByPhone(phone);
  if (existing && existing.active) throw new Error("Admin with this phone already exists");

  return adminRepo.create({
    phone,
    name: deps.name.trim(),
    role: "admin",
    active: false,
    accessAreas,
    email: `${phone}@sub.brpl.local`,
    passwordHash: `placeholder-${deps.now?.() ?? Date.now()}`,
  });
}

export type ListSubadminsDeps = { adminRepo: AdminRepo };
export async function listSubadmins(deps: ListSubadminsDeps): Promise<IAdminUser[]> {
  return deps.adminRepo.findMany({ role: "admin" });
}

export type UpdateSubadminDeps = {
  adminRepo: AdminRepo;
  id: string;
  patch: Partial<Pick<IAdminUser, "name" | "accessAreas" | "active">>;
};
export async function updateSubadmin(deps: UpdateSubadminDeps): Promise<IAdminUser> {
  const updated = await deps.adminRepo.update(deps.id, deps.patch as any);
  if (!updated) throw new Error("Subadmin not found");
  return updated;
}

export type DeactivateSubadminDeps = { adminRepo: AdminRepo; id: string };
export async function deactivateSubadmin(deps: DeactivateSubadminDeps): Promise<IAdminUser> {
  const updated = await deps.adminRepo.update(deps.id, { active: false } as any);
  if (!updated) throw new Error("Subadmin not found");
  return updated;
}
