import { PageHead } from "@/components/page-head";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Send, Music, ExternalLink } from "lucide-react";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";
import planetIcon from "@assets/SEVCO_planet_icon_black_1774331331137.png";
import * as SI from "react-icons/si";
import type { PlatformSocialLink } from "@shared/schema";

const STREAMING_ICON_NAMES = new Set([
  "SiSpotify", "SiApplemusic", "SiSoundcloud", "SiYoutubemusic", "SiDeezer", "SiTidal", "SiAmazonmusic",
]);

const BRAND_COLORS: Record<string, { hover: string; icon: string }> = {
  SiSpotify:      { hover: "hover:border-[#1DB954]/40 hover:bg-[#1DB954]/5", icon: "text-[#1DB954]" },
  SiApplemusic:   { hover: "hover:border-[#FC3C44]/40 hover:bg-[#FC3C44]/5", icon: "text-[#FC3C44]" },
  SiSoundcloud:   { hover: "hover:border-[#FF5500]/40 hover:bg-[#FF5500]/5", icon: "text-[#FF5500]" },
  SiYoutubemusic: { hover: "hover:border-[#FF0000]/40 hover:bg-[#FF0000]/5", icon: "text-[#FF0000]" },
  SiDeezer:       { hover: "hover:border-[#FF0092]/40 hover:bg-[#FF0092]/5", icon: "text-[#FF0092]" },
  SiTidal:        { hover: "hover:border-foreground/20 hover:bg-muted/30",    icon: "text-foreground" },
  SiAmazonmusic:  { hover: "hover:border-[#00A8E1]/40 hover:bg-[#00A8E1]/5", icon: "text-[#00A8E1]" },
};

function getIcon(iconName: string): React.ComponentType<{ className?: string }> | null {
  const icon = (SI as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  return icon || null;
}

export default function MusicListenPage() {
  const { data: allLinks = [], isLoading } = useQuery<PlatformSocialLink[]>({
    queryKey: ["/api/social-links"],
  });

  const listenLinks = allLinks.filter((l) => l.showOnListen);
  const streamingLinks = listenLinks.filter((l) => STREAMING_ICON_NAMES.has(l.iconName));
  const socialLinks = listenLinks.filter((l) => !STREAMING_ICON_NAMES.has(l.iconName));

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <PageHead
        title="Listen to SEVCO Records"
        description="Stream SEVCO Records on Spotify, Apple Music, and all major platforms. Follow us for new music and playlist updates."
        ogUrl="https://sevco.us/listen"
      />
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="h-20 w-20 rounded-full bg-violet-500/10 flex items-center justify-center mb-5">
            <img src={planetIcon} alt="SEVCO Planet" className="h-12 w-12 object-contain dark:invert" />
          </div>
          <img src={wordmarkBlack} alt="SEVCO" className="h-7 object-contain dark:invert mb-2" />
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">RECORDS</p>
        </div>

        {/* Streaming buttons */}
        {isLoading ? (
          <div className="space-y-3 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px] w-full rounded-2xl" />
            ))}
          </div>
        ) : streamingLinks.length > 0 ? (
          <div className="space-y-3 mb-8">
            {streamingLinks.map((link) => {
              const Icon = getIcon(link.iconName);
              const colors = BRAND_COLORS[link.iconName] || { hover: "hover:border-foreground/20 hover:bg-muted/30", icon: "text-muted-foreground" };
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 w-full px-5 py-4 border rounded-2xl transition-all cursor-pointer group ${colors.hover}`}
                  data-testid={`link-stream-${link.platform.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {Icon && <Icon className={`h-6 w-6 shrink-0 ${colors.icon}`} />}
                  <span className="font-semibold text-sm flex-1">{link.platform}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
              );
            })}
          </div>
        ) : null}

        {/* Secondary links */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link href="/music/artists">
            <Button variant="outline" className="w-full gap-2 text-xs" size="sm" data-testid="link-all-artists">
              <Users className="h-3.5 w-3.5" />
              View Artists
            </Button>
          </Link>
          <Link href="/music/submit">
            <Button variant="outline" className="w-full gap-2 text-xs" size="sm" data-testid="link-submit-music">
              <Send className="h-3.5 w-3.5" />
              Submit Music
            </Button>
          </Link>
        </div>

        {/* Social links */}
        {socialLinks.length > 0 && (
          <div className="flex items-center justify-center gap-4 mb-8">
            {socialLinks.map((link) => {
              const Icon = getIcon(link.iconName);
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 flex items-center justify-center rounded-full border hover:border-foreground/30 hover:bg-muted/50 transition-all"
                  aria-label={link.platform}
                  data-testid={`link-social-${link.platform.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                </a>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center space-y-1">
          <Link href="/music">
            <p className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 cursor-pointer" data-testid="link-music-home">
              <Music className="h-3 w-3" />
              SEVCO RECORDS
            </p>
          </Link>
          <p className="text-[10px] text-muted-foreground/60">sevco.us</p>
        </div>
      </div>
    </div>
  );
}
