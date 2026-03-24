import type { Request, Response, NextFunction } from "express";
import type { Role } from "@shared/schema";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const userRole = req.user?.role as Role | undefined;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export const CAN_CREATE_ARTICLE: Role[] = ["admin", "executive", "staff", "partner"];
export const CAN_ACCESS_REVIEW_QUEUE: Role[] = ["admin", "executive"];
export const CAN_DELETE_ARTICLE: Role[] = ["admin", "executive"];
export const CAN_MANAGE_ROLES: Role[] = ["admin"];
