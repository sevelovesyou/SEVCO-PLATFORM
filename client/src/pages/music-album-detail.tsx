import { Link, useRoute } from "wouter";
import { PageHead } from "@/components/page-head";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Disc, Users, ChevronLeft, Music } from "lucide-react";
import type { Artist, Album } from "@shared/schema";

type AlbumDetail = Album & { artist: Artist };

export default function MusicAlbumDetail() {
  const [, params] = useRoute("/music/albums/:slug");
  const slug = params?.slug;

  const { data: album, isLoading, isError } = useQuery<AlbumDetail>({
    queryKey: ["/api/music/albums", slug],
    queryFn: () => fetch(`/api/music/albums/${slug}`).then((r) => {
      if (!r.ok) throw new Error("Album not found");
      return r.json();
    }),
    enabled: !!slug,
  });

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

  const trackList = Array.isArray(album.trackList)
    ? (album.trackList as string[])
    : typeof album.trackList === "object" && album.trackList !== null
    ? Object.values(album.trackList as Record<string, string>)
    : [];

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
        <Link href={`/music/artists/${album.artist.slug}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            {album.artist.name}
          </Button>
        </Link>
      </div>

      <div className="flex items-start gap-5">
        <div className="h-24 w-24 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Disc className="h-10 w-10 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{album.title}</h1>
          <Link href={`/music/artists/${album.artist.slug}`}>
            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground hover:text-foreground transition-colors w-fit">
              <Users className="h-3.5 w-3.5" />
              <span className="text-sm">{album.artist.name}</span>
            </div>
          </Link>
          {album.releaseYear && (
            <p className="text-sm text-muted-foreground mt-1">{album.releaseYear}</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Music className="h-3.5 w-3.5" />
          Track Listing
        </h2>
        {trackList.length === 0 ? (
          <Card className="p-4 overflow-visible text-center">
            <p className="text-sm text-muted-foreground">No tracks listed for this album.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden overflow-visible">
            <ol className="divide-y">
              {trackList.map((track, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
                  data-testid={`track-${i + 1}`}
                >
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="text-sm flex-1">{track}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}
