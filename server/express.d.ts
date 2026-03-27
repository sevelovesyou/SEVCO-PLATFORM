import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      role: string;
      displayName: string | null;
      bio: string | null;
      email: string | null;
      password: string | null;
      xId: string | null;
    }
  }
}
