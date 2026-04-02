import { Link, useRoute } from "wouter";
import { PageHead } from "@/components/page-head";
import { useQuery } from "@tanstack/react-query";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Disc, ChevronLeft, BookOpen, ArrowRight, Plus, Music, Play, BarChart2 } from "lucide-react";
import type { Artist, Album, MusicTrack } from "@shared/schema";
import { useSpotifyPlayer } from "@/hooks/use-spotify-player";
import type { Playlist } from "@shared/schema";

const CAN_MANAGE_MUSIC = ["admin", "executive", "staff"];

type ArtistDetail = Artist & { albums: Album[] };
type TrackWithMeta = MusicTrack & { artist: { id: number; name: string } | null };

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

export default function MusicArtistDetail() {
  const [, params] = useRoute("/music/artists/:slug");
  const slug = params?.slug;
  const { role } = usePermission();
  const canManage = CAN_MANAGE_MUSIC.includes(role ?? "");
  const { play } = useSpotifyPlayer();

  const { data: artist, isLoading, isError } = useQuery<ArtistDetail>({
    queryKey: ["/api/music/artists", slug],
    queryFn: () => fetch(`/api/music/artists/${slug}`).then((r) => {
      if (!r.ok) throw new Error("Artist not found");
      return r.json();
    }),
    enabled: !!slug,
  });

  const { data: tracks = [], isLoading: tracksLoading } = useQuery<TrackWithMeta[]>({
    queryKey: ["/api/music/tracks", { artist_id: artist?.id }],
    queryFn: () => fetch(`/api/music/tracks?artist_id=${artist!.id}`).then((r) => r.json()),
    enabled: !!artist?.id,
  });

  const totalStreams = tracks.reduce((sum, t) => sum + (t.streamCount ?? 0), 0);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-20 w-20 rounded-full shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-4 overflow-visible">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !artist) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Music className="h-12 w-12 text-muted-foreground opacity-30" />
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-1">Artist not found</h2>
          <p className="text-sm text-muted-foreground mb-4">This artist doesn't exist in the catalog.</p>
          <Link href="/music/artists">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              Back to Artists
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <PageHead
        title={`${artist.name} — SEVCO Records`}
        description={artist.bio || `Listen to ${artist.name} on SEVCO Records — music, albums, and more.`}
        ogImage={undefined}
        ogType="profile"
        ogUrl={`https://sevco.us/music/artists/${artist.slug}`}
      />
      <div className="flex items-center gap-2">
        <Link href="/music/artists">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            Artists
          </Button>
        </Link>
      </div>

      <div className="flex items-start gap-4">
        <div className="h-20 w-20 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
          <Users className="h-9 w-9 text-blue-700 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{artist.name}</h1>
            {totalStreams > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs" data-testid="badge-total-streams">
                <BarChart2 className="h-3 w-3" />
                {formatStreamCount(totalStreams)} streams
              </Badge>
            )}
          </div>
          {artist.genres && artist.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {artist.genres.map((g) => (
                <Badge key={g} variant="secondary" className="text-xs">
                  {g}
                </Badge>
              ))}
            </div>
          )}
          {artist.bio && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{artist.bio}</p>
          )}
          {artist.wikiArticleSlug && (
            <div className="mt-3">
              <Link href={`/wiki/${artist.wikiArticleSlug}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Wiki Article
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Music className="h-3.5 w-3.5" />
          Tracks
        </h2>
        {tracksLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <Card className="p-6 overflow-visible text-center" data-testid="empty-tracks">
            <Music className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No tracks released yet.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden overflow-visible">
            <ol className="divide-y">
              {tracks.map((track, i) => (
                <li
                  key={track.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group"
                  data-testid={`track-${track.id}`}
                >
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  {track.coverImageUrl ? (
                    <img
                      src={track.coverImageUrl}
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
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {formatDuration(track.duration)}
                  </span>
                  {track.fileUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Play ${track.title}`}
                      data-testid={`button-play-track-${track.id}`}
                      onClick={() => play(trackToPlaylistAdapter(track))}
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

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Disc className="h-3.5 w-3.5" />
            Discography
          </h2>
          {canManage && (
            <Link href="/music/albums/new">
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" data-testid="button-add-album">
                <Plus className="h-3 w-3" />
                Add Album
              </Button>
            </Link>
          )}
        </div>

        {artist.albums.length === 0 ? (
          <Card className="p-6 overflow-visible text-center">
            <Disc className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No albums in the discography yet.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {artist.albums.map((album) => (
              <Link key={album.id} href={`/music/albums/${album.slug}`}>
                <Card
                  className="p-3 hover-elevate active-elevate-2 cursor-pointer overflow-visible group"
                  data-testid={`card-album-${album.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Disc className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{album.title}</p>
                      {album.releaseYear && (
                        <p className="text-xs text-muted-foreground">{album.releaseYear}</p>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
