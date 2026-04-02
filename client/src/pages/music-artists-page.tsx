import { Link } from "wouter";
import { PageHead } from "@/components/page-head";
import { useQuery } from "@tanstack/react-query";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, ArrowRight, Music, ChevronLeft } from "lucide-react";
import type { Artist } from "@shared/schema";

type ArtistWithLinked = Artist & { linkedUsername: string | null };

const CAN_MANAGE_MUSIC = ["admin", "executive", "staff"];

export default function MusicArtistsPage() {
  const { role } = usePermission();
  const canManage = CAN_MANAGE_MUSIC.includes(role ?? "");

  const { data: artistsList, isLoading } = useQuery<ArtistWithLinked[]>({
    queryKey: ["/api/music/artists"],
  });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <PageHead
        title="Artists — SEVCO Records"
        description="Discover the artists on SEVCO Records — musicians, bands, and performers in the SEVCO music roster."
        ogUrl="https://sevco.us/music/artists"
      />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/music">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ChevronLeft className="h-4 w-4" />
              Records
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              <h1 className="text-xl font-bold tracking-tight">All Artists</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {artistsList ? `${artistsList.length} artist${artistsList.length !== 1 ? "s" : ""}` : "Loading..."}
            </p>
          </div>
        </div>
        {canManage && (
          <Link href="/music/artists/new">
            <Button size="sm" className="gap-1.5" data-testid="button-add-artist">
              <Plus className="h-3.5 w-3.5" />
              Add Artist
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
      ) : !artistsList || artistsList.length === 0 ? (
        <Card className="p-8 overflow-visible text-center">
          <Music className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <h2 className="text-base font-semibold mb-1">No artists yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The SEVCO RECORDS artist roster is empty. Add the first artist to get started.
          </p>
          {canManage && (
            <Link href="/music/artists/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add First Artist
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {artistsList.map((artist) => (
            <Link key={artist.id} href={artist.linkedUsername ? `/profile/${artist.linkedUsername}` : `/music/artists/${artist.slug}`}>
              <Card
                className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible group"
                data-testid={`card-artist-${artist.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-blue-700 dark:text-blue-400" />
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
          ))}
        </div>
      )}
    </div>
  );
}
