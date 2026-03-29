import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import type { Changelog } from "@shared/schema";
import {
  SiFacebook,
  SiInstagram,
  SiYoutube,
  SiTiktok,
  SiX,
  SiThreads,
  SiLinkedin,
  SiBluesky,
  SiSnapchat,
  SiPinterest,
  SiVimeo,
  SiGithub,
  SiDiscord,
  SiSoundcloud,
  SiSpotify,
  SiApplemusic,
  SiPatreon,
  SiTwitch,
} from "react-icons/si";
import type { PlatformSocialLink } from "@shared/schema";
import { SevcoLogo } from "@/components/sevco-logo";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";

type IconComponent = React.ComponentType<{ className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  SiFacebook,
  SiInstagram,
  SiYoutube,
  SiTiktok,
  SiX,
  SiThreads,
  SiLinkedin,
  SiBluesky,
  SiSnapchat,
  SiPinterest,
  SiVimeo,
  SiGithub,
  SiDiscord,
  SiSoundcloud,
  SiSpotify,
  SiApplemusic,
  SiPatreon,
  SiTwitch,
};

const STATIC_SOCIALS = [
  { label: "Facebook",  href: "https://www.facebook.com/sevelovesyou/",           iconName: "SiFacebook" },
  { label: "Instagram", href: "https://instagram.com/sevelovesyou",               iconName: "SiInstagram" },
  { label: "YouTube",   href: "https://www.youtube.com/@sevelovesyou",            iconName: "SiYoutube" },
  { label: "TikTok",    href: "https://www.tiktok.com/@sevelovesu",               iconName: "SiTiktok" },
  { label: "X",         href: "https://x.com/sevelovesu",                         iconName: "SiX" },
  { label: "Threads",   href: "https://www.threads.com/@sevelovesyou",            iconName: "SiThreads" },
  { label: "LinkedIn",  href: "https://www.linkedin.com/company/sev-co/",         iconName: "SiLinkedin" },
  { label: "Bluesky",   href: "https://bsky.app/profile/sevelovesyou.bsky.social",iconName: "SiBluesky" },
  { label: "Snapchat",  href: "https://www.snapchat.com/@sevelovesu",             iconName: "SiSnapchat" },
  { label: "Pinterest", href: "https://pin.it/2iQOE7UYW",                         iconName: "SiPinterest" },
  { label: "Vimeo",     href: "https://vimeo.com/sevelovesyou",                   iconName: "SiVimeo" },
  { label: "GitHub",    href: "https://github.com/sevelovesyou",                  iconName: "SiGithub" },
];

const POLICY_LINKS = [
  { label: "Privacy Policy",   path: "/wiki/privacy-policy" },
  { label: "Terms of Service", path: "/wiki/terms-of-service" },
  { label: "Refund Policy",    path: "/wiki/refund-policy" },
  { label: "Contact",          path: "/contact" },
];

function SocialIcon({ iconName, label, href }: { iconName: string; label: string; href: string }) {
  const Icon = ICON_MAP[iconName];
  if (!Icon) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="text-muted-foreground hover:text-foreground transition-colors"
      data-testid={`link-social-${label.toLowerCase()}`}
    >
      <Icon className="h-5 w-5" />
    </a>
  );
}

type SitemapLink = { label: string; path: string; external?: boolean };
type SitemapColumn = { heading: string; links: SitemapLink[] };

