import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Reply,
  CornerUpLeft,
  Forward,
  Star,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  Paperclip,
  Maximize2,
  CheckCheck,
  Download,
  File,
  Archive,
  FolderInput,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Email } from "@shared/schema";
import DOMPurify from "dompurify";
import { formatDistanceToNow, format } from "date-fns";
import { EmailComposeModal } from "./email-compose-modal";

interface EmailThread {
  threadId: string;
  subject: string;
  participants: string[];
  latestDate: string | Date;
  messageCount: number;
  hasUnread: boolean;
  hasAttachment: boolean;
  latestSnippet: string;
  emails: Email[];
}

interface EmailThreadViewProps {
  thread: EmailThread;
  fromAddress: string;
  onDeleted?: () => void;
}

function formatEmailDate(date: string | Date): string {
  const d = new Date(date);
  try {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 1000 * 60 * 60 * 24) {
      return formatDistanceToNow(d, { addSuffix: true });
    }
    return format(d, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return String(date);
  }
}

function safeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "b", "strong", "i", "em", "u", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td", "div", "span", "img",
      "hr", "sub", "sup",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "style", "target", "rel"],
    ALLOW_DATA_ATTR: false,
    ADD_DATA_URI_TAGS: ["img"],
  });
}

function InitialsAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(/[@\s]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sz = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-sm";
  return (
    <div className={`${sz} rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0`}>
      {initials || "?"}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractSenderName(fromAddress: string): string {
  return fromAddress.match(/^(.+?)\s*</)?.[1]?.trim() ?? fromAddress.split("@")[0];
}

function ThreadMessage({
  email,
  isLast,
  defaultExpanded,
}: {
  email: Email;
  isLast: boolean;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const senderName = extractSenderName(email.fromAddress);
  const senderEmail = email.fromAddress.match(/<(.+?)>/)?.[1] ?? email.fromAddress;
  const sanitizedHtml = email.bodyHtml ? safeHtml(email.bodyHtml) : "";
  const bodyPreview = email.bodyText?.replace(/\s+/g, " ").trim().slice(0, 120) || "";
  const attachments = (email.attachments as Array<{ filename: string; contentType: string; url: string; size: number; content?: string }>) ?? [];

  return (
    <div
      className={`border rounded-lg ${isLast ? "border-primary/20 bg-background" : "border-border/50 bg-muted/10"}`}
      data-testid={`thread-message-${email.id}`}
    >
      <div
        className={`flex items-start gap-3 px-4 py-3 transition-colors rounded-t-lg ${isLast ? "" : "cursor-pointer hover:bg-muted/30"}`}
        onClick={() => { if (!isLast) setExpanded((s) => !s); }}
        data-testid={`button-toggle-email-${email.id}`}
      >
        <InitialsAvatar name={senderName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm truncate ${!email.isRead ? "font-semibold" : "font-medium"}`} data-testid={`text-thread-msg-sender-${email.id}`}>
                {senderName}
              </span>
              {!email.isRead && <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" data-testid={`indicator-unread-${email.id}`} />}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {attachments.length > 0 && <Paperclip className="h-3 w-3 text-muted-foreground" />}
              <span className="text-[11px] text-muted-foreground" data-testid={`text-thread-msg-date-${email.id}`}>{formatEmailDate(email.createdAt)}</span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </div>
          {!expanded && bodyPreview && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{bodyPreview}</p>
          )}
          {!expanded && (
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">To: {email.toAddresses.join(", ")}</p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="text-xs text-muted-foreground mb-3 space-y-0.5 pl-10">
            <div>From: <span className="text-foreground/80">{senderEmail}</span></div>
            <div>To: <span className="text-foreground/80">{email.toAddresses.join(", ")}</span></div>
            {email.ccAddresses && email.ccAddresses.length > 0 && (
              <div>CC: <span className="text-foreground/80">{email.ccAddresses.join(", ")}</span></div>
            )}
          </div>
          <div className="pl-10">
            {sanitizedHtml ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                data-testid={`email-body-html-${email.id}`}
              />
            ) : email.bodyText ? (
              <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed" data-testid={`email-body-text-${email.id}`}>
                {email.bodyText}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground italic">(empty message)</p>
            )}

            {attachments.length > 0 && (
              <div className="mt-4 pt-3 border-t" data-testid={`email-attachments-${email.id}`}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Attachments ({attachments.length})
                </p>
                <div className="space-y-1.5">
                  {attachments.map((att, idx) => {
                    const hasValidUrl = att.url && att.url.startsWith("http");
                    const downloadUrl = hasValidUrl ? att.url : `/api/email/messages/${email.id}/attachments/${idx}`;
                    const hasDownload = !!(hasValidUrl || att.content);
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30" data-testid={`attachment-${email.id}-${idx}`}>
                        <File className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{att.filename}</p>
                          <p className="text-[11px] text-muted-foreground">{formatBytes(att.size)}</p>
                        </div>
                        {hasDownload && (
                          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-download-attachment-${email.id}-${idx}`}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EmailThreadView({ thread, fromAddress, onDeleted }: EmailThreadViewProps) {
  const { toast } = useToast();
  const [showCollapsed, setShowCollapsed] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [composeMode, setComposeMode] = useState<"reply" | "reply-all" | "forward" | null>(null);

  const sortedEmails = [...thread.emails].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const latestEmail = sortedEmails[sortedEmails.length - 1];
  const firstEmail = sortedEmails[0];
  const middleEmails = sortedEmails.length > 2 ? sortedEmails.slice(1, -1) : [];
  const collapsedCount = middleEmails.length;

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadEmails = thread.emails.filter((e) => !e.isRead);
      await Promise.all(
        unreadEmails.map((e) =>
          fetch(`/api/email/messages/${e.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isRead: true }),
          })
        )
      );
    },
    onSuccess: () => {
      toast({ title: "All messages marked as read" });
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
    },
  });

  const deleteThreadMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        thread.emails.map((e) =>
          apiRequest("DELETE", `/api/email/messages/${e.id}`)
        )
      );
    },
    onSuccess: () => {
      toast({ title: "Thread moved to trash" });
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
      onDeleted?.();
    },
  });

  const archiveThreadMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        thread.emails.map((e) =>
          apiRequest("POST", `/api/email/messages/${e.id}/move`, { folder: "trash" })
        )
      );
    },
    onSuccess: () => {
      toast({ title: "Thread archived" });
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
      onDeleted?.();
    },
  });

  const moveThreadMutation = useMutation({
    mutationFn: async (folder: string) => {
      await Promise.all(
        thread.emails.map((e) =>
          apiRequest("POST", `/api/email/messages/${e.id}/move`, { folder })
        )
      );
    },
    onSuccess: (_data, folder) => {
      toast({ title: `Thread moved to ${folder}` });
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
      onDeleted?.();
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async (body: string) => {
      const replySubject = latestEmail.subject.startsWith("Re:") ? latestEmail.subject : `Re: ${latestEmail.subject}`;
      return apiRequest("POST", "/api/email/send", {
        to: [latestEmail.fromAddress],
        subject: replySubject,
        text: body,
        replyTo: latestEmail.fromAddress,
        threadId: thread.threadId,
      });
    },
    onSuccess: () => {
      toast({ title: "Reply sent" });
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/email/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/folders"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send reply", description: err.message, variant: "destructive" });
    },
  });

  function handleSendReply() {
    if (!replyText.trim()) return;
    sendReplyMutation.mutate(replyText.trim());
  }

  function getReplyInitial(): { to: string[]; subject: string; body: string } {
    const quotedBody = `\n\n---\nOn ${formatEmailDate(latestEmail.createdAt)}, ${latestEmail.fromAddress} wrote:\n${latestEmail.bodyText || ""}`;
    return {
      to: [latestEmail.fromAddress],
      subject: latestEmail.subject.startsWith("Re:") ? latestEmail.subject : `Re: ${latestEmail.subject}`,
      body: quotedBody,
    };
  }

  function getReplyAllInitial(): { to: string[]; subject: string; body: string } {
    const base = getReplyInitial();
    const allRecipients = [...latestEmail.toAddresses, ...(latestEmail.ccAddresses ?? [])].filter((addr) => addr !== fromAddress);
    return { ...base, to: [latestEmail.fromAddress, ...allRecipients] };
  }

  function getForwardInitial(): { to: string[]; subject: string; body: string } {
    const quotedBody = `\n\n--- Forwarded Message ---\nFrom: ${latestEmail.fromAddress}\nTo: ${latestEmail.toAddresses.join(", ")}\nDate: ${formatEmailDate(latestEmail.createdAt)}\nSubject: ${latestEmail.subject}\n\n${latestEmail.bodyText || ""}`;
    return {
      to: [],
      subject: latestEmail.subject.startsWith("Fwd:") ? latestEmail.subject : `Fwd: ${latestEmail.subject}`,
      body: quotedBody,
    };
  }

  const composeProps = composeMode === "reply" ? getReplyInitial()
    : composeMode === "reply-all" ? getReplyAllInitial()
    : composeMode === "forward" ? getForwardInitial()
    : { to: [], subject: "", body: "" };

  const visibleEmails: { email: Email; isLast: boolean; defaultExpanded: boolean }[] = [];

  if (sortedEmails.length === 1) {
    visibleEmails.push({ email: sortedEmails[0], isLast: true, defaultExpanded: true });
  } else {
    visibleEmails.push({ email: firstEmail, isLast: false, defaultExpanded: false });
    if (showCollapsed) {
      middleEmails.forEach((e) => {
        visibleEmails.push({ email: e, isLast: false, defaultExpanded: false });
      });
    }
    visibleEmails.push({ email: latestEmail, isLast: true, defaultExpanded: true });
  }

  return (
    <div className="flex flex-col h-full" data-testid="email-thread-view">
      <div className="border-b px-4 py-3 flex items-start justify-between gap-2 shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground" data-testid="text-thread-subject">
            {thread.subject || "(no subject)"}
          </h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground" data-testid="text-thread-message-count">
              {thread.messageCount} message{thread.messageCount !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground" data-testid="text-thread-participant-count">
              {thread.participants.length} participant{thread.participants.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {thread.hasUnread && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => archiveThreadMutation.mutate()}
            disabled={archiveThreadMutation.isPending}
            data-testid="button-archive-thread"
            title="Archive thread"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => moveThreadMutation.mutate("inbox")}
            disabled={moveThreadMutation.isPending}
            data-testid="button-move-thread"
            title="Move to inbox"
          >
            <FolderInput className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => deleteThreadMutation.mutate()}
            disabled={deleteThreadMutation.isPending}
            data-testid="button-delete-thread"
            title="Delete thread"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {sortedEmails.length > 2 && !showCollapsed && (
          <>
            <ThreadMessage
              email={firstEmail}
              isLast={false}
              defaultExpanded={false}
            />
            <button
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
              onClick={() => setShowCollapsed(true)}
              data-testid="button-expand-thread-messages"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              {collapsedCount} earlier message{collapsedCount !== 1 ? "s" : ""}
            </button>
            <ThreadMessage
              email={latestEmail}
              isLast={true}
              defaultExpanded={true}
            />
          </>
        )}

        {(sortedEmails.length <= 2 || showCollapsed) &&
          visibleEmails.map(({ email, isLast, defaultExpanded }) => (
            <ThreadMessage
              key={email.id}
              email={email}
              isLast={isLast}
              defaultExpanded={defaultExpanded}
            />
          ))
        }
      </div>

      <div className="border-t px-4 py-3 space-y-3 shrink-0" data-testid="inline-reply-section">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Reply className="h-3.5 w-3.5" />
          <span>Reply to {extractSenderName(latestEmail.fromAddress)}</span>
        </div>
        <Textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Write a reply..."
          className="min-h-[80px] resize-none text-sm"
          data-testid="input-inline-reply"
        />
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setComposeMode("reply")}
            data-testid="button-expand-to-compose"
          >
            <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
            Expand to full compose
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComposeMode("reply-all")}
              data-testid="button-reply-all"
            >
              <CornerUpLeft className="h-3.5 w-3.5 mr-1.5" />
              Reply All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComposeMode("forward")}
              data-testid="button-forward"
            >
              <Forward className="h-3.5 w-3.5 mr-1.5" />
              Forward
            </Button>
            <Button
              size="sm"
              onClick={handleSendReply}
              disabled={!replyText.trim() || sendReplyMutation.isPending}
              data-testid="button-send-inline-reply"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {sendReplyMutation.isPending ? "Sending..." : "Send Reply"}
            </Button>
          </div>
        </div>
      </div>

      {composeMode && (
        <EmailComposeModal
          open={!!composeMode}
          onClose={() => setComposeMode(null)}
          fromAddress={fromAddress}
          initialTo={composeProps.to}
          initialSubject={composeProps.subject}
          initialBody={composeProps.body}
          mode={composeMode}
        />
      )}
    </div>
  );
}
