/**
 * One-time migration: create Stripe products + prices for existing spark packs
 * that have no Stripe IDs, using the production Stripe connection.
 *
 * Run with: npx tsx server/scripts/sync-spark-packs-stripe.ts
 */

import { Pool } from "pg";
import Stripe from "stripe";

async function fetchStripeCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Missing REPLIT_CONNECTORS_HOSTNAME or token");
  }

  // Try production first, fall back to development
  for (const env of ["production", "development"]) {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set("include_secrets", "true");
    url.searchParams.set("connector_names", "stripe");
    url.searchParams.set("environment", env);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    });
    const data = await res.json();
    const conn = data.items?.[0];
    if (conn?.settings?.secret) {
      console.log(`[stripe] Using ${env} credentials`);
      return conn.settings.secret as string;
    }
  }
  throw new Error("No Stripe connection found");
}

async function main() {
  const secretKey = await fetchStripeCredentials();
  const stripe = new Stripe(secretKey, { apiVersion: "2025-08-27.basil" as any });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: packs } = await pool.query(
    "SELECT id, name, sparks, price, stripe_product_id FROM spark_packs WHERE active = true ORDER BY sort_order"
  );

  console.log(`Found ${packs.length} active packs`);

  for (const pack of packs) {
    if (pack.stripe_product_id) {
      console.log(`[${pack.name}] Already has Stripe product — skipping`);
      continue;
    }

    console.log(`[${pack.name}] Creating Stripe product + prices...`);

    const product = await stripe.products.create({
      name: pack.name,
      metadata: { type: "spark_pack", sparks: String(pack.sparks) },
    });

    const oneTimePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.price,
      currency: "usd",
    });

    const recurringPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.price,
      currency: "usd",
      recurring: { interval: "month" },
    });

    await pool.query(
      `UPDATE spark_packs
       SET stripe_product_id = $1, stripe_price_id = $2, stripe_recurring_price_id = $3
       WHERE id = $4`,
      [product.id, oneTimePrice.id, recurringPrice.id, pack.id]
    );

    console.log(
      `[${pack.name}] ✓  product=${product.id}  one-time=${oneTimePrice.id}  recurring=${recurringPrice.id}`
    );
  }

  await pool.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
