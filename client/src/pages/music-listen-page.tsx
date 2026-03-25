import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SiSpotify, SiApplemusic, SiYoutubemusic, SiSoundcloud, SiInstagram, SiX, SiTiktok } from "react-icons/si";
import { Users, Send, Music, ExternalLink } from "lucide-react";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";
import planetIcon from "@assets/SEVCO_planet_icon_black_1774331331137.png";

const STREAMING_LINKS = [
  {
    icon: SiSpotify,
    label: "Spotify",
    href: import.meta.env.VITE_SPOTIFY_URL || "#",
    color: "hover:border-[#1DB954]/40 hover:bg-[#1DB954]/5",
    iconColor: "text-[#1DB954]",
  },
  {
    icon: SiApplemusic,
    label: "Apple Music",
    href: import.meta.env.VITE_APPLE_MUSIC_URL || "#",
    color: "hover:border-[#FC3C44]/40 hover:bg-[#FC3C44]/5",
    iconColor: "text-[#FC3C44]",
  },
  {
    icon: SiSoundcloud,
    label: "SoundCloud",
    href: import.meta.env.VITE_SOUNDCLOUD_URL || "#",
    color: "hover:border-[#FF5500]/40 hover:bg-[#FF5500]/5",
    iconColor: "text-[#FF5500]",
  },
  {
    icon: SiYoutubemusic,
    label: "YouTube Music",
    href: import.meta.env.VITE_YOUTUBE_URL || "#",
    color: "hover:border-[#FF0000]/40 hover:bg-[#FF0000]/5",
    iconColor: "text-[#FF0000]",
  },
];

const SOCIAL_LINKS = [
  { icon: SiInstagram, href: "https://instagram.com/sevelovesyou", label: "Instagram" },
  { icon: SiX, href: "https://x.com/sevelovesu", label: "X" },
  { icon: SiTiktok, href: "https://tiktok.com/@sevelovesu", label: "TikTok" },
];

export default function MusicListenPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
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
        <div className="space-y-3 mb-8">
          {STREAMING_LINKS.map(({ icon: Icon, label, href, color, iconColor }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-4 w-full px-5 py-4 border rounded-2xl transition-all cursor-pointer group ${color}`}
              data-testid={`link-stream-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className={`h-6 w-6 shrink-0 ${iconColor}`} />
              <span className="font-semibold text-sm flex-1">{label}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          ))}
        </div>

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
        <div className="flex items-center justify-center gap-4 mb-8">
          {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 w-9 flex items-center justify-center rounded-full border hover:border-foreground/30 hover:bg-muted/50 transition-all"
              aria-label={label}
              data-testid={`link-social-${label.toLowerCase()}`}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center space-y-1">
          <Link href="/music">
            <p className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 cursor-pointer" data-testid="link-music-home">
              <Music className="h-3 w-3" />
              SEVCO RECORDS
            </p>
          </Link>
          <p className="text-[10px] text-muted-foreground/60">sevelovesyou.com</p>
        </div>
      </div>
    </div>
  );
}
