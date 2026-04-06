import { PageHead } from "@/components/page-head";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Send, Music, ExternalLink, Play, Headphones, Download } from "lucide-react";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";
import { SevcoLogo } from "@/components/sevco-logo";
import * as SI from "react-icons/si";
import type { PlatformSocialLink, MusicTrack } from "@shared/schema";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { resolveImageUrl } from "@/lib/resolve-image-url";

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

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TrackCard({ track, allTracks }: { track: MusicTrack; allTracks: MusicTrack[] }) {
  const { playTrack } = useMusicPlayer();

  function handlePlay() {
    const queueTracks = allTracks.filter((t) => t.id !== track.id);
    playTrack(track, queueTracks);
  }

  return (
    <div
      className="group relative flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-all"
      data-testid={`card-track-${track.id}`}
    >
      <div className="relative shrink-0">
        {track.coverImageUrl ? (
          <img
            src={resolveImageUrl(track.coverImageUrl)}
            alt={track.title}
            className="w-14 h-14 rounded-lg object-cover shadow-sm"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
            <Music className="h-6 w-6 text-primary/50" />
          </div>
        )}
        <button
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          onClick={handlePlay}
          data-testid={`button-play-track-${track.id}`}
          aria-label={`Play ${track.title}`}
        >
          <Play className="h-5 w-5 text-white fill-white" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
        {track.albumName && (
          <p className="text-[10px] text-muted-foreground/70 truncate">{track.albumName}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {track.streamCount > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Headphones className="h-2.5 w-2.5" />
              {track.streamCount.toLocaleString()}
            </span>
          )}
          {track.duration && (
            <span className="text-[10px] text-muted-foreground">{formatDuration(track.duration)}</span>
          )}
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="shrink-0 gap-1.5 text-xs h-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        onClick={handlePlay}
        data-testid={`button-play-track-btn-${track.id}`}
        aria-label={`Play ${track.title}`}
      >
        <Play className="h-3 w-3" />
        Play
      </Button>
      {track.fileUrl && (
        <a
          href={`${track.fileUrl}?download=1`}
          download
          onClick={(e) => e.stopPropagation()}
          aria-label="Download"
          data-testid={`button-download-track-${track.id}`}
          className="shrink-0"
        >
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <span><Download className="h-3.5 w-3.5" /></span>
          </Button>
        </a>
      )}
    </div>
  );
}

export default function MusicListenPage() {
  const { data: allLinks = [], isLoading: linksLoading } = useQuery<PlatformSocialLink[]>({
    queryKey: ["/api/social-links"],
  });

  const { data: tracks = [], isLoading: tracksLoading } = useQuery<MusicTrack[]>({
    queryKey: ["/api/music/tracks", "track"],
    queryFn: () => fetch("/api/music/tracks?type=track").then((r) => r.json()),
  });

  const listenLinks = allLinks.filter((l) => l.showOnListen);
  const streamingLinks = listenLinks.filter((l) => STREAMING_ICON_NAMES.has(l.iconName));
  const socialLinks = listenLinks.filter((l) => !STREAMING_ICON_NAMES.has(l.iconName));

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-16">
      <PageHead
        title="Listen to SEVCO Records"
        description="Stream SEVCO Records on Spotify, Apple Music, and all major platforms. Follow us for new music and playlist updates."
        ogUrl="https://sevco.us/listen"
      />
      <div className="w-full max-w-lg">

        <div className="flex flex-col items-center mb-10">
          <div className="h-20 w-20 rounded-full bg-blue-600/10 flex items-center justify-center mb-5 overflow-visible">
            <SevcoLogo size={48} />
          </div>
          <img src={wordmarkBlack} alt="SEVCO" className="h-7 object-contain dark:invert mb-2" />
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">RECORDS</p>
        </div>

        {/* Music Library */}
        {(tracksLoading || tracks.length > 0) && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 text-center">
              Music Library
            </h2>
            {tracksLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-2" data-testid="music-library-list">
                {tracks.map((track) => (
                  <TrackCard key={track.id} track={track} allTracks={tracks} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Streaming buttons */}
        {linksLoading ? (
          <div className="space-y-3 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px] w-full rounded-2xl" />
            ))}
          </div>
        ) : streamingLinks.length > 0 ? (
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 text-center">
              Stream Everywhere
            </h2>
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
