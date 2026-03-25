import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ListMusic, ExternalLink, Music, Send, CheckCircle, Disc } from "lucide-react";
import type { Playlist } from "@shared/schema";
import { SiSpotify, SiApplemusic, SiYoutubemusic, SiSoundcloud } from "react-icons/si";

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  Spotify: SiSpotify,
  "Apple Music": SiApplemusic,
  YouTube: SiYoutubemusic,
  SoundCloud: SiSoundcloud,
};

const PLATFORM_COLORS: Record<string, string> = {
  Spotify: "bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20",
  "Apple Music": "bg-[#FC3C44]/10 text-[#FC3C44] border-[#FC3C44]/20",
  YouTube: "bg-[#FF0000]/10 text-[#FF0000] border-[#FF0000]/20",
  SoundCloud: "bg-[#FF5500]/10 text-[#FF5500] border-[#FF5500]/20",
};

const GENRES = [
  "Hip-Hop / Rap", "R&B / Soul", "Pop", "Electronic / Dance",
  "Alternative", "Rock", "Indie", "Jazz", "Lo-Fi", "Other",
];

const playlistSubmitSchema = z.object({
  submitterName: z.string().min(1, "Your name is required"),
  submitterEmail: z.string().email("Valid email is required"),
  artistName: z.string().min(1, "Artist name is required"),
  trackTitle: z.string().min(1, "Track title is required"),
  trackUrl: z.string().url("Enter a valid URL to your track"),
  genre: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type PlaylistSubmitForm = z.infer<typeof playlistSubmitSchema>;

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const PlatformIcon = playlist.platform ? PLATFORM_ICONS[playlist.platform] : undefined;
  const platformColor = playlist.platform ? PLATFORM_COLORS[playlist.platform] : "";
  return (
    <a
      href={playlist.playlistUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`card-playlist-${playlist.id}`}
    >
      <Card className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer group">
        <div className="aspect-video bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center relative overflow-hidden">
          {playlist.coverImageUrl ? (
            <img src={playlist.coverImageUrl} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <ListMusic className="h-10 w-10 text-violet-400 opacity-50 group-hover:scale-110 transition-transform duration-300" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <ExternalLink className="absolute bottom-2 right-2 h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="p-4">
          {playlist.platform && (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mb-2 flex items-center gap-1 w-fit ${platformColor}`}>
              {PlatformIcon && <PlatformIcon className="h-2.5 w-2.5" />}
              {playlist.platform}
            </Badge>
          )}
          <h3 className="font-semibold text-sm leading-tight">{playlist.title}</h3>
          {playlist.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{playlist.description}</p>
          )}
        </div>
      </Card>
    </a>
  );
}

function PlaylistSubmitForm() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<PlaylistSubmitForm>({
    resolver: zodResolver(playlistSubmitSchema),
    defaultValues: {
      submitterName: "",
      submitterEmail: "",
      artistName: "",
      trackTitle: "",
      trackUrl: "",
      genre: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PlaylistSubmitForm) =>
      apiRequest("POST", "/api/music/submissions", { ...data, type: "playlist" }),
    onSuccess: () => {
      setSubmitted(true);
      form.reset();
    },
    onError: (e: Error) => {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <div className="text-center py-10" data-testid="playlist-submit-success">
        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
        <h3 className="font-bold text-lg mb-2">Submission received!</h3>
        <p className="text-sm text-muted-foreground mb-5">
          We'll consider your track for our curated playlists. Thanks for submitting.
        </p>
        <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
          Submit another track
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
        className="space-y-4"
        data-testid="form-playlist-submit"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="submitterName" render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} data-testid="input-submitter-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="submitterEmail" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} data-testid="input-submitter-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="artistName" render={({ field }) => (
            <FormItem>
              <FormLabel>Artist / Project Name</FormLabel>
              <FormControl>
                <Input placeholder="Stage name or project" {...field} data-testid="input-artist-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="trackTitle" render={({ field }) => (
            <FormItem>
              <FormLabel>Track Title</FormLabel>
              <FormControl>
                <Input placeholder="Name of the track" {...field} data-testid="input-track-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="trackUrl" render={({ field }) => (
          <FormItem>
            <FormLabel>Track Link</FormLabel>
            <FormControl>
              <Input placeholder="SoundCloud, Spotify, YouTube..." {...field} data-testid="input-track-url" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="genre" render={({ field }) => (
            <FormItem>
              <FormLabel>Genre <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-genre">
                    <SelectValue placeholder="Select a genre" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <div />
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
            <FormControl>
              <Textarea
                placeholder="Why do you think this track fits? Anything else we should know..."
                rows={3}
                className="resize-none"
                {...field}
                data-testid="input-notes"
              />
            </FormControl>
            <FormMessage />
            <p className="text-xs text-muted-foreground">{(field.value ?? "").length}/500</p>
          </FormItem>
        )} />
        <Button
          type="submit"
          className="w-full gap-2"
          disabled={mutation.isPending}
          data-testid="button-submit-playlist"
        >
          {mutation.isPending ? "Submitting..." : (
            <><Send className="h-4 w-4" /> Submit for Consideration</>
          )}
        </Button>
      </form>
    </Form>
  );
}

export default function MusicPlaylistsPage() {
  const { data: playlists, isLoading } = useQuery<Playlist[]>({
    queryKey: ["/api/music/playlists"],
  });

  const officialPlaylists = playlists ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-14">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <ListMusic className="h-3.5 w-3.5" />
            SEVCO Records
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Playlists</h1>
          <p className="text-muted-foreground max-w-xl">
            Curated selections from the SEVCO Records team. Moods, moments, and everything in between.
          </p>
        </div>

        {/* Official Playlists */}
        <section className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Official Playlists</p>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-video rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : officialPlaylists.length === 0 ? (
            <div className="border border-dashed rounded-2xl p-12 text-center">
              <Disc className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="font-medium text-sm mb-1">No playlists yet</p>
              <p className="text-xs text-muted-foreground">Check back soon — the team is curating.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {officialPlaylists.map((pl) => (
                <PlaylistCard key={pl.id} playlist={pl} />
              ))}
            </div>
          )}
        </section>

        {/* Submit section */}
        <section>
          <div className="border rounded-2xl overflow-hidden">
            <div className="bg-muted/40 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Music className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <h2 className="font-bold text-lg mb-1">Suggest Your Music</h2>
                  <p className="text-sm text-muted-foreground">
                    Think your track belongs in one of our playlists? Submit it for consideration.
                    No SEVCO account needed — just fill out the form.
                  </p>
                </div>
              </div>
              <PlaylistSubmitForm />
            </div>
          </div>
        </section>

        <div className="mt-12 flex items-center justify-center gap-4">
          <Link href="/music">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              ← SEVCO Records
            </span>
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <Link href="/music/submit">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              Submit a demo →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
