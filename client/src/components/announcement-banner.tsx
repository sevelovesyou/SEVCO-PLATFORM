import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVoice } from "@/contexts/voice-context";
import { Megaphone, Radio, X, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function AnnouncementBanner() {
  const { liveAnnouncement, prefs, updatePrefs, visitorKey } = useVoice();
  const { user } = useAuth();
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  const { data: announcements = [], refetch } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    refetchInterval: 60_000,
  });

  const { data: serverDismissed = [] } = useQuery<number[]>({
    queryKey: ["/api/announcements/dismissals", user?.id || visitorKey],
    queryFn: () => fetch(`/api/announcements/dismissals?visitorKey=${encodeURIComponent(visitorKey)}`, { credentials: "include" }).then(r => r.json()),
  });

  useEffect(() => {
    if (Array.isArray(serverDismissed) && serverDismissed.length > 0) {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        for (const id of serverDismissed) next.add(id);
        return next;
      });
    }
  }, [serverDismissed]);

  // Listen for new announcement events from voice context
  useEffect(() => {
    const onNew = () => refetch();
    const onDel = () => refetch();
    window.addEventListener("sevco:announcement", onNew);
    window.addEventListener("sevco:announcement-deleted", onDel);
    return () => {
      window.removeEventListener("sevco:announcement", onNew);
      window.removeEventListener("sevco:announcement-deleted", onDel);
    };
  }, [refetch]);

  function dismiss(id: number) {
    setDismissedIds((s) => new Set([...s, id]));
    fetch(`/api/announcements/${id}/dismiss`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorKey }),
    }).catch(() => {});
  }

  // Live announcement takes priority
  if (liveAnnouncement) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-3 shadow-md" data-testid="announcement-banner-live">
        <Radio className="h-4 w-4 motion-safe:animate-pulse" />
        <span className="text-sm font-medium">LIVE: {liveAnnouncement.title}</span>
        <span className="text-xs opacity-80">— {liveAnnouncement.authorName || "Admin"}</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 ml-2 text-white hover:bg-white/20"
          onClick={() => updatePrefs({ muteAnnouncements: !prefs.muteAnnouncements })}
          aria-label="Toggle announcement audio"
          data-testid="button-mute-live-announcement"
        >
          {prefs.muteAnnouncements ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
    );
  }

  const visiblePinned = announcements.find(a => a.isPinned && !dismissedIds.has(a.id));
  if (!visiblePinned) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between gap-3 shadow-md" data-testid={`announcement-banner-${visiblePinned.id}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Megaphone className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium truncate">{visiblePinned.title}</span>
        {visiblePinned.audioUrl && (
          <audio controls src={visiblePinned.audioUrl} className="h-6 max-w-[200px] hidden sm:block" />
        )}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
        onClick={() => dismiss(visiblePinned.id)}
        aria-label="Dismiss announcement"
        data-testid={`button-dismiss-announcement-${visiblePinned.id}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
