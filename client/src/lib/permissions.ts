const CLIENT_PLUS_ROLES = ["client", "partner", "staff", "executive", "admin"];

export function isClientPlus(role: string | undefined | null): boolean {
  if (!role) return false;
  return CLIENT_PLUS_ROLES.includes(role);
}
