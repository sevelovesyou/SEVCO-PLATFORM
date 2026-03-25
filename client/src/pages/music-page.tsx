import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Music, Users, Disc, Plus, ArrowRight, Headphones, ListMusic, Send,
} from "lucide-react";
import type { Artist, Album } from "@shared/schema";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";

const CAN_MANAGE_MUSIC = ["admin", "executive", "staff"];

type AlbumWithArtist = Album & { artist: Artist };

function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link href={`/music/artists/${artist.slug}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border hover:border-foreground/20 hover:bg-muted/30 transition-all cursor-pointer group"
        data-testid={`card-artist-${artist.id}`}
      >
        <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{artist.name}</p>
          {artist.genres && artist.genres.length > 0 && (
            <p className="text-[11px] text-muted-foreground truncate">{artist.genres.slice(0, 2).join(", ")}</p>
          )}
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </Link>
  );
}

function AlbumCard({ album }: { album: AlbumWithArtist }) {
  return (
    <Link href={`/music/albums/${album.slug}`}>
      <div
        className="group cursor-pointer"
        data-testid={`card-album-${album.id}`}
      >
        <div className="aspect-square rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mb-3 overflow-hidden group-hover:ring-2 group-hover:ring-violet-500/30 transition-all">
          <Disc className="h-10 w-10 text-violet-400 opacity-60 group-hover:rotate-12 transition-transform duration-300" />
        </div>
        <p className="font-semibold text-sm truncate">{album.title}</p>
        <p className="text-xs text-muted-foreground truncate">{album.artist?.name}</p>
        {album.releaseYear && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{album.releaseYear}</p>
        )}
      </div>
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
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-14">

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-700 via-violet-800 to-purple-900 text-white p-8 md:p-12 relative overflow-hidden mb-12">
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <div className="absolute -top-8 -right-8 text-[200px] leading-none opacity-5 font-black">♪</div>
            <div className="absolute bottom-0 left-1/3 text-[120px] leading-none opacity-5 font-black">♫</div>
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-5">
              <img src={wordmarkBlack} alt="SEVCO" className="h-5 invert" />
              <span className="text-white/50 font-light">×</span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Records</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4 leading-none">
              SEVCO<br />RECORDS
            </h1>
            <p className="text-white/70 max-w-lg text-sm md:text-base mb-8">
              An independent record label. We discover, develop, and release music that moves people.
              From emerging artists to full label releases.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/listen">
                <Button variant="secondary" className="gap-2" data-testid="button-listen-now">
                  <Headphones className="h-4 w-4" />
                  Listen Now
                </Button>
              </Link>
              <Link href="/music/submit">
                <Button variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10" data-testid="button-submit-music">
                  <Send className="h-4 w-4" />
                  Submit Your Music
                </Button>
              </Link>
              {canManage && (
                <>
                  <Link href="/music/artists/new">
                    <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 gap-1.5" data-testid="button-add-artist">
                      <Plus className="h-3.5 w-3.5" /> Artist
                    </Button>
                  </Link>
                  <Link href="/music/albums/new">
                    <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 gap-1.5" data-testid="button-add-album">
                      <Plus className="h-3.5 w-3.5" /> Album
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Artists */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Our Artists</p>
              <h2 className="text-2xl font-bold tracking-tight">The Roster</h2>
            </div>
            <Link href="/music/artists">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1" data-testid="link-all-artists">
                View all <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </div>

          {artistsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : featuredArtists.length === 0 ? (
            <div className="border border-dashed rounded-2xl p-10 text-center">
              <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground mb-1 font-medium">No artists signed yet</p>
              <p className="text-xs text-muted-foreground">The roster is growing — check back soon.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {featuredArtists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          )}
        </section>

        {/* Latest Releases */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Latest Releases</p>
              <h2 className="text-2xl font-bold tracking-tight">New Music</h2>
            </div>
            <Link href="/listen">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1" data-testid="link-all-releases">
                Browse all <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </div>

          {albumsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : latestAlbums.length === 0 ? (
            <div className="border border-dashed rounded-2xl p-10 text-center">
              <Disc className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground mb-1 font-medium">No releases yet</p>
              <p className="text-xs text-muted-foreground">The catalog is building — check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {latestAlbums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          )}
        </section>

        {/* Our Playlists teaser */}
        <section className="mb-12">
          <div className="border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <ListMusic className="h-8 w-8 text-violet-500" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Curated</p>
              <h3 className="font-bold text-lg mb-1">Our Playlists</h3>
              <p className="text-sm text-muted-foreground">
                Handpicked selections from the SEVCO team. Moods, moments, and everything in between.
                Want your music featured? Submit for consideration.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/music/playlists">
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-view-playlists">
                  <ListMusic className="h-3.5 w-3.5" />
                  Browse Playlists
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Submit CTA */}
        <section>
          <div className="rounded-2xl bg-muted/40 border p-8 md:p-10 text-center">
            <div className="h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <Music className="h-6 w-6 text-violet-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Make music?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
              SEVCO RECORDS is always listening. If you make music that moves people,
              we want to hear it. Share your demo and we'll be in touch.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/music/submit">
                <Button className="gap-2" data-testid="button-submit-demo">
                  <Send className="h-4 w-4" />
                  Submit Your Demo
                </Button>
              </Link>
              <Link href="/music/playlists">
                <Button variant="outline" className="gap-2" data-testid="button-playlist-submit">
                  <ListMusic className="h-4 w-4" />
                  Playlist Pitches
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-12 text-center text-xs text-muted-foreground">
          SEVCO RECORDS · sevelovesyou.com
        </div>
      </div>
    </div>
  );
}
