import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "./storage";
import { insertUserSchema, updateUserSchema, updateRoleSchema } from "@shared/schema";
import { requireRole, CAN_MANAGE_ROLES } from "./middleware/permissions";
import { pool } from "./db";
import { sendVerificationEmail } from "./emailClient";

const PgSession = connectPgSimple(session);

export function setupAuth(app: Express) {
  app.use(
    session({
      store: new PgSession({
        pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "sevco-wiki-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      }

      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(parsed.data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already taken" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const hashed = await bcrypt.hash(parsed.data.password, 10);
      const user = await storage.createUser({
        username: parsed.data.username,
        password: hashed,
        email: parsed.data.email,
      });

      await storage.updateEmailVerification(user.id, {
        emailVerificationToken: token,
        emailVerificationExpires: expires,
      });

      try {
        await sendVerificationEmail(parsed.data.email, token);
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
      }

      return res.status(200).json({ status: "pending_verification" });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      if (!user.emailVerified) {
        return res.status(403).json({ code: "EMAIL_NOT_VERIFIED", message: "Please verify your email before signing in." });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...safeUser } = user;
        return res.json(safeUser);
      });
    })(req, res, next);
  });

  app.get("/api/verify-email", async (req, res, next) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "This link has expired or is invalid." });
      }

      if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
        return res.status(400).json({ message: "This link has expired or is invalid." });
      }

      await storage.updateEmailVerification(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      const freshUser = await storage.getUser(user.id);
      if (!freshUser) {
        return res.status(500).json({ message: "User not found after verification" });
      }

      req.login(freshUser, (err) => {
        if (err) return next(err);
        const { password: _, ...safeUser } = freshUser;
        return res.json(safeUser);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/resend-verification", async (req, res, next) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(200).json({ message: "If that email exists, a verification link has been sent." });
      }

      if (user.emailVerified) {
        return res.status(200).json({ message: "Email is already verified." });
      }

      if (user.emailVerificationExpires) {
        const tokenAge = 24 * 60 * 60 * 1000 - (user.emailVerificationExpires.getTime() - Date.now());
        if (tokenAge < 60 * 1000) {
          return res.status(429).json({ message: "Please wait before requesting another verification email." });
        }
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.updateEmailVerification(user.id, {
        emailVerificationToken: token,
        emailVerificationExpires: expires,
      });

      try {
        await sendVerificationEmail(email, token);
      } catch (emailErr) {
        console.error("Failed to resend verification email:", emailErr);
      }

      return res.status(200).json({ message: "Verification email sent." });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password: _, ...safeUser } = req.user;
    res.json(safeUser);
  });

  app.patch("/api/user", async (req, res, next) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      }
      const userId = req.user.id;
      const updated = await storage.updateUser(userId, parsed.data);
      req.login(updated, (err) => {
        if (err) return next(err);
        const { password: _, ...safeUser } = updated;
        return res.json(safeUser);
      });
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/users/:id/role", requireRole(...CAN_MANAGE_ROLES), async (req, res, next) => {
    try {
      const parsed = updateRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid role", errors: parsed.error.flatten() });
      }
      const updated = await storage.updateUserRole(req.params.id as string, parsed.data.role);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...safeUser } = updated;
      return res.json(safeUser);
    } catch (err) {
      next(err);
    }
  });
}
