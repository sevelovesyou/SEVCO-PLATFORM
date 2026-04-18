import { PageHead } from "@/components/page-head";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Play, Headphones, Drum, Music2, Download } from "lucide-react";
import type { MusicTrack } from "@shared/schema";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useAuth } from "@/hooks/use-auth";
import { SparkButton } from "@/components/spark-button";

type BeatTrack = MusicTrack & { sparkCount?: number; sparkedByCurrentUser?: boolean };

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatStreamCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function BeatCard({ track, allTracks }: { track: BeatTrack; allTracks: BeatTrack[] }) {
  const { playTrack } = useMusicPlayer();
  const { user } = useAuth();

  function handlePlay() {
    const queue = allTracks.filter((t) => t.id !== track.id);
    playTrack(track, queue);
  }

  return (
    <div
      className="group relative bg-card border border-border rounded-xl hover:border-foreground/20 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 cursor-pointer"
      onClick={handlePlay}
      data-testid={`card-beat-${track.id}`}
    >
      <div className="aspect-square relative bg-zinc-900 overflow-hidden rounded-t-xl">
        {track.coverImageUrl ? (
          <img
            src={resolveImageUrl(track.coverImageUrl)}
            alt={track.title}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
            <Drum className="h-12 w-12 text-zinc-600" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          data-testid={`button-play-beat-${track.id}`}
        >
          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-xl">
            <Play className="h-5 w-5 fill-black text-black ml-0.5" />
          </div>
        </div>
      </div>

      <div className="p-3">
        <p className="font-semibold text-sm text-foreground truncate" data-testid={`text-beat-title-${track.id}`}>
          {track.title}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5" data-testid={`text-beat-artist-${track.id}`}>
          {track.artistName}
        </p>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Headphones className="h-3 w-3" />
            <span data-testid={`text-beat-streams-${track.id}`}>{formatStreamCount(track.streamCount)}</span>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <SparkButton
              entityType="track"
              entityId={track.id}
              sparkCount={track.sparkCount ?? 0}
              sparkedByCurrentUser={track.sparkedByCurrentUser ?? false}
              isOwner={!!user?.linkedArtistId && user.linkedArtistId === track.artistId}
            />
            {track.duration && (
              <span className="text-[11px] text-muted-foreground" data-testid={`text-beat-duration-${track.id}`}>
                {formatDuration(track.duration)}
              </span>
            )}
            {track.fileUrl && (
              <a
                href={`${track.fileUrl}?download=1`}
                download
                onClick={(e) => e.stopPropagation()}
                aria-label="Download"
                data-testid={`button-download-beat-${track.id}`}
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BeatCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export default function MusicBeatsPage() {
  const { data: tracks = [], isLoading } = useQuery<MusicTrack[]>({
    queryKey: ["/api/music/tracks", "instrumental"],
    queryFn: () =>
      fetch("/api/music/tracks?type=instrumental").then((r) => r.json()),
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title="Beats — SEVCO Records"
        description="Browse instrumental beats and production music from SEVCO Records. Play, discover, and license beats from our producers."
        ogUrl="https://sevco.us/music/beats"
      />

      {/* Hero */}
      <div className="relative bg-gradient-to-b from-zinc-950 to-background border-b border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/30 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
                <Drum className="h-5 w-5 text-white" />
              </div>
              <Badge variant="outline" className="border-white/20 text-white/70 bg-white/5 text-xs uppercase tracking-wider">
                Beats Library
              </Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight" data-testid="heading-beats">
              Beats
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl">
              Instrumental music from the SEVCO Records production vault. Premium beats crafted for artists, creators, and visionaries.
            </p>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Music2 className="h-4 w-4" />
              <span data-testid="text-beats-count">
                {isLoading ? "Loading..." : `${tracks.length} beat${tracks.length !== 1 ? "s" : ""} available`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <BeatCardSkeleton key={i} />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Drum className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2" data-testid="text-beats-empty">
              No beats yet
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Check back soon — new instrumentals are added regularly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" data-testid="grid-beats">
            {tracks.map((track) => (
              <BeatCard key={track.id} track={track} allTracks={tracks} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
