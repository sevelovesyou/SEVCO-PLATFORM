import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Artist } from "@shared/schema";
import { Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ArtistDetail = Artist & { linkedUsername: string | null };

export default function MusicArtistDetail() {
  const [, params] = useRoute("/music/artists/:slug");
  const slug = params?.slug;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: artist, isLoading, isError } = useQuery<ArtistDetail>({
    queryKey: ["/api/music/artists", slug],
    queryFn: () => fetch(`/api/music/artists/${slug}`).then((r) => {
      if (!r.ok) throw new Error("Artist not found");
      return r.json();
    }),
    enabled: !!slug,
  });

  useEffect(() => {
    if (isLoading) return;
    if (isError || !artist) {
      toast({ title: "Artist not found", variant: "destructive" });
      setLocation("/music/artists", { replace: true });
      return;
    }
    if (artist.linkedUsername) {
      setLocation(`/profile/${artist.linkedUsername}`, { replace: true });
    } else {
      toast({
        title: "Artist profile not available",
        description: `${artist.name} hasn't been linked to a SEVCO user yet.`,
      });
      setLocation("/music/artists", { replace: true });
    }
  }, [isLoading, isError, artist, setLocation, toast]);

  return (
    <div className="max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[40vh]" data-testid="artist-redirect">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Music className="h-4 w-4 motion-safe:animate-pulse" />
        <span>Redirecting…</span>
      </div>
    </div>
  );
}
