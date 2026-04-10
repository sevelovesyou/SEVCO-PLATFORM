/**
 * SEVCO Sites — Cloudflare Worker
 *
 * Deploy this Worker to handle *.sev.cx requests. It fetches the published
 * site HTML from the SEVCO platform API and returns it to the visitor.
 * This bypasses the Replit wildcard SSL limitation entirely.
 *
 * SETUP INSTRUCTIONS
 * ──────────────────
 * 1. In Cloudflare dashboard → Workers & Pages → Create Worker
 * 2. Paste this script and deploy
 * 3. Go to the Worker → Settings → Triggers → Add Custom Domain: *.sev.cx
 *    (or add a route: *.sev.cx/*)
 * 4. Make sure the *.sev.cx DNS record exists (A record pointing anywhere —
 *    the Worker intercepts before the origin is contacted)
 * 5. Set SSL/TLS mode for sev.cx to "Full" — the Worker fetches from
 *    sevco.us which has a valid cert, so no SSL issues.
 *
 * That's it. Every slug.sev.cx request will be served by the Worker.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Extract slug from hostname: cx.sev.cx → "cx"
    const match = hostname.match(/^([a-z0-9-]+)\.sev\.cx$/i);
    if (!match) {
      return new Response("Not found", { status: 404 });
    }

    const slug = match[1];

    // Fetch rendered HTML from the SEVCO platform
    const renderUrl = `https://sevco.us/api/sites/render/${encodeURIComponent(slug)}`;

    let originResponse;
    try {
      originResponse = await fetch(renderUrl, {
        headers: {
          "User-Agent": "SEVCO-Sites-Worker/1.0",
          "Accept": "text/html",
        },
        cf: {
          // Cache at the Cloudflare edge for 60 seconds
          cacheTtl: 60,
          cacheEverything: true,
        },
      });
    } catch (err) {
      return new Response(
        `<!DOCTYPE html><html><head><title>Error</title></head><body>
          <h1>Could not load site</h1><p>The SEVCO platform could not be reached.</p>
        </body></html>`,
        { status: 502, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const html = await originResponse.text();

    return new Response(html, {
      status: originResponse.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        "X-Powered-By": "SEVCO Sites",
      },
    });
  },
};
