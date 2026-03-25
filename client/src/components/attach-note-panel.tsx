import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  StickyNote,
  Plus,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Note, NoteAttachment } from "@shared/schema";

interface AttachNotePanelProps {
  resourceType: "project" | "article";
  resourceId: number;
}

export function AttachNotePanel({ resourceType, resourceId }: AttachNotePanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  if (!user) return null;

  const { data: myNotes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    enabled: expanded,
  });

  const { data: attachedNotes = [], isLoading: attachedLoading, refetch: refetchAttached } = useQuery<{ noteId: number; attachmentId: number; title: string }[]>({
    queryKey: ["/api/resource-notes", resourceType, resourceId],
    queryFn: async () => {
      const notesList = await fetch("/api/notes", { credentials: "include" }).then((r) => r.json()) as Note[];
      const results: { noteId: number; attachmentId: number; title: string }[] = [];
      await Promise.all(
        notesList.map(async (note) => {
          const atts: NoteAttachment[] = await fetch(`/api/notes/${note.id}/attachments`, { credentials: "include" }).then((r) => r.json());
          const match = atts.find((a) => a.resourceType === resourceType && a.resourceId === resourceId);
          if (match) {
            results.push({ noteId: note.id, attachmentId: match.id, title: note.title });
          }
        })
      );
      return results;
    },
    enabled: expanded,
  });

  const attachMutation = useMutation({
    mutationFn: (noteId: number) =>
      apiRequest("POST", `/api/notes/${noteId}/attachments`, { resourceType, resourceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resource-notes", resourceType, resourceId] });
      setShowPicker(false);
      toast({ title: "Note attached" });
    },
    onError: () => toast({ title: "Failed to attach note", variant: "destructive" }),
  });

  const detachMutation = useMutation({
    mutationFn: (attachmentId: number) =>
      apiRequest("DELETE", `/api/notes/attachments/${attachmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resource-notes", resourceType, resourceId] });
      toast({ title: "Note detached" });
    },
    onError: () => toast({ title: "Failed to detach note", variant: "destructive" }),
  });

  const attachedIds = new Set(attachedNotes.map((a) => a.noteId));
  const availableNotes = myNotes.filter((n) => !attachedIds.has(n.id));

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        data-testid="button-toggle-notes-panel"
      >
        <div className="flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h3>
          {attachedNotes.length > 0 && (
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 rounded-full">
              {attachedNotes.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="divide-y divide-border">
          {attachedLoading ? (
            <div className="px-4 py-3 space-y-2">
              <Skeleton className="h-7 w-full" />
            </div>
          ) : attachedNotes.length === 0 ? (
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground">No notes attached yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {attachedNotes.map((item) => (
                <li key={item.attachmentId} className="flex items-center justify-between px-4 py-2.5 gap-2">
                  <Link href="/notes">
                    <span
                      className="text-xs font-medium text-primary hover:underline cursor-pointer flex items-center gap-1 truncate"
                      data-testid={`link-attached-note-${item.noteId}`}
                    >
                      <StickyNote className="h-3 w-3 shrink-0" />
                      {item.title || "Untitled"}
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => detachMutation.mutate(item.attachmentId)}
                    disabled={detachMutation.isPending}
                    data-testid={`button-detach-note-${item.attachmentId}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="px-4 py-2.5">
            {showPicker ? (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Select a note to attach</p>
                {notesLoading ? (
                  <Skeleton className="h-7 w-full" />
                ) : availableNotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No unattached notes available.</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {availableNotes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => attachMutation.mutate(note.id)}
                        disabled={attachMutation.isPending}
                        data-testid={`button-attach-note-${note.id}`}
                        className="w-full text-left px-2.5 py-2 rounded-md text-xs hover:bg-muted/70 transition-colors flex items-center gap-2"
                      >
                        <StickyNote className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{note.title || "Untitled"}</span>
                      </button>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs mt-1"
                  onClick={() => setShowPicker(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs w-full"
                onClick={() => setShowPicker(true)}
                data-testid="button-show-note-picker"
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Attach a note
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
