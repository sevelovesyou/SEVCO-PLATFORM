import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Play, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVoice } from "@/contexts/voice-context";
import { useAuth } from "@/hooks/use-auth";

type Announcement = {
  id: number;
  title: string;
  body: string | null;
  audioUrl: string | null;
  durationSec: number | null;
  kind: string;
  isPinned: boolean;
  createdAt: string;
  authorName: string | null;
  authorUsername: string | null;
};

export function AnnouncementBell() {
  const { user } = useAuth();
  const { visitorKey } = useVoice();
  const [open, setOpen] = useState(false);

  const { data: announcements = [], refetch } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    refetchInterval: 60_000,
  });

  const { data: dismissed = [], refetch: refetchDismissed } = useQuery<number[]>({
    queryKey: ["/api/announcements/dismissals", user?.id || visitorKey],
    queryFn: () => fetch(`/api/announcements/dismissals?visitorKey=${encodeURIComponent(visitorKey)}`, { credentials: "include" }).then(r => r.json()),
  });

  useEffect(() => {
    const onNew = () => refetch();
    window.addEventListener("sevco:announcement", onNew);
    return () => window.removeEventListener("sevco:announcement", onNew);
  }, [refetch]);

  const dismissedSet = new Set(dismissed);
  const unread = announcements.filter(a => !dismissedSet.has(a.id)).length;

  function markRead(id: number) {
    fetch(`/api/announcements/${id}/dismiss`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorKey }),
    }).then(() => refetchDismissed()).catch(() => {});
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label="Announcements"
          data-testid="button-announcement-bell"
        >
          <Megaphone className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" data-testid="popover-announcements">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <span className="text-sm font-semibold">Announcements</span>
          {announcements.length > 0 && (
            <button
              className="text-[11px] text-muted-foreground hover:underline"
              onClick={() => announcements.forEach(a => markRead(a.id))}
              data-testid="button-mark-all-announcements-read"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {announcements.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">No announcements yet.</div>
          )}
          {announcements.map((a) => {
            const isUnread = !dismissedSet.has(a.id);
            return (
              <div
                key={a.id}
                className={`px-3 py-2 border-b last:border-b-0 ${isUnread ? "bg-primary/5" : ""}`}
                data-testid={`announcement-item-${a.id}`}
              >
                <div className="flex items-start gap-2">
                  {a.isPinned && <Pin className="h-3 w-3 text-primary mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">{a.title}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                    {a.body && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-3">{a.body}</p>}
                    {a.audioUrl && (
                      <audio controls src={a.audioUrl} className="w-full h-7 mt-1.5" onPlay={() => isUnread && markRead(a.id)} />
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{a.authorName || a.authorUsername || "Admin"}</span>
                      {isUnread && (
                        <button
                          className="text-[10px] text-primary hover:underline ml-auto"
                          onClick={() => markRead(a.id)}
                          data-testid={`button-mark-announcement-read-${a.id}`}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
