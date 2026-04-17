import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useVoice } from "@/contexts/voice-context";

export type Announcement = {
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

export function useUnreadAnnouncements() {
  const { user } = useAuth();
  const { visitorKey } = useVoice();

  const { data: announcements = [], refetch } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    refetchInterval: 60_000,
  });

  const { data: dismissed = [], refetch: refetchDismissed } = useQuery<number[]>({
    queryKey: ["/api/announcements/dismissals", user?.id || visitorKey],
    queryFn: () =>
      fetch(`/api/announcements/dismissals?visitorKey=${encodeURIComponent(visitorKey)}`, {
        credentials: "include",
      }).then((r) => r.json()),
  });

  useEffect(() => {
    const onNew = () => refetch();
    window.addEventListener("sevco:announcement", onNew);
    return () => window.removeEventListener("sevco:announcement", onNew);
  }, [refetch]);

  const dismissedSet = new Set(dismissed);
  const unread = announcements.filter((a) => !dismissedSet.has(a.id));

  const sorted = [...announcements].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  function markRead(id: number) {
    return fetch(`/api/announcements/${id}/dismiss`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorKey }),
    })
      .then(() => refetchDismissed())
      .catch(() => {});
  }

  return {
    announcements: sorted,
    dismissedSet,
    unreadCount: unread.length,
    markRead,
  };
}
