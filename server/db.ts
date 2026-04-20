import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dns from "dns";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse the connection URL to extract individual components
const dbUrl = new URL(process.env.DATABASE_URL);

// Create pool with explicit host config and IPv4-only lookup
export const pool = new Pool({
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password),
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || "5432", 10),
  database: dbUrl.pathname.slice(1), // remove leading /
  ssl: dbUrl.searchParams.get("sslmode") !== "disable" ? { rejectUnauthorized: false } : false,
  // Force IPv4 resolution to avoid ENETUNREACH errors in IPv6-incompatible environments
  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { ...options, family: 4 }, callback);
  }
});

export const db = drizzle(pool, { schema });
