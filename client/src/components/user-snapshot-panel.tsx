import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Mail, StickyNote, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { UserTask, Email, Note, StaffTask } from "@shared/schema";
import { usePermission } from "@/hooks/use-permission";

interface UserSnapshotPanelProps {
  variant?: "dark" | "default";
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1">
          <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export function UserSnapshotPanel({ variant = "default" }: UserSnapshotPanelProps) {
  const isDark = variant === "dark";

  const cardClass = isDark
    ? "bg-white/[0.03] border border-white/[0.07] text-white"
    : "";

  const mutedClass = isDark
    ? "text-white/50"
    : "text-muted-foreground";

  const headerMutedClass = isDark
    ? "text-white/70"
    : "text-muted-foreground";

  const dividerClass = isDark
    ? "border-white/[0.07]"
    : "border-border";

  const hoverRowClass = isDark
    ? "hover:bg-white/[0.04]"
    : "hover:bg-muted/50";

  const { role } = usePermission();
  const isStaffOrAbove = ["admin", "executive", "staff"].includes(role ?? "");

  const { data: tasks, isLoading: tasksLoading } = useQuery<UserTask[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: staffTasks, isLoading: staffTasksLoading } = useQuery<StaffTask[]>({
    queryKey: ["/api/tasks/staff"],
    enabled: isStaffOrAbove,
  });

  const { data: emailsResponse, isLoading: emailsLoading } = useQuery<{ emails: Email[]; total: number } | null>({
    queryKey: ["/api/email/messages", "inbox"],
    queryFn: () =>
      fetch("/api/email/messages?folder=inbox&limit=5")
        .then((r) => {
          if (!r.ok) throw new Error("Email not configured");
          return r.json();
        })
        .catch(() => null),
  });

  const { data: notes, isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const incompletePersonal = (tasks ?? []).filter((t) => !t.completed).slice(0, 2);
  const incompleteStaff = (staffTasks ?? []).filter((t) => !t.completed).slice(0, 2);
  const totalIncomplete =
    (tasks ?? []).filter((t) => !t.completed).length +
    (staffTasks ?? []).filter((t) => !t.completed).length;

  const inboxEmails = (emailsResponse?.emails ?? []).slice(0, 3);

  const sortedNotes = (notes ?? [])
    .slice()
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime();
    })
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="user-snapshot-panel">
      {/* Tasks */}
      <Card className={cardClass} data-testid="snapshot-card-tasks">
        <CardHeader className={`pb-2 pt-4 px-4 border-b ${dividerClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className={`h-4 w-4 ${isDark ? "text-white/70" : "text-foreground"}`} />
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-foreground"}`}>Tasks</span>
              {!tasksLoading && !(isStaffOrAbove && staffTasksLoading) && (
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 ${isDark ? "bg-white/10 text-white/70 border-white/10" : ""}`}
                  data-testid="badge-task-count"
                >
                  {totalIncomplete}
                </Badge>
              )}
            </div>
            <Link href="/tools/tasks">
              <span className={`text-xs ${isDark ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground"} transition-colors cursor-pointer`} data-testid="link-tasks-viewall">
                View all
              </span>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="px-4 pt-3 pb-4">
          {tasksLoading || (isStaffOrAbove && staffTasksLoading) ? (
            <SkeletonRows />
          ) : (
            <>
              {incompletePersonal.length > 0 && (
                <>
                  {isStaffOrAbove && (
                    <p className={`text-[10px] font-semibold uppercase tracking-widest ${mutedClass} mb-1`}>
                      Personal
                    </p>
                  )}
                  <ul className="flex flex-col gap-0.5" data-testid="list-tasks-personal">
                    {incompletePersonal.map((task) => (
                      <li
                        key={task.id}
                        className={`flex items-center gap-2 py-1.5 px-1 rounded-md ${hoverRowClass} transition-colors`}
                        data-testid={`task-row-${task.id}`}
                      >
                        <span className={`text-base leading-none ${mutedClass}`}>⬜</span>
                        <span className={`flex-1 text-xs truncate ${isDark ? "text-white/90" : "text-foreground"}`}>{task.title}</span>
                        {task.dueDate && (
                          <span className={`text-[10px] shrink-0 ${mutedClass}`}>{relativeDate(task.dueDate)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {isStaffOrAbove && incompleteStaff.length > 0 && (
                <>
                  <p className={`text-[10px] font-semibold uppercase tracking-widest ${mutedClass} mt-2 mb-1`}>
                    Team
                  </p>
                  <ul className="flex flex-col gap-0.5" data-testid="list-tasks-staff">
                    {incompleteStaff.map((task) => (
                      <li
                        key={`staff-${task.id}`}
                        className={`flex items-center gap-2 py-1.5 px-1 rounded-md ${hoverRowClass} transition-colors`}
                        data-testid={`staff-task-row-${task.id}`}
                      >
                        <span className={`text-base leading-none ${mutedClass}`}>⬜</span>
                        <span className={`flex-1 text-xs truncate ${isDark ? "text-white/90" : "text-foreground"}`}>{task.title}</span>
                        {task.dueDate && (
                          <span className={`text-[10px] shrink-0 ${mutedClass}`}>{relativeDate(task.dueDate)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {incompletePersonal.length === 0 && (!isStaffOrAbove || incompleteStaff.length === 0) && (
                <p className={`text-xs ${mutedClass} py-2`} data-testid="empty-tasks">No open tasks</p>
              )}
            </>
          )}
          <Link href="/tools/tasks">
            <div className={`mt-3 flex items-center gap-1 text-xs ${isDark ? "text-white/40 hover:text-white/70" : "text-muted-foreground hover:text-foreground"} transition-colors cursor-pointer`} data-testid="link-tasks-footer">
              <span>View all →</span>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Inbox */}
      <Card className={cardClass} data-testid="snapshot-card-inbox">
        <CardHeader className={`pb-2 pt-4 px-4 border-b ${dividerClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className={`h-4 w-4 ${isDark ? "text-white/70" : "text-foreground"}`} />
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-foreground"}`}>Inbox</span>
              {!emailsLoading && emailsResponse !== null && (
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 ${isDark ? "bg-white/10 text-white/70 border-white/10" : ""}`}
                  data-testid="badge-inbox-count"
                >
                  {(emailsResponse?.emails ?? []).filter((e) => !e.isRead).length}
                </Badge>
              )}
            </div>
            <Link href="/messages">
              <span className={`text-xs ${isDark ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground"} transition-colors cursor-pointer`} data-testid="link-inbox-viewall">
                View all
              </span>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="px-4 pt-3 pb-4">
          {emailsLoading ? (
            <SkeletonRows />
          ) : emailsResponse === null ? (
            <p className={`text-xs ${mutedClass} py-2`} data-testid="empty-inbox-error">Email not configured</p>
          ) : inboxEmails.length === 0 ? (
            <p className={`text-xs ${mutedClass} py-2`} data-testid="empty-inbox">No messages</p>
          ) : (
            <ul className="flex flex-col gap-0.5" data-testid="list-inbox">
              {inboxEmails.map((email) => (
                <li
                  key={email.id}
                  className={`flex items-center gap-2 py-1.5 px-1 rounded-md ${hoverRowClass} transition-colors`}
                  data-testid={`email-row-${email.id}`}
                >
                  {!email.isRead && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" aria-label="Unread" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${!email.isRead ? (isDark ? "text-white font-medium" : "text-foreground font-medium") : (isDark ? "text-white/70" : "text-foreground/70")}`}>
                      {email.fromAddress}
                    </p>
                    <p className={`text-[10px] truncate ${mutedClass}`}>{email.subject || "(no subject)"}</p>
                  </div>
                  <span className={`text-[10px] shrink-0 ${mutedClass}`}>{relativeDate(email.createdAt?.toString())}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/messages">
            <div className={`mt-3 flex items-center gap-1 text-xs ${isDark ? "text-white/40 hover:text-white/70" : "text-muted-foreground hover:text-foreground"} transition-colors cursor-pointer`} data-testid="link-inbox-footer">
              <span>View all →</span>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className={cardClass} data-testid="snapshot-card-notes">
        <CardHeader className={`pb-2 pt-4 px-4 border-b ${dividerClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className={`h-4 w-4 ${isDark ? "text-white/70" : "text-foreground"}`} />
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-foreground"}`}>Notes</span>
              {!notesLoading && (
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 ${isDark ? "bg-white/10 text-white/70 border-white/10" : ""}`}
                  data-testid="badge-notes-count"
                >
                  {(notes ?? []).length}
                </Badge>
              )}
            </div>
            <Link href="/notes">
              <span className={`text-xs ${isDark ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground"} transition-colors cursor-pointer`} data-testid="link-notes-viewall">
                View all
              </span>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="px-4 pt-3 pb-4">
          {notesLoading ? (
            <SkeletonRows />
          ) : sortedNotes.length === 0 ? (
            <p className={`text-xs ${mutedClass} py-2`} data-testid="empty-notes">No notes yet</p>
          ) : (
            <ul className="flex flex-col gap-0.5" data-testid="list-notes">
              {sortedNotes.map((note) => (
                <li
                  key={note.id}
                  className={`flex items-center gap-2 py-1.5 px-1 rounded-md ${hoverRowClass} transition-colors`}
                  data-testid={`note-row-${note.id}`}
                >
                  {note.pinned && (
                    <Pin className={`h-3 w-3 shrink-0 ${isDark ? "text-white/50" : "text-muted-foreground"}`} aria-label="Pinned" />
                  )}
                  <span className={`flex-1 text-xs truncate ${isDark ? "text-white/90" : "text-foreground"}`}>
                    {note.title || "Untitled"}
                  </span>
                  <span className={`text-[10px] shrink-0 ${mutedClass}`}>
                    {relativeDate((note.updatedAt ?? note.createdAt)?.toString())}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/notes">
            <div className={`mt-3 flex items-center gap-1 text-xs ${isDark ? "text-white/40 hover:text-white/70" : "text-muted-foreground hover:text-foreground"} transition-colors cursor-pointer`} data-testid="link-notes-footer">
              <span>View all →</span>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
