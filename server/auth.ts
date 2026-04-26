import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import OAuth2Strategy from "passport-oauth2";
import { type Express, type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "./storage";
import { insertUserSchema, updateUserSchema, updateRoleSchema } from "@shared/schema";
import { requireRole, CAN_MANAGE_ROLES } from "./middleware/permissions";
import { pool } from "./db";
import { sendVerificationEmail } from "./emailClient";
import { isUsernameReserved } from "./usernameUtils";
import { notify } from "./routes";
import {
  getCanonicalDomain,
  getCanonicalCallbackUrl,
  getRequestOrigin,
  isCanonicalRequest,
  validateReturnTo,
  issueHandoffToken,
  verifyAndConsumeHandoffToken,
  issueLinkInitToken,
  verifyAndConsumeLinkInitToken,
} from "./x-oauth-handoff";

const PgSession = connectPgSimple(session);

function toSafeUser<T extends { password?: string | null }>(user: T): Omit<T, "password"> & { hasPassword: boolean } {
  const { password, ...rest } = user;
  return { ...rest, hasPassword: !!password } as Omit<T, "password"> & { hasPassword: boolean };
}

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
        if (!user.password) {
          return done(null, false, { message: "This account uses X sign-in. Please use the Sign in with X button." });
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

  const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
  const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

  type TwitterUserApiResponse = {
    data: {
      id: string;
      username: string;
      name: string;
      profile_image_url?: string;
    };
  };

  type XOAuthSessionExtras = {
    linkUserId?: string;
    xOAuthReturnTo?: string;
    xOAuthLinkReturnTo?: string;
  };

  if (TWITTER_CLIENT_ID && TWITTER_CLIENT_SECRET) {
    const twitterClientId = TWITTER_CLIENT_ID;
    const twitterClientSecret = TWITTER_CLIENT_SECRET;

    passport.use(
      "twitter-oauth2",
      new OAuth2Strategy(
        {
          authorizationURL: "https://twitter.com/i/oauth2/authorize",
          tokenURL: "https://api.twitter.com/2/oauth2/token",
          clientID: twitterClientId,
          clientSecret: twitterClientSecret,
          callbackURL: getCanonicalCallbackUrl("/api/auth/twitter/callback"),
          scope: ["tweet.read", "users.read", "offline.access"],
          customHeaders: {
            Authorization: `Basic ${Buffer.from(`${twitterClientId}:${twitterClientSecret}`).toString("base64")}`,
          },
          pkce: true,
          state: true,
        },
        async (accessToken: string, _refreshToken: string, _results: object, _profile: object, done: OAuth2Strategy.VerifyCallback) => {
          try {
            const resp = await fetch("https://api.twitter.com/2/users/me?user.fields=name,profile_image_url,username", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!resp.ok) {
              return done(new Error("Failed to fetch X user info"));
            }
            const json = (await resp.json()) as TwitterUserApiResponse;
            const xUser = json.data;

            let user = await storage.getUserByXId(xUser.id);
            if (!user) {
              const baseUsername = xUser.username.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 28) || "xuser";
              let username = baseUsername;
              let suffix = 1;
              while (await storage.getUserByUsername(username)) {
                username = `${baseUsername}${suffix++}`;
              }
              user = await storage.createOAuthUser({
                username,
                xId: xUser.id,
                displayName: xUser.name || username,
                avatarUrl: xUser.profile_image_url ?? null,
                email: null,
                emailVerified: true,
                role: "user",
              });
            }
            return done(null, user);
          } catch (err) {
            return done(err instanceof Error ? err : new Error(String(err)));
          }
        }
      )
    );

    // Sign-in initiation. On non-canonical domains, bounce the user over to the
    // canonical domain so X only ever needs one set of callback URLs registered.
    app.get(
      "/api/auth/twitter",
      (req: Request, res: Response, next: NextFunction) => {
        const canonical = getCanonicalDomain();
        const requestedReturnTo = typeof req.query.return_to === "string" ? req.query.return_to : "";
        const validated = validateReturnTo(requestedReturnTo);

        // Hard-reject any return_to that's present-but-invalid: send the user
        // back to the canonical domain with an explicit error so admins can
        // notice misconfigured clients, instead of silently signing them in
        // somewhere they didn't intend to land.
        if (requestedReturnTo && !validated) {
          console.warn(`[xoauth] Rejected return_to for sign-in: ${JSON.stringify(requestedReturnTo)} (origin=${getRequestOrigin(req)})`);
          return res.redirect(`${canonical}/auth?error=oauth_failed`);
        }

        const validatedReturnTo = validated ?? canonical;

        if (!isCanonicalRequest(req)) {
          const dest = `${canonical}/api/auth/twitter?return_to=${encodeURIComponent(validatedReturnTo)}`;
          return res.redirect(dest);
        }

        const typedSession = req.session as typeof req.session & XOAuthSessionExtras;
        typedSession.xOAuthReturnTo = validatedReturnTo;
        req.session.save((err) => {
          if (err) return next(err);
          passport.authenticate("twitter-oauth2")(req, res, next);
        });
      }
    );

    app.get(
      "/api/auth/twitter/callback",
      (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate("twitter-oauth2", (err: Error | null, user: Express.User | false) => {
          const typedSession = req.session as typeof req.session & XOAuthSessionExtras;
          const returnTo = (typedSession.xOAuthReturnTo as string | undefined) || getCanonicalDomain();
          delete typedSession.xOAuthReturnTo;

          if (err || !user) {
            const errorBase = returnTo === getCanonicalDomain() ? returnTo : returnTo;
            return res.redirect(`${errorBase}/auth?error=oauth_failed`);
          }

          if (returnTo === getCanonicalDomain()) {
            // Already on the originating domain: complete login locally
            // without an extra round-trip.
            req.login(user, (loginErr) => {
              if (loginErr) return next(loginErr);
              res.redirect("/");
            });
            return;
          }

          const token = issueHandoffToken({ userId: user.id, intent: "signin", status: "ok" });
          res.redirect(`${returnTo}/api/auth/twitter/complete?token=${encodeURIComponent(token)}`);
        })(req, res, next);
      }
    );

    // Receiving endpoint on the originating domain that finalises the sign-in
    // session for a user already authenticated on the canonical domain.
    app.get(
      "/api/auth/twitter/complete",
      async (req: Request, res: Response, next: NextFunction) => {
        const token = typeof req.query.token === "string" ? req.query.token : "";
        const payload = verifyAndConsumeHandoffToken(token, "signin");
        if (!payload) {
          return res.redirect("/auth?error=oauth_failed");
        }
        try {
          const user = await storage.getUser(payload.uid);
          if (!user) {
            return res.redirect("/auth?error=oauth_failed");
          }
          req.login(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            res.redirect("/");
          });
        } catch (e) {
          next(e);
        }
      }
    );

    passport.use(
      "twitter-link",
      new OAuth2Strategy(
        {
          authorizationURL: "https://twitter.com/i/oauth2/authorize",
          tokenURL: "https://api.twitter.com/2/oauth2/token",
          clientID: twitterClientId,
          clientSecret: twitterClientSecret,
          callbackURL: getCanonicalCallbackUrl("/api/auth/twitter/link/callback"),
          scope: ["tweet.read", "users.read", "offline.access"],
          customHeaders: {
            Authorization: `Basic ${Buffer.from(`${twitterClientId}:${twitterClientSecret}`).toString("base64")}`,
          },
          pkce: true,
          state: true,
          passReqToCallback: true,
        } as OAuth2Strategy.StrategyOptionsWithRequest,
        async (req: Express.Request, accessToken: string, _refreshToken: string, _results: object, _profile: object, done: OAuth2Strategy.VerifyCallback) => {
          try {
            const resp = await fetch("https://api.twitter.com/2/users/me?user.fields=name,profile_image_url,username", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!resp.ok) {
              return done(new Error("Failed to fetch X user info"));
            }
            const json = (await resp.json()) as TwitterUserApiResponse;
            const xUser = json.data;

            const session = req.session as typeof req.session & XOAuthSessionExtras;
            const userId: string | undefined = (session.linkUserId as string | undefined) || req.user?.id;
            if (!userId) {
              return done(new Error("No user session found"));
            }

            try {
              const updatedUser = await storage.linkUserXAccount(userId, xUser.id);
              return done(null, updatedUser);
            } catch (err) {
              if (err instanceof Error && err.message === "already_linked") {
                return done(new Error("already_linked"));
              }
              throw err;
            }
          } catch (err) {
            return done(err instanceof Error ? err : new Error(String(err)));
          }
        }
      )
    );

    // Link initiation. The originating domain knows which user is requesting
    // the link; the canonical domain is where the OAuth round-trip happens.
    // We bridge identity across domains via a short-lived signed init token.
    app.get(
      "/api/auth/twitter/link",
      (req: Request, res: Response, next: NextFunction) => {
        const canonical = getCanonicalDomain();
        const requestedReturnTo = typeof req.query.return_to === "string" ? req.query.return_to : "";

        if (!isCanonicalRequest(req)) {
          if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ message: "Not authenticated" });
          }
          const validated = validateReturnTo(requestedReturnTo);
          // Hard-reject invalid return_to instead of silently overwriting it.
          if (requestedReturnTo && !validated) {
            console.warn(`[xoauth] Rejected return_to for link: ${JSON.stringify(requestedReturnTo)} (origin=${getRequestOrigin(req)})`);
            return res.redirect(`${canonical}/account?error=oauth_failed`);
          }
          // Per spec: absent or invalid return_to defaults to canonical.
          const validatedReturnTo = validated ?? canonical;
          const initToken = issueLinkInitToken({ userId: req.user.id, returnTo: validatedReturnTo });
          return res.redirect(`${canonical}/api/auth/twitter/link?init=${encodeURIComponent(initToken)}`);
        }

        // We're on canonical. Resolve userId + returnTo from either an init
        // token (cross-domain) or the local session (same-domain).
        const initTokenStr = typeof req.query.init === "string" ? req.query.init : "";
        let userId: string | undefined;
        let returnTo: string = canonical;

        if (initTokenStr) {
          const initPayload = verifyAndConsumeLinkInitToken(initTokenStr);
          if (!initPayload) {
            return res.redirect(`${canonical}/account?error=oauth_failed`);
          }
          userId = initPayload.uid;
          returnTo = initPayload.rt;
        } else if (req.isAuthenticated() && req.user) {
          userId = req.user.id;
          const validated = validateReturnTo(requestedReturnTo);
          // Same hard-reject policy on canonical's same-domain entry path.
          if (requestedReturnTo && !validated) {
            console.warn(`[xoauth] Rejected return_to for canonical link: ${JSON.stringify(requestedReturnTo)}`);
            return res.redirect(`${canonical}/account?error=oauth_failed`);
          }
          returnTo = validated ?? canonical;
        } else {
          return res.status(401).json({ message: "Not authenticated" });
        }

        const typedSession = req.session as typeof req.session & XOAuthSessionExtras;
        typedSession.linkUserId = userId;
        typedSession.xOAuthLinkReturnTo = returnTo;
        req.session.save((err) => {
          if (err) return next(err);
          passport.authenticate("twitter-link")(req, res, next);
        });
      }
    );

    app.get(
      "/api/auth/twitter/link/callback",
      (req: Request, res: Response, next: NextFunction) => {
        const canonical = getCanonicalDomain();
        passport.authenticate("twitter-link", (err: Error | null, user: Express.User | false) => {
          const typedSession = req.session as typeof req.session & XOAuthSessionExtras;
          const userId = typedSession.linkUserId as string | undefined;
          const returnTo = (typedSession.xOAuthLinkReturnTo as string | undefined) || canonical;
          delete typedSession.linkUserId;
          delete typedSession.xOAuthLinkReturnTo;

          const sendError = (errorCode: "already_linked" | "oauth_failed") => {
            if (returnTo === canonical) {
              return res.redirect(`/account?error=${errorCode}`);
            }
            if (userId) {
              const token = issueHandoffToken({ userId, intent: "link", status: errorCode });
              return res.redirect(`${returnTo}/api/auth/twitter/link/complete?token=${encodeURIComponent(token)}`);
            }
            return res.redirect(`${returnTo}/account?error=${errorCode}`);
          };

          if (err) {
            if (err.message === "already_linked") return sendError("already_linked");
            return sendError("oauth_failed");
          }
          if (!user) return sendError("oauth_failed");

          if (returnTo === canonical) {
            return req.login(user, (loginErr) => {
              if (loginErr) return next(loginErr);
              res.redirect("/account?linked=1");
            });
          }

          const token = issueHandoffToken({ userId: user.id, intent: "link", status: "ok" });
          res.redirect(`${returnTo}/api/auth/twitter/link/complete?token=${encodeURIComponent(token)}`);
        })(req, res, next);
      }
    );

    // Receiving endpoint on the originating domain that finalises the link
    // and creates a fresh session reflecting the newly linked X account.
    app.get(
      "/api/auth/twitter/link/complete",
      async (req: Request, res: Response, next: NextFunction) => {
        const token = typeof req.query.token === "string" ? req.query.token : "";
        const payload = verifyAndConsumeHandoffToken(token, "link");
        if (!payload) {
          return res.redirect("/account?error=oauth_failed");
        }
        if (payload.status === "already_linked") {
          return res.redirect("/account?error=already_linked");
        }
        if (payload.status !== "ok") {
          return res.redirect("/account?error=oauth_failed");
        }
        try {
          const user = await storage.getUser(payload.uid);
          if (!user) {
            return res.redirect("/account?error=oauth_failed");
          }
          req.login(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            res.redirect("/account?linked=1");
          });
        } catch (e) {
          next(e);
        }
      }
    );

  } else {
    app.get("/api/auth/twitter", (_req, res) => {
      res.status(503).json({ message: "X OAuth is not configured. Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET." });
    });
    app.get("/api/auth/twitter/callback", (_req, res) => {
      res.redirect("/auth?error=oauth_not_configured");
    });
    app.get("/api/auth/twitter/complete", (_req, res) => {
      res.redirect("/auth?error=oauth_not_configured");
    });
    app.get("/api/auth/twitter/link", (_req, res) => {
      res.status(503).json({ message: "X OAuth is not configured. Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET." });
    });
    app.get("/api/auth/twitter/link/callback", (_req, res) => {
      res.redirect("/account?error=oauth_not_configured");
    });
    app.get("/api/auth/twitter/link/complete", (_req, res) => {
      res.redirect("/account?error=oauth_not_configured");
    });
  }

  app.post(
    "/api/auth/twitter/disconnect",
    (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (!req.user.password) {
        return res.status(400).json({ message: "Cannot disconnect X — it is your only login method" });
      }
      next();
    },
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const updated = await storage.unlinkUserXAccount(req.user!.id);
        req.login(updated, (err) => {
          if (err) return next(err);
          res.json({ success: true });
        });
      } catch (err) {
        next(err);
      }
    }
  );

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

      if (await isUsernameReserved(parsed.data.username)) {
        return res.status(400).json({ message: "This username is reserved." });
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

      storage.getUsersByRole(["admin", "executive", "staff"]).then((staffUsers) => {
        for (const staffUser of staffUsers) {
          notify(staffUser.id, "new_member", "New member joined", `${parsed.data.username} has registered.`, "/command/members").catch(() => {});
        }
      }).catch(() => {});

      let emailSent = false;
      let emailError: string | null = null;
      try {
        await sendVerificationEmail(parsed.data.email, token);
        emailSent = true;
      } catch (emailErr: any) {
        const rawError = emailErr?.message ?? "Unknown error sending verification email";
        console.error("[auth] Failed to send verification email:", rawError);
        emailError = rawError.includes("API key")
          ? "Email service is not configured. Please contact support."
          : rawError.includes("domain") || rawError.includes("Domain")
          ? "Email domain not verified. Please contact support."
          : "Email delivery failed. Please use the resend button to retry.";
      }

      return res.status(200).json({ status: "pending_verification", emailSent, emailError });
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
        return res.json(toSafeUser(user));
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
        return res.json(toSafeUser(freshUser));
      });
    } catch (err) {
      next(err);
    }
  });

  async function handleResendVerification(req: any, res: any, next: any) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(200).json({ message: "If that email exists, a verification link has been sent.", emailSent: true });
      }

      if (user.emailVerified) {
        return res.status(200).json({ message: "Email is already verified.", emailSent: false });
      }

      if (user.emailVerificationExpires) {
        const expiresMs = user.emailVerificationExpires instanceof Date
          ? user.emailVerificationExpires.getTime()
          : new Date(user.emailVerificationExpires).getTime();
        const issuedAtMs = expiresMs - 24 * 60 * 60 * 1000;
        const secondsSinceIssued = (Date.now() - issuedAtMs) / 1000;
        if (secondsSinceIssued < 60) {
          return res.status(429).json({
            message: `Please wait ${Math.ceil(60 - secondsSinceIssued)} second(s) before requesting another verification email.`,
          });
        }
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.updateEmailVerification(user.id, {
        emailVerificationToken: token,
        emailVerificationExpires: expires,
      });

      let emailSent = false;
      try {
        await sendVerificationEmail(email, token);
        emailSent = true;
      } catch (emailErr) {
        console.error("Failed to resend verification email:", emailErr);
      }

      return res.status(200).json({ message: emailSent ? "Verification email sent." : "Could not send verification email. Please contact support.", emailSent });
    } catch (err) {
      next(err);
    }
  }

  app.post("/api/resend-verification", handleResendVerification);
  app.post("/api/auth/resend-verification", handleResendVerification);

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
    res.json(toSafeUser(req.user));
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
        return res.json(toSafeUser(updated));
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
