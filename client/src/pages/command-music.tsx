import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Music, ExternalLink, Filter, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import type { MusicSubmission } from "@shared/schema";

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
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${STATUS_STYLES[sub.status] ?? ""}`}>
            <StatusIcon className="h-2.5 w-2.5" />
            {sub.status}
          </Badge>
        </div>
      </div>

      {sub.notes && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 line-clamp-2">
          {sub.notes}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <a
          href={sub.trackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          data-testid={`link-track-${sub.id}`}
        >
          <ExternalLink className="h-3 w-3" />
          Listen
        </a>
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

export default function CommandMusic() {
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
          <Filter className="h-3.5 w-3.5" />
          Filter:
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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
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

      {/* Submissions list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
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
        <div className="space-y-3">
          {filtered.map((sub) => (
            <SubmissionRow key={sub.id} sub={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
