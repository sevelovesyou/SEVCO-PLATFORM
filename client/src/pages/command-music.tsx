import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Music, ExternalLink, Filter, CheckCircle, XCircle, Clock, Eye,
  ListMusic, Plus, Pencil, Trash2, Users, ChevronDown, ChevronUp,
  Search, RefreshCw, Unlink, Play, Loader2,
} from "lucide-react";
import { SiSpotify, SiApplemusic, SiYoutubemusic, SiSoundcloud } from "react-icons/si";
import type { MusicSubmission, Playlist, SpotifyArtist } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ─── Submissions tab ──────────────────────────────────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  reviewed: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  accepted: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending:  Clock,
  reviewed: Eye,
  accepted: CheckCircle,
  rejected: XCircle,
};

const STATUSES = ["pending", "reviewed", "accepted", "rejected"];

function TrackPlayButton({ submissionId }: { submissionId: number }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  async function getAndPlay() {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("GET", `/api/music/submissions/${submissionId}/track-url`);
      setSignedUrl(res.signedUrl);
      window.open(res.signedUrl, "_blank");
    } catch (e: any) {
      toast({ title: "Could not load track", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={getAndPlay}
      disabled={loading}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      data-testid={`button-play-track-${submissionId}`}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
      {loading ? "Loading..." : "Play File"}
    </button>
  );
}

function SubmissionRow({ sub }: { sub: MusicSubmission }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const StatusIcon = STATUS_ICONS[sub.status] ?? Clock;

  const updateStatus = async (status: string) => {
    if (status === sub.status) return;
    setUpdating(true);
    try {
      await apiRequest("PATCH", `/api/music/submissions/${sub.id}/status`, { status });
      await queryClient.invalidateQueries({ queryKey: ["/api/music/submissions"] });
      toast({ title: "Status updated", description: `Submission marked as ${status}` });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="border rounded-xl p-4 space-y-3" data-testid={`row-submission-${sub.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-sm">{sub.artistName}</p>
            <span className="text-muted-foreground/50">—</span>
            <p className="text-sm text-muted-foreground">{sub.trackTitle}</p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {sub.type === "playlist" ? "Playlist Pitch" : "A&R"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{sub.submitterName} · {sub.submitterEmail}</span>
            {sub.genre && <span>· {sub.genre}</span>}
            <span>· {new Date(sub.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 flex items-center gap-1 shrink-0 ${STATUS_STYLES[sub.status] ?? ""}`}>
          <StatusIcon className="h-2.5 w-2.5" />
          {sub.status}
        </Badge>
      </div>
      {sub.notes && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 line-clamp-2">{sub.notes}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <a
            href={sub.trackUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            data-testid={`link-track-${sub.id}`}
          >
            <ExternalLink className="h-3 w-3" /> Listen
          </a>
          {sub.trackFileUrl && (
            <TrackPlayButton submissionId={sub.id} />
          )}
        </div>
        <Select value={sub.status} onValueChange={updateStatus} disabled={updating}>
          <SelectTrigger className="h-7 text-xs w-36" data-testid={`select-status-${sub.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SubmissionsTab() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: submissions, isLoading } = useQuery<MusicSubmission[]>({
    queryKey: ["/api/music/submissions"],
  });

  const filtered = (submissions ?? []).filter((s) => {
    if (typeFilter !== "all" && s.type !== typeFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (submissions ?? []).filter((sub) => sub.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUSES.map((status) => {
          const Icon = STATUS_ICONS[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
              className={`border rounded-xl p-4 text-left transition-all hover:border-foreground/20 ${
                statusFilter === status ? "border-foreground/30 bg-muted/40" : ""
              }`}
              data-testid={`filter-status-${status}`}
            >
              <Icon className="h-4 w-4 text-muted-foreground mb-1.5" />
              <p className="text-xl font-bold">{counts[status] ?? 0}</p>
              <p className="text-xs text-muted-foreground capitalize">{status}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filter:
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-36" data-testid="filter-type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="label">A&R Submissions</SelectItem>
            <SelectItem value="playlist">Playlist Pitches</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-36" data-testid="filter-status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(typeFilter !== "all" || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs"
            onClick={() => { setTypeFilter("all"); setStatusFilter("all"); }}
            data-testid="button-clear-filters"
          >
            Clear filters
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} {filtered.length === 1 ? "submission" : "submissions"}
        </span>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed rounded-2xl p-12 text-center">
          <Music className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="font-medium text-sm mb-1">
            {submissions?.length === 0 ? "No submissions yet" : "No submissions match your filters"}
          </p>
          <p className="text-xs text-muted-foreground">
            {submissions?.length === 0
              ? "Submissions from /music/submit and /music/playlists will appear here."
              : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">{filtered.map((sub) => <SubmissionRow key={sub.id} sub={sub} />)}</div>
      )}
    </div>
  );
}

/* ─── Playlists tab ────────────────────────────────────────────────────── */

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  Spotify: SiSpotify,
  "Apple Music": SiApplemusic,
  "YouTube Music": SiYoutubemusic,
  SoundCloud: SiSoundcloud,
};

const PLATFORM_COLORS: Record<string, string> = {
  Spotify: "bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20",
  "Apple Music": "bg-[#FC3C44]/10 text-[#FC3C44] border-[#FC3C44]/20",
  "YouTube Music": "bg-[#FF0000]/10 text-[#FF0000] border-[#FF0000]/20",
  SoundCloud: "bg-[#FF5500]/10 text-[#FF5500] border-[#FF5500]/20",
};

const PLATFORMS = ["Spotify", "Apple Music", "YouTube Music", "SoundCloud"];

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
  open, onClose, playlist,
}: { open: boolean; onClose: () => void; playlist?: Playlist | null }) {
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

  useEffect(() => {
    form.reset({
      title: playlist?.title ?? "",
      slug: playlist?.slug ?? "",
      description: playlist?.description ?? "",
      platform: playlist?.platform ?? "",
      playlistUrl: playlist?.playlistUrl ?? "",
      coverImageUrl: playlist?.coverImageUrl ?? "",
      isOfficial: playlist?.isOfficial ?? true,
    });
  }, [playlist, open]);

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
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Playlist" : "Add Playlist"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Late Night Vibes" data-testid="input-playlist-title"
                    onChange={(e) => { field.onChange(e); if (!isEdit) form.setValue("slug", slugify(e.target.value)); }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl><Input {...field} placeholder="late-night-vibes" data-testid="input-playlist-slug" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input {...field} placeholder="Optional description" data-testid="input-playlist-description" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="platform" render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-playlist-platform"><SelectValue placeholder="Select platform" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="isOfficial" render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Official</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-playlist-official" />
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
          <img src={playlist.coverImageUrl} alt={playlist.title} className="h-full w-full object-cover rounded-lg" loading="lazy" />
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
        <Tooltip>
          <TooltipTrigger asChild>
            <a href={playlist.playlistUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-open-playlist-${playlist.id}`} aria-label="Open link">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </TooltipTrigger>
          <TooltipContent>Open playlist</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(playlist)} data-testid={`button-edit-playlist-${playlist.id}`} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost" size="icon"
                aria-label="Delete"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-playlist-${playlist.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function PlaylistsTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  const { data: playlists, isLoading } = useQuery<Playlist[]>({
    queryKey: ["/api/music/playlists"],
  });

  const handleEdit = (p: Playlist) => { setEditingPlaylist(p); setDialogOpen(true); };
  const handleClose = () => { setDialogOpen(false); setEditingPlaylist(null); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {playlists ? `${playlists.length} playlist${playlists.length !== 1 ? "s" : ""}` : "Loading..."}
        </p>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2" data-testid="button-add-playlist">
          <Plus className="h-4 w-4" /> Add Playlist
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : playlists && playlists.length > 0 ? (
        <div className="space-y-3">
          {playlists.map((p) => <PlaylistRow key={p.id} playlist={p} onEdit={handleEdit} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl">
          <ListMusic className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-semibold text-sm">No playlists yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first playlist to get started</p>
        </div>
      )}

      <PlaylistDialog open={dialogOpen} onClose={handleClose} playlist={editingPlaylist} />
    </div>
  );
}

/* ─── Spotify tab ──────────────────────────────────────────────────────── */

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function extractSpotifyId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/artist\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = trimmed.match(/spotify:artist:([A-Za-z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  return trimmed;
}

/* ── Add Artist Dialog ─────────────────────────────────────────────────── */

function AddArtistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);

  const handlePreview = async () => {
    const id = extractSpotifyId(input);
    if (!id) return;
    setPreviewing(true);
    setPreview(null);
    try {
      const resp = await apiRequest("GET", `/api/spotify/artists/${id}/preview`);
      const data = await resp.json();
      setPreview(data);
    } catch (e: any) {
      toast({ title: "Artist not found", description: e.message, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const addMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/spotify/artists", {
        spotifyArtistId: preview.id,
        displayName: preview.name,
        displayOrder: 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spotify/artists"] });
      toast({ title: "Artist added", description: `${preview.name} is now being tracked` });
      setInput("");
      setPreview(null);
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setInput("");
    setPreview(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Spotify Artist</DialogTitle>
          <DialogDescription>Enter a Spotify Artist ID or URL to track their stats.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Spotify Artist ID or URL"
              data-testid="input-spotify-artist-id"
              onKeyDown={(e) => e.key === "Enter" && handlePreview()}
            />
            <Button variant="outline" onClick={handlePreview} disabled={!input || previewing} data-testid="button-preview-artist">
              {previewing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {preview && (
            <div className="flex items-center gap-3 p-3 border rounded-xl bg-muted/30" data-testid="artist-preview">
              {preview.images?.[0]?.url && (
                <img src={preview.images[0].url} alt={preview.name} className="h-14 w-14 rounded-full object-cover" />
              )}
              <div>
                <p className="font-semibold">{preview.name}</p>
                {preview.followers?.total != null && (
                  <p className="text-xs text-muted-foreground">{formatFollowers(preview.followers.total)} followers</p>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            disabled={!preview || addMutation.isPending}
            onClick={() => addMutation.mutate()}
            data-testid="button-confirm-add-artist"
          >
            {addMutation.isPending ? "Adding..." : "Add Artist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Artist card ───────────────────────────────────────────────────────── */

function ArtistCard({ artist }: { artist: SpotifyArtist }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/spotify/artists", artist.spotifyArtistId, "stats"],
    queryFn: () => fetch(`/api/spotify/artists/${artist.spotifyArtistId}/stats`, { credentials: "include" }).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const removeMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/spotify/artists/${artist.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spotify/artists"] });
      toast({ title: "Artist removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const imageUrl = stats?.images?.[0]?.url;
  const followers = stats?.followers?.total;

  return (
    <div className="border rounded-xl p-4 space-y-3 hover:bg-muted/20 transition-colors" data-testid={`card-spotify-artist-${artist.id}`}>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {statsLoading ? (
            <Skeleton className="h-14 w-14 rounded-full" />
          ) : imageUrl ? (
            <img src={imageUrl} alt={artist.displayName} className="h-full w-full object-cover" />
          ) : (
            <Users className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{artist.displayName}</p>
          {statsLoading ? (
            <Skeleton className="h-3 w-24 mt-1" />
          ) : followers != null ? (
            <p className="text-xs text-muted-foreground">{formatFollowers(followers)} followers</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`https://open.spotify.com/artist/${artist.spotifyArtistId}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-spotify-artist-${artist.id}`}
              >
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#1DB954]" aria-label="Open in Spotify">
                  <SiSpotify className="h-4 w-4" />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>Open on Spotify</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                  aria-label="Remove"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending}
                data-testid={`button-remove-artist-${artist.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove artist</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {stats && (
        <div className="flex gap-2 flex-wrap">
          {stats.genres?.slice(0, 3).map((g: string) => (
            <Badge key={g} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{g}</Badge>
          ))}
          {stats.popularity != null && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Popularity {stats.popularity}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Spotify Playlist Manager ──────────────────────────────────────────── */

type SpotifyPlaylist = { id: string; name: string; images: { url: string }[]; tracks: { total: number }; public: boolean };
type SpotifyTrack = { track: { id: string; name: string; uri: string; duration_ms: number; artists: { name: string }[] } };

function CreatePlaylistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/spotify/playlists", { name, description, isPublic }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spotify/playlists"] });
      toast({ title: "Playlist created" });
      setName(""); setDescription(""); setIsPublic(true);
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Spotify Playlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Playlist name" data-testid="input-create-playlist-name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" data-testid="input-create-playlist-description" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} data-testid="switch-playlist-public" />
            <span className="text-sm">{isPublic ? "Public" : "Private"}</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!name || mutation.isPending} onClick={() => mutation.mutate()} data-testid="button-create-spotify-playlist">
            {mutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTrackDialog({ open, playlistId, onClose }: { open: boolean; playlistId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const resp = await apiRequest("GET", `/api/spotify/search?q=${encodeURIComponent(query)}`);
      const data = await resp.json();
      setResults(data?.tracks?.items || []);
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const addMutation = useMutation({
    mutationFn: (uri: string) => apiRequest("POST", `/api/spotify/playlists/${playlistId}/tracks`, { uris: [uri] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spotify/playlists", playlistId, "tracks"] });
      toast({ title: "Track added" });
      onClose();
      setQuery(""); setResults([]);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleClose = () => { setQuery(""); setResults([]); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Track</DialogTitle>
          <DialogDescription>Search for a track to add to this playlist.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks..."
              data-testid="input-search-track"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button variant="outline" onClick={handleSearch} disabled={!query || searching} data-testid="button-search-track">
              {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {results.length > 0 && (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {results.map((track: any) => (
                <button
                  key={track.id}
                  className="w-full flex items-center gap-3 p-2.5 border rounded-lg hover:bg-muted/40 transition-colors text-left"
                  onClick={() => addMutation.mutate(track.uri)}
                  disabled={addMutation.isPending}
                  data-testid={`button-add-track-${track.id}`}
                >
                  {track.album?.images?.[0]?.url && (
                    <img src={track.album.images[0].url} alt={track.name} className="h-9 w-9 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artists.map((a: any) => a.name).join(", ")}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDuration(track.duration_ms)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SpotifyPlaylistRow({ playlist }: { playlist: SpotifyPlaylist }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [addTrackOpen, setAddTrackOpen] = useState(false);

  const { data: tracks, isLoading: tracksLoading } = useQuery<{ items: SpotifyTrack[] }>({
    queryKey: ["/api/spotify/playlists", playlist.id, "tracks"],
    queryFn: () => fetch(`/api/spotify/playlists/${playlist.id}/tracks`, { credentials: "include" }).then((r) => r.json()),
    enabled: expanded,
    staleTime: 2 * 60 * 1000,
  });

  const removeTrackMutation = useMutation({
    mutationFn: (uri: string) =>
      apiRequest("DELETE", `/api/spotify/playlists/${playlist.id}/tracks`, { tracks: [{ uri }] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spotify/playlists", playlist.id, "tracks"] });
      toast({ title: "Track removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="border rounded-xl overflow-hidden" data-testid={`row-spotify-playlist-${playlist.id}`}>
      <button
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
        data-testid={`button-expand-playlist-${playlist.id}`}
      >
        <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {playlist.images?.[0]?.url ? (
            <img src={playlist.images[0].url} alt={playlist.name} className="h-full w-full object-cover" />
          ) : (
            <ListMusic className="h-5 w-5 text-muted-foreground opacity-50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{playlist.name}</p>
          <p className="text-xs text-muted-foreground">
            {playlist.tracks.total} track{playlist.tracks.total !== 1 ? "s" : ""} · {playlist.public ? "Public" : "Private"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`https://open.spotify.com/playlist/${playlist.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-open-spotify-playlist-${playlist.id}`}
              >
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#1DB954]" onClick={(e) => e.stopPropagation()} aria-label="Open link">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>Open on Spotify</TooltipContent>
          </Tooltip>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/10">
            <p className="text-xs font-medium text-muted-foreground">Tracks</p>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setAddTrackOpen(true)} data-testid={`button-add-track-${playlist.id}`}>
              <Plus className="h-3 w-3" /> Add Track
            </Button>
          </div>
          {tracksLoading ? (
            <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
          ) : !tracks?.items?.length ? (
            <p className="text-center text-xs text-muted-foreground py-6">No tracks in this playlist</p>
          ) : (
            <div className="divide-y">
              {tracks.items.filter((item) => item.track).map((item, idx) => (
                <div key={item.track.id + idx} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10 group" data-testid={`row-track-${item.track.id}`}>
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.track.artists.map((a) => a.name).join(", ")}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDuration(item.track.duration_ms)}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                          aria-label="Remove"
                        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => removeTrackMutation.mutate(item.track.uri)}
                        disabled={removeTrackMutation.isPending}
                        data-testid={`button-remove-track-${item.track.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove track</TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
          <AddTrackDialog open={addTrackOpen} playlistId={playlist.id} onClose={() => setAddTrackOpen(false)} />
        </div>
      )}
    </div>
  );
}

/* ── Main Spotify tab ──────────────────────────────────────────────────── */

function SpotifyTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addArtistOpen, setAddArtistOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);

  const { data: status, isLoading: statusLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/spotify/status"],
  });

  const { data: managedArtists, isLoading: artistsLoading } = useQuery<SpotifyArtist[]>({
    queryKey: ["/api/spotify/artists"],
    enabled: status?.connected === true,
  });

  const { data: spotifyPlaylists, isLoading: playlistsLoading } = useQuery<{ items: SpotifyPlaylist[] }>({
    queryKey: ["/api/spotify/playlists"],
    enabled: status?.connected === true,
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/spotify/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spotify/status"] });
      toast({ title: "Spotify disconnected" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (statusLoading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  }

  if (!status?.connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-[#1DB954]/10 flex items-center justify-center">
          <SiSpotify className="h-8 w-8 text-[#1DB954]" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Connect your Spotify account</h3>
          <p className="text-sm text-muted-foreground mt-1">Link Spotify to manage artists and playlists from the Command Center.</p>
        </div>
        <Button
          className="bg-[#1DB954] hover:bg-[#1aa34a] text-white gap-2"
          onClick={() => { window.location.href = "/api/spotify/auth"; }}
          data-testid="button-authorize-spotify"
        >
          <SiSpotify className="h-4 w-4" /> Authorize Spotify
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Data provided by <SiSpotify className="inline h-3 w-3 text-[#1DB954] mx-0.5" /> Spotify
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Connection status bar */}
      <div className="flex items-center justify-between p-3 border rounded-xl bg-[#1DB954]/5 border-[#1DB954]/20">
        <div className="flex items-center gap-2">
          <SiSpotify className="h-4 w-4 text-[#1DB954]" />
          <span className="text-sm font-medium text-[#1DB954]">Spotify Connected</span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-muted-foreground">Data from <SiSpotify className="inline h-3 w-3 text-[#1DB954] mx-0.5" /> Spotify</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground gap-1.5"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            data-testid="button-disconnect-spotify"
          >
            <Unlink className="h-3 w-3" /> Disconnect
          </Button>
        </div>
      </div>

      {/* Artist Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Artist Stats</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Track performance of SEVCO RECORDS artists</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setAddArtistOpen(true)} data-testid="button-add-spotify-artist">
            <Plus className="h-4 w-4" /> Add Artist
          </Button>
        </div>

        {artistsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : !managedArtists?.length ? (
          <div className="border border-dashed rounded-2xl p-10 text-center">
            <Users className="h-9 w-9 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="font-medium text-sm">No artists tracked yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add a Spotify artist to start monitoring their stats.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {managedArtists.map((a) => <ArtistCard key={a.id} artist={a} />)}
          </div>
        )}
      </div>

      {/* Playlist Manager */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Playlist Manager</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Manage Spotify playlists from your connected account</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreatePlaylistOpen(true)} data-testid="button-create-spotify-playlist-open">
            <Plus className="h-4 w-4" /> Create Playlist
          </Button>
        </div>

        {playlistsLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !spotifyPlaylists?.items?.length ? (
          <div className="border border-dashed rounded-2xl p-10 text-center">
            <ListMusic className="h-9 w-9 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="font-medium text-sm">No playlists found</p>
            <p className="text-xs text-muted-foreground mt-1">Playlists from your connected Spotify account will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {spotifyPlaylists.items.map((p) => <SpotifyPlaylistRow key={p.id} playlist={p} />)}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center">
          Playlist data provided by <SiSpotify className="inline h-3 w-3 text-[#1DB954] mx-0.5" /> Spotify
        </p>
      </div>

      <AddArtistDialog open={addArtistOpen} onClose={() => setAddArtistOpen(false)} />
      <CreatePlaylistDialog open={createPlaylistOpen} onClose={() => setCreatePlaylistOpen(false)} />
    </div>
  );
}

/* ─── Main export ──────────────────────────────────────────────────────── */

export default function CommandMusic() {
  const [location] = useLocation();
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const tabParam = params.get("tab");
  const defaultTab = tabParam === "spotify" ? "spotify" : "submissions";

  const { toast } = useToast();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get("error");
    const connected = searchParams.get("connected");
    if (connected === "1") {
      toast({ title: "Spotify connected!", description: "Your Spotify account is now linked." });
    } else if (error) {
      toast({ title: "Spotify auth failed", description: decodeURIComponent(error), variant: "destructive" });
    }
    if (error || connected) {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      url.searchParams.delete("connected");
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="submissions" data-testid="tab-submissions">
          <Music className="h-3.5 w-3.5 mr-1.5" /> Submissions
        </TabsTrigger>
        <TabsTrigger value="playlists" data-testid="tab-playlists">
          <ListMusic className="h-3.5 w-3.5 mr-1.5" /> Playlists
        </TabsTrigger>
        <TabsTrigger value="spotify" data-testid="tab-spotify">
          <SiSpotify className="h-3.5 w-3.5 mr-1.5 text-[#1DB954]" /> Spotify
        </TabsTrigger>
      </TabsList>
      <TabsContent value="submissions">
        <SubmissionsTab />
      </TabsContent>
      <TabsContent value="playlists">
        <PlaylistsTab />
      </TabsContent>
      <TabsContent value="spotify">
        <SpotifyTab />
      </TabsContent>
    </Tabs>
  );
}
