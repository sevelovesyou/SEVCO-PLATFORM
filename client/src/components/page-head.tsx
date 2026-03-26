import { useEffect } from "react";

interface PageHeadProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = "SEVCO";
const BASE_URL = "https://sevco.us";
const DEFAULT_OG_IMAGE = "/favicon.jpg";
const JSON_LD_SCRIPT_ID = "page-head-json-ld";
const CANONICAL_LINK_ID = "page-head-canonical";

export function PageHead({
  title,
  description,
  ogImage,
  ogType = "website",
  ogUrl,
  noIndex = false,
  jsonLd,
}: PageHeadProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const resolvedOgImage = ogImage || DEFAULT_OG_IMAGE;
  const resolvedOgUrl = ogUrl || (typeof window !== "undefined" ? window.location.href : BASE_URL);

  useEffect(() => {
    document.title = fullTitle;

    function setMeta(selector: string, attr: string, value: string) {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        const parts = selector.match(/\[([^=]+)="([^"]+)"\]/);
        if (parts) el.setAttribute(parts[1], parts[2]);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    }

    if (description) {
      setMeta('meta[name="description"]', "content", description);
      setMeta('meta[property="og:description"]', "content", description);
      setMeta('meta[name="twitter:description"]', "content", description);
    }

    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[property="og:type"]', "content", ogType);
    setMeta('meta[property="og:url"]', "content", resolvedOgUrl);

    if (resolvedOgImage) {
      setMeta('meta[property="og:image"]', "content", resolvedOgImage);
      setMeta('meta[name="twitter:image"]', "content", resolvedOgImage);
    }

    setMeta('meta[name="robots"]', "content", noIndex ? "noindex,nofollow" : "index,follow");

    let canonicalEl = document.getElementById(CANONICAL_LINK_ID) as HTMLLinkElement | null;
    if (!canonicalEl) {
      const existing = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (existing) {
        existing.id = CANONICAL_LINK_ID;
        canonicalEl = existing;
      } else {
        canonicalEl = document.createElement("link");
        canonicalEl.id = CANONICAL_LINK_ID;
        canonicalEl.rel = "canonical";
        document.head.appendChild(canonicalEl);
      }
    }
    canonicalEl.href = resolvedOgUrl;

    let jsonLdEl = document.getElementById(JSON_LD_SCRIPT_ID) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!jsonLdEl) {
        jsonLdEl = document.createElement("script");
        jsonLdEl.id = JSON_LD_SCRIPT_ID;
        jsonLdEl.type = "application/ld+json";
        document.head.appendChild(jsonLdEl);
      }
      jsonLdEl.textContent = JSON.stringify(jsonLd);
    } else if (jsonLdEl) {
      jsonLdEl.remove();
    }

    return () => {
      document.title = "SEVCO Platform";
      setMeta('meta[name="robots"]', "content", "index,follow");
      const el = document.getElementById(JSON_LD_SCRIPT_ID);
      if (el) el.remove();
      const canonical = document.getElementById(CANONICAL_LINK_ID) as HTMLLinkElement | null;
      if (canonical) canonical.href = BASE_URL;
    };
  }, [fullTitle, description, resolvedOgImage, ogType, resolvedOgUrl, noIndex, jsonLd]);

  return null;
}
