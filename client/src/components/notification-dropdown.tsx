import { useRef, useEffect, useState, type RefObject } from "react";
import ReactDOM from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, CheckSquare, AlertCircle, CheckCheck, Zap } from "lucide-react";
import type { Notification } from "@shared/schema";

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

export function NotificationDropdown({ open, onClose, triggerRef }: NotificationDropdownProps) {
  const [, navigate] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  const { data: notifs = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: open,
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

  return ReactDOM.createPortal(
    <div
      ref={ref}
      data-testid="notification-dropdown"
      className="fixed w-[340px] rounded-xl border bg-popover shadow-xl z-[9999] overflow-hidden"
      style={{ top: position.top, right: position.right }}
    >
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
        {notifs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            You're all caught up 🎉
          </p>
        ) : (
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
    </div>,
    document.body
  );
}
