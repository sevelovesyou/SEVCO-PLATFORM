import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Users, Disc, Plus, ArrowRight } from "lucide-react";
import type { Artist, Album } from "@shared/schema";

const CAN_MANAGE_MUSIC = ["admin", "executive", "staff"];

type AlbumWithArtist = Album & { artist: Artist };

function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link href={`/music/artists/${artist.slug}`}>
      <Card
        className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible group"
        data-testid={`card-artist-${artist.id}`}
      >
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold truncate">{artist.name}</h3>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
            {artist.genres && artist.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {artist.genres.slice(0, 3).map((g) => (
                  <Badge key={g} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
            {artist.bio && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{artist.bio}</p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function AlbumCard({ album }: { album: AlbumWithArtist }) {
  return (
    <Link href={`/music/albums/${album.slug}`}>
      <Card
        className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible group"
        data-testid={`card-album-${album.id}`}
      >
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Disc className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold truncate">{album.title}</h3>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{album.artist.name}</p>
            {album.releaseYear && (
              <p className="text-xs text-muted-foreground">{album.releaseYear}</p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function MusicPage() {
  const { role } = usePermission();
  const canManage = CAN_MANAGE_MUSIC.includes(role ?? "");

  const { data: artistsList, isLoading: artistsLoading } = useQuery<Artist[]>({
    queryKey: ["/api/music/artists"],
  });

  const { data: albumsList, isLoading: albumsLoading } = useQuery<AlbumWithArtist[]>({
    queryKey: ["/api/music/albums"],
  });

  const featuredArtists = artistsList?.slice(0, 6) || [];
  const latestAlbums = albumsList?.slice(0, 8) || [];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-8">
      <div className="rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-4 right-8 text-[120px] leading-none select-none">♪</div>
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Music className="h-4 w-4 opacity-70" />
            <span className="text-xs font-semibold uppercase tracking-widest opacity-70">SEVCO</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">RECORDS</h1>
          <p className="text-sm text-white/70 max-w-md">
            Discover artists, albums, and releases from the SEVCO catalog.
          </p>
          {canManage && (
            <div className="flex gap-2 mt-4">
              <Link href="/music/artists/new">
                <Button size="sm" variant="secondary" className="gap-1.5" data-testid="button-add-artist">
                  <Plus className="h-3.5 w-3.5" />
                  Add Artist
                </Button>
              </Link>
              <Link href="/music/albums/new">
                <Button size="sm" variant="secondary" className="gap-1.5" data-testid="button-add-album">
                  <Plus className="h-3.5 w-3.5" />
                  Add Album
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Artists
          </h2>
          <Link href="/music/artists">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </span>
          </Link>
        </div>

        {artistsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4 overflow-visible">
                <div className="flex gap-3">
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : featuredArtists.length === 0 ? (
          <Card className="p-6 overflow-visible text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground mb-3">No artists in the catalog yet.</p>
            {canManage && (
              <Link href="/music/artists/new">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add First Artist
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Disc className="h-3.5 w-3.5" />
            Latest Releases
          </h2>
        </div>

        {albumsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 overflow-visible">
                <div className="flex gap-3">
                  <Skeleton className="h-12 w-12 rounded-md shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : latestAlbums.length === 0 ? (
          <Card className="p-6 overflow-visible text-center">
            <Disc className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground mb-3">No albums in the catalog yet.</p>
            {canManage && (
              <Link href="/music/albums/new">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add First Album
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {latestAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-muted-foreground pb-2">
        SEVCO RECORDS · sevelovesyou.com
      </div>
    </div>
  );
}
