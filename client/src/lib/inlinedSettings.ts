export function getInlinedPlatformSettings(): Record<string, string> | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById("__PLATFORM_SETTINGS__");
  if (!el) return null;
  try {
    const parsed = JSON.parse(el.textContent || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : null;
  } catch {
    return null;
  }
}

export function getInlinedMeta(): { faviconUrl: string | null; ogImageUrl: string | null } | null {
  const snapshot = getInlinedPlatformSettings();
  if (!snapshot) return null;
  return {
    faviconUrl: snapshot["platform.faviconUrl"] || null,
    ogImageUrl: snapshot["platform.ogImageUrl"] || null,
  };
}
