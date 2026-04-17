import { useRef, useEffect, useState, type RefObject } from "react";
import ReactDOM from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, CheckSquare, AlertCircle, CheckCheck, Zap, Pin } from "lucide-react";
import type { Notification } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadAnnouncements, type Announcement } from "@/hooks/use-unread-announcements";

interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLElement>;
}

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function TypeIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0 mt-0.5";
  if (type === "spark") return <Zap className={`${cls} text-yellow-400 fill-yellow-400`} />;
  if (type === "email") return <Mail className={`${cls} text-blue-500`} />;
  if (type === "chat_dm" || type === "chat_channel") return <MessageCircle className={`${cls} text-green-500`} />;
  if (type === "task") return <CheckSquare className={`${cls} text-violet-500`} />;
  if (type === "staff_task") return <AlertCircle className={`${cls} text-orange-500`} />;
  return <Mail className={`${cls} text-muted-foreground`} />;
}

function AnnouncementsSection({
  announcements,
  dismissedSet,
  markRead,
}: {
  announcements: Announcement[];
  dismissedSet: Set<number>;
  markRead: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (announcements.length === 0) return null;

  const visible = expanded ? announcements : announcements.slice(0, 5);
  const hasMore = announcements.length > 5;

  return (
    <div data-testid="section-announcements">
      <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
        <p className="text-sm font-semibold">Announcements</p>
        <button
          className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => announcements.forEach((a) => !dismissedSet.has(a.id) && markRead(a.id))}
          data-testid="button-mark-all-announcements-read"
        >
          Mark all read
        </button>
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {visible.map((a) => {
          const isUnread = !dismissedSet.has(a.id);
          return (
            <div
              key={a.id}
              className={`px-4 py-2.5 border-b border-border/40 last:border-b-0 ${isUnread ? "bg-primary/5" : ""}`}
              data-testid={`announcement-item-${a.id}`}
            >
              <div className="flex items-start gap-2">
                {a.isPinned && <Pin className="h-3 w-3 text-primary mt-1 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">{a.title}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {a.body && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-3">{a.body}</p>
                  )}
                  {a.audioUrl && (
                    <audio
                      controls
                      src={a.audioUrl}
                      className="w-full h-7 mt-1.5"
                      onPlay={() => isUnread && markRead(a.id)}
                    />
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {a.authorName || a.authorUsername || "Admin"}
                    </span>
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
      {hasMore && !expanded && (
        <div className="border-b border-border/60 px-4 py-2">
          <button
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
            onClick={() => setExpanded(true)}
            data-testid="button-view-all-announcements"
          >
            View all ({announcements.length})
          </button>
        </div>
      )}
    </div>
  );
}

export function NotificationDropdown({ open, onClose, triggerRef }: NotificationDropdownProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  const { announcements, dismissedSet, markRead } = useUnreadAnnouncements();

  const { data: notifs = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: open && !!user,
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    if (triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef?.current && triggerRef.current.contains(target)) return;
      if (ref.current && !ref.current.contains(target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose, triggerRef]);

  if (!open || !position) return null;

  function handleNotifClick(n: Notification) {
    if (!n.isRead) {
      markOneMutation.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
    onClose();
  }

  const hasUnread = notifs.some((n) => !n.isRead);
  const showAnnouncements = announcements.length > 0;
  const showNotifications = !!user;
  const bothEmpty = !showAnnouncements && (!showNotifications || notifs.length === 0);

  return ReactDOM.createPortal(
    <div
      ref={ref}
      data-testid="notification-dropdown"
      className="fixed w-[340px] rounded-xl border bg-popover shadow-xl z-[9999] overflow-hidden"
      style={{ top: position.top, right: position.right }}
    >
      <AnnouncementsSection
        announcements={announcements}
        dismissedSet={dismissedSet}
        markRead={markRead}
      />

      {showAnnouncements && showNotifications && (
        <div className="h-px bg-border" data-testid="divider-sections" />
      )}

      {showNotifications && notifs.length > 0 && (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <p className="text-sm font-semibold">Notifications</p>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifs.length > 0 && (
              notifs.map((n) => (
                <button
                  key={n.id}
                  data-testid={`notif-item-${n.id}`}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/50 transition-colors ${
                    !n.isRead
                      ? n.type === "spark"
                        ? "bg-yellow-400/5"
                        : "bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {!n.isRead && (
                      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${n.type === "spark" ? "bg-yellow-400" : "bg-blue-500"}`} />
                    )}
                    {n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />}
                    <TypeIcon type={n.type} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium leading-snug ${
                        !n.isRead
                          ? n.type === "spark"
                            ? "text-yellow-500 dark:text-yellow-400"
                            : "text-foreground"
                          : "text-muted-foreground"
                      }`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {notifs.length > 0 && (
            <div className="border-t border-border/60 px-4 py-2.5">
              <button
                className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { navigate("/messages"); onClose(); }}
                data-testid="link-view-all-notifications"
              >
                <span>View all notifications</span>
                <span>→</span>
              </button>
            </div>
          )}
        </>
      )}

      {bothEmpty && (
        <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-empty-dropdown">
          You're all caught up 🎉
        </p>
      )}
    </div>,
    document.body
  );
}
