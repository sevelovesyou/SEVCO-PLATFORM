import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ListMusic, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { SiSpotify, SiApplemusic, SiYoutubemusic, SiSoundcloud } from "react-icons/si";
import type { Playlist } from "@shared/schema";

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

const PLATFORMS = ["Spotify", "Apple Music", "YouTube", "SoundCloud"];

const playlistSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  platform: z.string().optional(),
  playlistUrl: z.string().url("Enter a valid URL"),
  coverImageUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  isOfficial: z.boolean().default(true),
});

type PlaylistForm = z.infer<typeof playlistSchema>;

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

function PlaylistDialog({
  open,
  onClose,
  playlist,
}: {
  open: boolean;
  onClose: () => void;
  playlist?: Playlist | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!playlist;

  const form = useForm<PlaylistForm>({
    resolver: zodResolver(playlistSchema),
    defaultValues: {
      title: playlist?.title ?? "",
      slug: playlist?.slug ?? "",
      description: playlist?.description ?? "",
      platform: playlist?.platform ?? "",
      playlistUrl: playlist?.playlistUrl ?? "",
      coverImageUrl: playlist?.coverImageUrl ?? "",
      isOfficial: playlist?.isOfficial ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PlaylistForm) =>
      isEdit
        ? apiRequest("PATCH", `/api/music/playlists/${playlist!.id}`, data)
        : apiRequest("POST", "/api/music/playlists", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/music/playlists"] });
      toast({ title: isEdit ? "Playlist updated" : "Playlist created" });
      onClose();
      form.reset();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Playlist" : "Add Playlist"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Late Night Vibes"
                    data-testid="input-playlist-title"
                    onChange={(e) => {
                      field.onChange(e);
                      if (!isEdit) form.setValue("slug", slugify(e.target.value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="late-night-vibes" data-testid="input-playlist-slug" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional description" data-testid="input-playlist-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="platform" render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-playlist-platform">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="isOfficial" render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Official</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-playlist-official"
                    />
                  </FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="playlistUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Playlist URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://open.spotify.com/playlist/..." data-testid="input-playlist-url" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="coverImageUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Cover Image URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://..." data-testid="input-playlist-cover" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-playlist-save">
                {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Playlist"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PlaylistRow({ playlist, onEdit }: { playlist: Playlist; onEdit: (p: Playlist) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const PlatformIcon = playlist.platform ? PLATFORM_ICONS[playlist.platform] : undefined;
  const platformColor = playlist.platform ? PLATFORM_COLORS[playlist.platform] ?? "" : "";

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/music/playlists/${playlist.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/music/playlists"] });
      toast({ title: "Playlist deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex items-center gap-4 p-4 border rounded-xl hover:bg-muted/30 transition-colors group" data-testid={`row-playlist-${playlist.id}`}>
      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center shrink-0 overflow-hidden">
        {playlist.coverImageUrl ? (
          <img src={playlist.coverImageUrl} alt={playlist.title} className="h-full w-full object-cover rounded-lg" />
        ) : (
          <ListMusic className="h-5 w-5 text-violet-400 opacity-50" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm truncate">{playlist.title}</p>
          {playlist.platform && (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex items-center gap-1 w-fit ${platformColor}`}>
              {PlatformIcon && <PlatformIcon className="h-2.5 w-2.5" />}
              {playlist.platform}
            </Badge>
          )}
          {!playlist.isOfficial && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Community</Badge>
          )}
        </div>
        {playlist.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{playlist.description}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono truncate">{playlist.slug}</p>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <a href={playlist.playlistUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-open-playlist-${playlist.id}`}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(playlist)}
          data-testid={`button-edit-playlist-${playlist.id}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          data-testid={`button-delete-playlist-${playlist.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function CommandPlaylists() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  const { data: playlists, isLoading } = useQuery<Playlist[]>({
    queryKey: ["/api/music/playlists"],
  });

  const handleEdit = (p: Playlist) => {
    setEditingPlaylist(p);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingPlaylist(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {playlists ? `${playlists.length} playlist${playlists.length !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2" data-testid="button-add-playlist">
          <Plus className="h-4 w-4" />
          Add Playlist
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : playlists && playlists.length > 0 ? (
        <div className="space-y-3">
          {playlists.map((p) => (
            <PlaylistRow key={p.id} playlist={p} onEdit={handleEdit} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl">
          <ListMusic className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-semibold text-sm">No playlists yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first playlist to get started</p>
        </div>
      )}

      <PlaylistDialog
        open={dialogOpen}
        onClose={handleClose}
        playlist={editingPlaylist}
      />
    </div>
  );
}
