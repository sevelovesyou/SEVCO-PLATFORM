import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Headphones, Music, Disc, ArrowRight, Users } from "lucide-react";
import type { Artist, Album } from "@shared/schema";

type AlbumWithArtist = Album & { artist: Artist };

function AlbumCard({ album }: { album: AlbumWithArtist }) {
  const tracks = Array.isArray(album.trackList) ? album.trackList : [];
  return (
    <Link href={`/music/albums/${album.slug}`}>
      <Card
        className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible group"
        data-testid={`card-album-${album.id}`}
      >
        <div className="h-24 w-full rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/10 mb-3 flex items-center justify-center">
          <Disc className="h-10 w-10 text-violet-400 opacity-60 group-hover:rotate-12 transition-transform duration-300" />
        </div>
        <h3 className="font-semibold text-sm truncate">{album.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{album.artist?.name}</p>
        <div className="flex items-center justify-between mt-2">
          {album.releaseYear && (
            <span className="text-[10px] text-muted-foreground">{album.releaseYear}</span>
          )}
          {tracks.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{tracks.length} tracks</span>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function MusicListenPage() {
  const { data: albums, isLoading: albumsLoading } = useQuery<AlbumWithArtist[]>({
    queryKey: ["/api/music/albums"],
  });

  const { data: artists, isLoading: artistsLoading } = useQuery<Artist[]>({
    queryKey: ["/api/music/artists"],
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-widest">
          <Headphones className="h-3.5 w-3.5" />
          SEVCO Records
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Listen</h1>
        <p className="text-muted-foreground max-w-xl">
          Browse the SEVCO Records catalog. From debut releases to full albums — all in one place.
        </p>
      </div>

      {/* Albums */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Disc className="h-3.5 w-3.5" />
            Albums & Releases
          </h2>
          <Link href="/music">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</span>
          </Link>
        </div>

        {albumsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : !albums || albums.length === 0 ? (
          <Card className="p-10 overflow-visible text-center">
            <Disc className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium mb-1">No releases yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              SEVCO Records is building its catalog. Check back soon.
            </p>
            <Link href="/music/submit">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Music className="h-3.5 w-3.5" />
                Submit your music
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </section>

      {/* Artists */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Artists
          </h2>
          <Link href="/music/artists">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</span>
          </Link>
        </div>

        {artistsLoading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : !artists || artists.length === 0 ? (
          <p className="text-sm text-muted-foreground">No artists yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {artists.map((artist) => (
              <Link key={artist.id} href={`/music/artists/${artist.slug}`}>
                <Card
                  className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible group flex items-center gap-3"
                  data-testid={`card-artist-${artist.id}`}
                >
                  <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Users className="h-4.5 w-4.5 text-violet-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{artist.name}</p>
                    {artist.genres && artist.genres.length > 0 && (
                      <p className="text-[11px] text-muted-foreground truncate">{artist.genres.slice(0, 2).join(", ")}</p>
                    )}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Submit CTA */}
      <Card className="p-6 overflow-visible bg-gradient-to-r from-violet-500/10 to-purple-500/5 border-violet-500/20 text-center">
        <Music className="h-8 w-8 text-violet-500 mx-auto mb-2" />
        <h3 className="font-bold mb-1">Make music?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          SEVCO Records accepts submissions from independent artists across all genres.
        </p>
        <Link href="/music/submit">
          <Button size="sm" className="gap-1.5">
            Submit your demo
          </Button>
        </Link>
      </Card>
    </div>
  );
}
