import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePermission } from "@/hooks/use-permission";
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
import planetIcon from "@assets/SEVCO_planet_icon_black_1774331331137.png";
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

const SITEMAP = [
  { label: "Home",       path: "/" },
  { label: "Wiki",       path: "/wiki" },
  { label: "Feed",       path: "/feed" },
  { label: "Changelog",  path: "/changelog" },
  { label: "Music",      path: "/music" },
  { label: "Store",      path: "/store" },
  { label: "Projects",   path: "/projects" },
  { label: "Command",    path: "/command" },
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

export function PlatformFooter() {
  const { role } = usePermission();
  const canSeeCommand = role === "admin" || role === "executive" || role === "staff";
  const visibleSitemap = SITEMAP.filter((item) => item.path !== "/command" || canSeeCommand);

  const { data: socialLinks } = useQuery<PlatformSocialLink[]>({
    queryKey: ["/api/social-links"],
  });

  const footerSocials = socialLinks
    ? socialLinks.filter((l) => l.showInFooter)
    : STATIC_SOCIALS.map((s, i) => ({ ...s, id: i, showInFooter: true, showOnContact: false, displayOrder: i, url: s.href }));

  return (
    <footer
      className="border-t bg-background text-foreground mt-auto"
      data-testid="platform-footer"
    >
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="flex flex-col gap-3" data-testid="footer-brand">
          <div className="flex items-center gap-2">
            <img
              src={planetIcon}
              alt="SEVCO Planet"
              className="h-8 w-8 object-contain dark:invert"
              data-testid="img-footer-planet"
            />
            <img
              src={wordmarkBlack}
              alt="SEVCO"
              className="h-5 w-auto object-contain dark:invert"
              data-testid="img-footer-logo"
            />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The creative platform for the SEVCO universe.
          </p>
        </div>

        <div data-testid="footer-sitemap">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Platform
          </h3>
          <ul className="flex flex-col gap-1.5">
            {visibleSitemap.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`link-footer-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div data-testid="footer-socials">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Follow Us
          </h3>
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
          <p className="text-xs text-muted-foreground" data-testid="text-footer-copyright">
            &copy; 2026 SEVCO. All rights reserved.
          </p>
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
