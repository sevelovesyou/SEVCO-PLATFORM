import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface PageHeadProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
  slug?: string;
  keywords?: string;
  articleMeta?: {
    publishedTime?: string;
    modifiedTime?: string;
    tags?: string[];
  };
}

const SITE_NAME = "SEVCO";
const BASE_URL = "https://sevco.us";
const DEFAULT_OG_IMAGE = "/favicon.jpg";
const JSON_LD_SCRIPT_ID = "page-head-json-ld";
const GEO_JSON_LD_SCRIPT_ID = "page-head-geo-json-ld";
const CANONICAL_LINK_ID = "page-head-canonical";

export function PageHead({
  title,
  description,
  ogImage,
  ogType = "website",
  ogUrl,
  noIndex = false,
  jsonLd,
  slug,
  keywords,
  articleMeta,
}: PageHeadProps) {
  const { data: platformSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
    staleTime: 5 * 60 * 1000,
  });

  const seo = slug && platformSettings
    ? {
        title: platformSettings[`seo.page.${slug}.title`] || undefined,
        description: platformSettings[`seo.page.${slug}.description`] || undefined,
        ogImage: platformSettings[`seo.page.${slug}.ogImage`] || undefined,
        keywords: platformSettings[`seo.page.${slug}.keywords`] || undefined,
        noIndex: platformSettings[`seo.page.${slug}.noIndex`] === undefined
          ? undefined
          : platformSettings[`seo.page.${slug}.noIndex`] === "true",
        jsonLd: (() => {
          const raw = platformSettings[`seo.page.${slug}.jsonLd`];
          if (!raw) return undefined;
          try { return JSON.parse(raw) as Record<string, unknown>; } catch { return undefined; }
        })(),
      }
    : null;

  const resolvedTitle = seo?.title || title;
  const resolvedDescription = seo?.description || description;
  const resolvedOgImage = seo?.ogImage || ogImage || DEFAULT_OG_IMAGE;
  const resolvedNoIndex = seo?.noIndex ?? noIndex;
  const resolvedJsonLd = seo?.jsonLd || jsonLd;
  const resolvedKeywords = seo?.keywords || keywords;

  const fullTitle = resolvedTitle.includes(SITE_NAME) ? resolvedTitle : `${resolvedTitle} | ${SITE_NAME}`;
  const resolvedOgUrl = ogUrl || (typeof window !== "undefined" ? window.location.href : BASE_URL);

  const geoBrandVoice = platformSettings?.["seo.geo.brandVoice"];
  const geoKeyFacts = platformSettings?.["seo.geo.keyFacts"];

  const articlePublishedTime = articleMeta?.publishedTime;
  const articleModifiedTime = articleMeta?.modifiedTime;
  const articleTags = articleMeta?.tags;

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

    if (resolvedDescription) {
      setMeta('meta[name="description"]', "content", resolvedDescription);
      setMeta('meta[property="og:description"]', "content", resolvedDescription);
      setMeta('meta[name="twitter:description"]', "content", resolvedDescription);
    }

    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[property="og:type"]', "content", ogType);
    setMeta('meta[property="og:url"]', "content", resolvedOgUrl);

    if (resolvedOgImage) {
      setMeta('meta[property="og:image"]', "content", resolvedOgImage);
      setMeta('meta[name="twitter:image"]', "content", resolvedOgImage);
    }

    if (resolvedKeywords) {
      setMeta('meta[name="keywords"]', "content", resolvedKeywords);
    } else {
      const kwEl = document.querySelector('meta[name="keywords"]');
      if (kwEl) kwEl.remove();
    }

    setMeta('meta[name="robots"]', "content", resolvedNoIndex ? "noindex,nofollow" : "index,follow");

    // og:article:* tags
    if (articlePublishedTime) {
      setMeta('meta[property="og:article:published_time"]', "content", articlePublishedTime);
    } else {
      document.querySelector('meta[property="og:article:published_time"]')?.remove();
    }
    if (articleModifiedTime) {
      setMeta('meta[property="og:article:modified_time"]', "content", articleModifiedTime);
    } else {
      document.querySelector('meta[property="og:article:modified_time"]')?.remove();
    }
    // Remove old og:article:tag entries then re-add
    document.querySelectorAll('meta[property="og:article:tag"]').forEach((el) => el.remove());
    if (articleTags && articleTags.length > 0) {
      articleTags.forEach((tag) => {
        const el = document.createElement("meta");
        el.setAttribute("property", "og:article:tag");
        el.setAttribute("content", tag);
        document.head.appendChild(el);
      });
    }

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
    if (resolvedJsonLd) {
      if (!jsonLdEl) {
        jsonLdEl = document.createElement("script");
        jsonLdEl.id = JSON_LD_SCRIPT_ID;
        jsonLdEl.type = "application/ld+json";
        document.head.appendChild(jsonLdEl);
      }
      jsonLdEl.textContent = JSON.stringify(resolvedJsonLd);
    } else if (jsonLdEl) {
      jsonLdEl.remove();
    }

    // GEO: inject brand voice + key facts as JSON-LD on every page
    let geoEl = document.getElementById(GEO_JSON_LD_SCRIPT_ID) as HTMLScriptElement | null;
    if (geoBrandVoice || geoKeyFacts) {
      if (!geoEl) {
        geoEl = document.createElement("script");
        geoEl.id = GEO_JSON_LD_SCRIPT_ID;
        geoEl.type = "application/ld+json";
        document.head.appendChild(geoEl);
      }
      const geoData: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
      };
      if (geoBrandVoice) geoData["description"] = geoBrandVoice;
      if (geoKeyFacts) {
        geoData["additionalProperty"] = geoKeyFacts
          .split("\n")
          .map((f) => f.replace(/^[-*•]\s*/, "").trim())
          .filter(Boolean)
          .map((value) => ({ "@type": "PropertyValue", name: "keyFact", value }));
      }
      geoEl.textContent = JSON.stringify(geoData);
    } else if (geoEl) {
      geoEl.remove();
    }

    return () => {
      document.title = "SEVCO Platform";
      setMeta('meta[name="robots"]', "content", "index,follow");
      const kwEl = document.querySelector('meta[name="keywords"]');
      if (kwEl) kwEl.remove();
      const el = document.getElementById(JSON_LD_SCRIPT_ID);
      if (el) el.remove();
      const geoScript = document.getElementById(GEO_JSON_LD_SCRIPT_ID);
      if (geoScript) geoScript.remove();
      const canonical = document.getElementById(CANONICAL_LINK_ID) as HTMLLinkElement | null;
      if (canonical) canonical.href = BASE_URL;
      document.querySelector('meta[property="og:article:published_time"]')?.remove();
      document.querySelector('meta[property="og:article:modified_time"]')?.remove();
      document.querySelectorAll('meta[property="og:article:tag"]').forEach((e) => e.remove());
    };
  }, [fullTitle, resolvedDescription, resolvedOgImage, ogType, resolvedOgUrl, resolvedNoIndex, resolvedJsonLd, resolvedKeywords, geoBrandVoice, geoKeyFacts, articlePublishedTime, articleModifiedTime, articleTags]);

  return null;
}
