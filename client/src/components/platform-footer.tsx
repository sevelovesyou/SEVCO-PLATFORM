import { Link } from "wouter";
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
} from "react-icons/si";
import planetIcon from "@assets/SEVCO_planet_icon_black_1774331331137.png";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";

const SITEMAP = [
  { label: "Home",      path: "/" },
  { label: "Wiki",      path: "/wiki" },
  { label: "Music",     path: "/music" },
  { label: "Store",     path: "/store" },
  { label: "Projects",  path: "/projects" },
  { label: "Command", path: "/command" },
];

const SOCIALS = [
  { label: "Facebook",  href: "https://www.facebook.com/sevelovesyou/",                  Icon: SiFacebook },
  { label: "Instagram", href: "https://instagram.com/sevelovesyou",                      Icon: SiInstagram },
  { label: "YouTube",   href: "https://www.youtube.com/@sevelovesyou",                   Icon: SiYoutube },
  { label: "TikTok",    href: "https://www.tiktok.com/@sevelovesu",                      Icon: SiTiktok },
  { label: "X",         href: "https://x.com/sevelovesu",                                Icon: SiX },
  { label: "Threads",   href: "https://www.threads.com/@sevelovesyou",                   Icon: SiThreads },
  { label: "LinkedIn",  href: "https://www.linkedin.com/company/sev-co/",                Icon: SiLinkedin },
  { label: "Bluesky",   href: "https://bsky.app/profile/sevelovesyou.bsky.social",       Icon: SiBluesky },
  { label: "Snapchat",  href: "https://www.snapchat.com/@sevelovesu",                    Icon: SiSnapchat },
  { label: "Pinterest", href: "https://pin.it/2iQOE7UYW",                                Icon: SiPinterest },
  { label: "Vimeo",     href: "https://vimeo.com/sevelovesyou",                          Icon: SiVimeo },
  { label: "GitHub",    href: "https://github.com/sevelovesyou",                         Icon: SiGithub },
];

const POLICY_LINKS = [
  { label: "Privacy Policy",   path: "/wiki/privacy-policy" },
  { label: "Terms of Service", path: "/wiki/terms-of-service" },
  { label: "Contact",          path: "/wiki/contact" },
  { label: "Refund Policy",    path: "/wiki/refund-policy" },
];

export function PlatformFooter() {
  const { role } = usePermission();
  const canSeeCommand = role === "admin" || role === "executive" || role === "staff";
  const visibleSitemap = SITEMAP.filter((item) => item.path !== "/command" || canSeeCommand);

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
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-social-${label.toLowerCase()}`}
              >
                <Icon className="h-5 w-5" />
              </a>
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
