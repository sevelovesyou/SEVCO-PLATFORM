import { Link } from "wouter";
import { PageHead } from "@/components/page-head";
import { useQuery } from "@tanstack/react-query";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, ArrowRight, Music, ChevronLeft, AlertCircle } from "lucide-react";
import type { Artist } from "@shared/schema";
import { resolveImageUrl } from "@/lib/resolve-image-url";

type ArtistWithLinked = Artist & {
  linkedUsername: string | null;
  linkedDisplayName: string | null;
  linkedAvatarUrl: string | null;
};

const CAN_MANAGE_MUSIC = ["admin", "executive", "staff"];

export default function MusicArtistsPage() {
  const { role } = usePermission();
  const canManage = CAN_MANAGE_MUSIC.includes(role ?? "");

  const { data: artistsList, isLoading } = useQuery<ArtistWithLinked[]>({
    queryKey: ["/api/music/artists"],
  });

  const visibleArtists = (artistsList ?? []).filter((a) => canManage || a.linkedUsername);
  const unlinkedCount = (artistsList ?? []).length - visibleArtists.length;

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
              {artistsList ? `${visibleArtists.length} artist${visibleArtists.length !== 1 ? "s" : ""}` : "Loading..."}
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
      ) : visibleArtists.length === 0 ? (
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
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleArtists.map((artist) => {
              const displayName = artist.linkedDisplayName || artist.name;
              const avatarUrl = artist.linkedAvatarUrl;
              const isLinked = !!artist.linkedUsername;
              const cardInner = (
                <Card
                  className={`p-4 overflow-visible group ${isLinked ? "hover-elevate active-elevate-2 cursor-pointer" : "opacity-90"}`}
                  data-testid={`card-artist-${artist.id}`}
                >
                  <div className="flex items-start gap-3">
                    {avatarUrl ? (
                      <img
                        src={resolveImageUrl(avatarUrl)}
                        alt={displayName}
                        className="h-12 w-12 rounded-full object-cover shrink-0"
                        data-testid={`img-artist-avatar-${artist.id}`}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold truncate" data-testid={`text-artist-name-${artist.id}`}>{displayName}</h3>
                        {isLinked && (
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                        )}
                      </div>
                      {isLinked && (
                        <p className="text-[11px] text-muted-foreground truncate">@{artist.linkedUsername}</p>
                      )}
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
                      {canManage && !isLinked && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-500" data-testid={`status-unlinked-${artist.id}`}>
                          <AlertCircle className="h-3 w-3" />
                          Not linked to a user — link via the user editor
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
              return isLinked ? (
                <Link key={artist.id} href={`/profile/${artist.linkedUsername}`}>
                  {cardInner}
                </Link>
              ) : (
                <div key={artist.id}>{cardInner}</div>
              );
            })}
          </div>
          {canManage && unlinkedCount > 0 && (
            <p className="text-xs text-muted-foreground text-center" data-testid="text-unlinked-hidden">
              {unlinkedCount} unlinked artist{unlinkedCount !== 1 ? "s" : ""} hidden from the public roster.
            </p>
          )}
        </>
      )}
    </div>
  );
}
