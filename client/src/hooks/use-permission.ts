import { useAuth } from "@/hooks/use-auth";
import type { Role } from "@shared/schema";

function hasRole(userRole: Role | undefined, allowed: Role[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}

export function usePermission() {
  const { user } = useAuth();
  const role = user?.role;

  return {
    role,
    canCreateArticle: hasRole(role, ["admin", "executive", "staff", "partner"]),
    canAccessReviewQueue: hasRole(role, ["admin", "executive"]),
    canPublishArticles: hasRole(role, ["admin", "executive"]),
    canDeleteArticle: hasRole(role, ["admin", "executive"]),
    canAccessArchive: hasRole(role, ["admin", "executive", "staff"]),
    canManageRoles: hasRole(role, ["admin"]),
    isAdmin: role === "admin",
    isExecutive: role === "executive",
    isStaff: role === "staff",
    isPartner: role === "partner",
    isClient: role === "client",
    isUser: role === "user",
  };
}
