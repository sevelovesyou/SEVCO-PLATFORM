import { Link, useRoute } from "wouter";
import { PageHead } from "@/components/page-head";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Disc, Users, ChevronLeft, Music, Play, BarChart2 } from "lucide-react";
import type { Artist, Album, MusicTrack, Playlist } from "@shared/schema";
import { useSpotifyPlayer } from "@/hooks/use-spotify-player";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { useAuth } from "@/hooks/use-auth";
import { SparkButton } from "@/components/spark-button";

type AlbumDetail = Album & { artist: Artist };
type ArtistWithLinked = Artist & { linkedUsername: string | null };
type TrackWithMeta = MusicTrack & { artist: { id: number; name: string } | null; sparkCount?: number; sparkedByCurrentUser?: boolean };

function formatStreamCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function trackToPlaylistAdapter(track: TrackWithMeta): Playlist {
  return {
    id: track.id,
    title: track.title,
    slug: String(track.id),
    description: null,
    platform: null,
    playlistUrl: track.fileUrl,
    coverImageUrl: track.coverImageUrl ?? null,
    isOfficial: false,
    createdAt: track.createdAt,
  };
}

export default function MusicAlbumDetail() {
  const [, params] = useRoute("/music/albums/:slug");
  const slug = params?.slug;
  const { play } = useSpotifyPlayer();
  const { user } = useAuth();

  const { data: album, isLoading, isError } = useQuery<AlbumDetail>({
    queryKey: ["/api/music/albums", slug],
    queryFn: () => fetch(`/api/music/albums/${slug}`).then((r) => {
      if (!r.ok) throw new Error("Album not found");
      return r.json();
    }),
    enabled: !!slug,
  });

  const { data: tracks = [], isLoading: tracksLoading } = useQuery<TrackWithMeta[]>({
    queryKey: ["/api/music/tracks", { album_name: album?.title }],
    queryFn: () => fetch(`/api/music/tracks?album_name=${encodeURIComponent(album!.title)}`).then((r) => r.json()),
    enabled: !!album?.title,
  });

  const { data: artistDetail } = useQuery<ArtistWithLinked>({
    queryKey: ["/api/music/artists", album?.artist?.slug],
    queryFn: () => fetch(`/api/music/artists/${album!.artist.slug}`).then((r) => r.json()),
    enabled: !!album?.artist?.slug,
  });
  const artistHref = artistDetail?.linkedUsername
    ? `/profile/${artistDetail.linkedUsername}`
    : "/music/artists";

  const totalStreams = tracks.reduce((sum, t) => sum + (t.streamCount ?? 0), 0);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-5">
          <Skeleton className="h-24 w-24 rounded-lg shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-6 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/3 mb-1" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !album) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Music className="h-12 w-12 text-muted-foreground opacity-30" />
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-1">Album not found</h2>
          <p className="text-sm text-muted-foreground mb-4">This album doesn't exist in the catalog.</p>
          <Link href="/music">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              Back to Records
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <PageHead
        title={`${album.title} by ${album.artist.name} — SEVCO Records`}
        description={`Listen to ${album.title} by ${album.artist.name} on SEVCO Records.`}
        ogImage={album.coverImageUrl || undefined}
        ogType="music.album"
        ogUrl={`https://sevco.us/music/albums/${album.slug}`}
      />
      <div className="flex items-center gap-2">
        <Link href={artistHref}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" data-testid="link-back-artist">
            <ChevronLeft className="h-4 w-4" />
            {album.artist.name}
          </Button>
        </Link>
      </div>

      <div className="flex items-start gap-5">
        {album.coverImageUrl ? (
          <img
            src={resolveImageUrl(album.coverImageUrl)}
            alt={album.title}
            className="h-24 w-24 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="h-24 w-24 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Disc className="h-10 w-10 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{album.title}</h1>
          <Link href={artistHref}>
            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground hover:text-foreground transition-colors w-fit" data-testid="link-album-artist">
              <Users className="h-3.5 w-3.5" />
              <span className="text-sm">{album.artist.name}</span>
            </div>
          </Link>
          {album.releaseYear && (
            <p className="text-sm text-muted-foreground mt-1">{album.releaseYear}</p>
          )}
          {totalStreams > 0 && (
            <Badge variant="secondary" className="mt-2 gap-1 text-xs" data-testid="badge-total-streams">
              <BarChart2 className="h-3 w-3" />
              {formatStreamCount(totalStreams)} streams
            </Badge>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Music className="h-3.5 w-3.5" />
          Track Listing
        </h2>
        {tracksLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <Card className="p-4 overflow-visible text-center" data-testid="empty-tracks">
            <Music className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No tracks released yet.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden overflow-visible">
            <ol className="divide-y">
              {tracks.map((track, i) => (
                <li
                  key={track.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer group"
                  data-testid={`track-${track.id}`}
                  onClick={() => {
                    if (track.fileUrl) {
                      play(trackToPlaylistAdapter(track));
                    }
                  }}
                >
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0 tabular-nums">
                    {track.displayOrder || i + 1}
                  </span>
                  {track.coverImageUrl ? (
                    <img
                      src={resolveImageUrl(track.coverImageUrl)}
                      alt={track.title}
                      className="h-8 w-8 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Music className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatStreamCount(track.streamCount ?? 0)} streams
                    </p>
                  </div>
                  {track.genre && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0 hidden sm:inline-flex" data-testid={`badge-track-genre-${track.id}`}>
                      {track.genre}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {formatDuration(track.duration)}
                  </span>
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <SparkButton
                      entityType="track"
                      entityId={track.id}
                      sparkCount={track.sparkCount ?? 0}
                      sparkedByCurrentUser={track.sparkedByCurrentUser ?? false}
                      isOwner={!!user?.linkedArtistId && user.linkedArtistId === track.artistId}
                    />
                  </div>
                  {track.fileUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Play ${track.title}`}
                      data-testid={`button-play-track-${track.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        play(trackToPlaylistAdapter(track));
                      }}
                    >
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}