export function PlatformFooter() {
  const { user } = useAuth();

  const [liveDateTime, setLiveDateTime] = useState(() => {
    const now = new Date();
    return `${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  });

  useEffect(() => {
    function update() {
      const now = new Date();
      setLiveDateTime(`${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`);
    }
    const id = setInterval(update, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const { data: socialLinks } = useQuery<PlatformSocialLink[]>({
    queryKey: ["/api/social-links"],
  });

  const { data: latestChangelog } = useQuery<Changelog | null>({
    queryKey: ["/api/changelog/latest"],
  });

  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const footerTagline = settings["footer.tagline"] || "The creative platform for the SEVCO universe.";
  const footerVersion = settings["footer.version"] || latestChangelog?.version || null;

  const footerSocials = socialLinks
    ? socialLinks.filter((l) => l.showInFooter)
    : STATIC_SOCIALS.map((s, i) => ({ ...s, id: i, showInFooter: true, showOnContact: false, displayOrder: i, url: s.href }));

  const communityLinks: SitemapLink[] = [
    { label: "Discord", path: "https://discord.gg/sevco", external: true },
    { label: "Contact", path: "/contact" },
    ...(user ? [{ label: "Profile", path: `/profile/${user.username}` }] : []),
  ];

  const STATIC_SITEMAP_COLUMNS: SitemapColumn[] = [
    {
      heading: "Platform",
      links: [
        { label: "Home",      path: "/" },
        { label: "Wiki",      path: "/wiki" },
        { label: "Feed",      path: "/feed" },
        { label: "Changelog",        path: "/changelog" },
        { label: "Platform Updates", path: "/platform" },
        { label: "About",            path: "/about" },
      ],
    },
    {
      heading: "Music",
      links: [
        { label: "RECORDS",      path: "/music" },
        { label: "Listen",       path: "/listen" },
        { label: "Artists",      path: "/music/artists" },
        { label: "Submit Music", path: "/music/submit" },
      ],
    },
    {
      heading: "Commerce",
      links: [
        { label: "Store",    path: "/store" },
        { label: "Services", path: "/services" },
        { label: "Hosting",  path: "/domains" },
        { label: "Jobs",     path: "/jobs" },
      ],
    },
    {
      heading: "Community",
      links: communityLinks,
    },
    {
      heading: "Legal & Info",
      links: [
        { label: "Privacy Policy",   path: "/wiki/privacy-policy" },
        { label: "Terms of Service", path: "/wiki/terms-of-service" },
        { label: "Refund Policy",    path: "/wiki/refund-policy" },
      ],
    },
  ];

  let SITEMAP_COLUMNS: SitemapColumn[] = STATIC_SITEMAP_COLUMNS;
  if (settings["footer.sitemap"]) {
    try {
      const parsed = JSON.parse(settings["footer.sitemap"]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        SITEMAP_COLUMNS = parsed;
      }
    } catch {}
  }

  return (
    <footer
      className="border-t bg-background text-foreground mt-auto overflow-x-hidden"
      data-testid="platform-footer"
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-10">
          <div className="md:col-span-1 flex flex-col gap-3" data-testid="footer-brand">
            <div className="flex items-center gap-2">
              <div data-testid="img-footer-planet">
                <SevcoLogo size={32} />
              </div>
              <img
                src={wordmarkBlack}
                alt="SEVCO"
                className="h-5 w-auto object-contain dark:invert"
                data-testid="img-footer-logo"
              />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-footer-tagline">
              {footerTagline}
            </p>
          </div>

          <div className="md:col-span-2 lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6" data-testid="footer-sitemap">
            {SITEMAP_COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {col.heading}
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {col.links.map((item) => (
                    <li key={item.path}>
                      {item.external ? (
                        <a
                          href={item.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          data-testid={`link-footer-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          href={item.path}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          data-testid={`link-footer-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t" data-testid="footer-socials">
          <div className="flex flex-wrap gap-3">
            {footerSocials.map((social) => (
              <SocialIcon
                key={social.id ?? social.label ?? social.platform}
                iconName={social.iconName}
                label={(social as any).label ?? social.platform}
                href={(social as any).href ?? social.url}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground" data-testid="text-footer-copyright">
              &copy; 2026 SEVCO. All rights reserved.
            </p>
            {footerVersion && (
              <Link
                href="/changelog"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="text-footer-version"
              >
                v{footerVersion} &mdash; {liveDateTime}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {POLICY_LINKS.map(({ label, path }) => (
              <Link
                key={label}
                href={path}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-policy-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
