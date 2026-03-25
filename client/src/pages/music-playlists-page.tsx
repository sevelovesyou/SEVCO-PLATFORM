import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListMusic, Music, Disc, ArrowRight } from "lucide-react";
import type { Artist, Album } from "@shared/schema";

type AlbumWithArtist = Album & { artist: Artist };

const EDITORIAL_PLAYLISTS = [
  {
    id: "intro-to-sevco",
    title: "Intro to SEVCO Records",
    desc: "The essential first listen — handpicked tracks that define the SEVCO sound.",
    mood: "Curated",
    color: "from-violet-500/30 to-purple-500/10",
  },
  {
    id: "late-night",
    title: "Late Night",
    desc: "Deep cuts and slow burners for when the night gets quiet.",
    mood: "Mood",
    color: "from-blue-500/30 to-indigo-500/10",
  },
  {
    id: "records-freshest",
    title: "Freshest Drops",
    desc: "The newest releases from across the SEVCO Records roster.",
    mood: "New",
    color: "from-green-500/30 to-emerald-500/10",
  },
  {
    id: "staff-picks",
    title: "Staff Picks",
    desc: "What the SEVCO team is actually listening to right now.",
    mood: "Staff",
    color: "from-orange-500/30 to-yellow-500/10",
  },
];

function EditorialCard({ playlist }: { playlist: typeof EDITORIAL_PLAYLISTS[0] }) {
  return (
    <Card
      className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer group"
      data-testid={`card-playlist-${playlist.id}`}
    >
      <div className={`h-28 bg-gradient-to-br ${playlist.color} flex items-center justify-center`}>
        <ListMusic className="h-10 w-10 opacity-50 group-hover:scale-110 transition-transform duration-300" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{playlist.mood}</Badge>
        </div>
        <h3 className="font-semibold text-sm">{playlist.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{playlist.desc}</p>
      </div>
    </Card>
  );
}

export default function MusicPlaylistsPage() {
  const { data: albums, isLoading } = useQuery<AlbumWithArtist[]>({
    queryKey: ["/api/music/albums"],
  });

  const hasAlbums = albums && albums.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-widest">
          <ListMusic className="h-3.5 w-3.5" />
          SEVCO Records
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Playlists</h1>
        <p className="text-muted-foreground max-w-xl">
          Curated playlists from the SEVCO Records team. Moods, moments, and everything in between.
        </p>
      </div>

      {/* Editorial playlists */}
      <section className="mb-12">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Editorial
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {EDITORIAL_PLAYLISTS.map((p) => (
            <EditorialCard key={p.id} playlist={p} />
          ))}
        </div>
      </section>

      {/* From the catalog */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Disc className="h-3.5 w-3.5" />
            From the catalog
          </h2>
          <Link href="/listen">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">Browse all →</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : !hasAlbums ? (
          <Card className="p-8 overflow-visible text-center border-dashed">
            <Disc className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground mb-3">The catalog is building — check back soon.</p>
            <Link href="/music/submit">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Music className="h-3.5 w-3.5" />
                Submit music
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-2">
            {albums.map((album) => {
              const tracks = Array.isArray(album.trackList) ? album.trackList : [];
              return (
                <Link key={album.id} href={`/music/albums/${album.slug}`}>
                  <Card
                    className="p-4 overflow-visible hover-elevate active-elevate-2 cursor-pointer group flex items-center gap-4"
                    data-testid={`row-album-${album.id}`}
                  >
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center shrink-0">
                      <Disc className="h-5 w-5 text-violet-400 opacity-70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{album.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {album.artist?.name}
                        {album.releaseYear ? ` · ${album.releaseYear}` : ""}
                        {tracks.length > 0 ? ` · ${tracks.length} tracks` : ""}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Submit CTA */}
      <Card className="p-6 overflow-visible bg-gradient-to-r from-violet-500/10 to-purple-500/5 border-violet-500/20 text-center">
        <Music className="h-8 w-8 text-violet-500 mx-auto mb-2" />
        <h3 className="font-bold mb-1">Want your music in a playlist?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Submit your tracks to SEVCO Records for consideration.
        </p>
        <Link href="/music/submit">
          <Button size="sm" className="gap-1.5">Submit your music</Button>
        </Link>
      </Card>
    </div>
  );
}
