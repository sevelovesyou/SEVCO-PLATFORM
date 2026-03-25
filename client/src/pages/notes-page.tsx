import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Users,
  X,
  MoreHorizontal,
  StickyNote,
  UserPlus,
  Check,
  ChevronLeft,
  Share2,
  Copy,
  Download,
  FileText,
} from "lucide-react";
import { Link } from "wouter";
import type { Note, NoteCollaborator } from "@shared/schema";

const NOTE_COLORS: { value: string; label: string; bg: string; border: string; dot: string }[] = [
  { value: "default", label: "Default", bg: "bg-card",                                 border: "border-border",                                   dot: "bg-muted-foreground" },
  { value: "yellow",  label: "Yellow",  bg: "bg-yellow-50 dark:bg-yellow-950/30",      border: "border-yellow-200 dark:border-yellow-800",        dot: "bg-yellow-400" },
  { value: "blue",    label: "Blue",    bg: "bg-blue-50 dark:bg-blue-950/30",          border: "border-blue-200 dark:border-blue-800",            dot: "bg-blue-400" },
  { value: "green",   label: "Green",   bg: "bg-green-50 dark:bg-green-950/30",        border: "border-green-200 dark:border-green-800",          dot: "bg-green-400" },
  { value: "pink",    label: "Pink",    bg: "bg-pink-50 dark:bg-pink-950/30",          border: "border-pink-200 dark:border-pink-800",            dot: "bg-pink-400" },
  { value: "purple",  label: "Purple",  bg: "bg-purple-50 dark:bg-purple-950/30",      border: "border-purple-200 dark:border-purple-800",        dot: "bg-purple-400" },
];

function getNoteColor(color: string) {
  return NOTE_COLORS.find((c) => c.value === color) ?? NOTE_COLORS[0];
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

type CollabUser = NoteCollaborator & { user: { id: string; username: string; displayName: string | null; avatarUrl: string | null } };

function CollaboratorPanel({ note, isOwner, onClose }: { note: Note; isOwner: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: collaborators = [], isLoading } = useQuery<CollabUser[]>({
    queryKey: ["/api/notes", note.id, "collaborators"],
    queryFn: () => fetch(`/api/notes/${note.id}/collaborators`, { credentials: "include" }).then((r) => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/notes/${note.id}/collaborators`, { username }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes", note.id, "collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setUsername("");
      setAdding(false);
      toast({ title: "Collaborator added" });
    },
    onError: (e: any) => toast({ title: e.message ?? "Failed to add collaborator", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/notes/${note.id}/collaborators/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes", note.id, "collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: "Collaborator removed" });
    },
    onError: () => toast({ title: "Failed to remove collaborator", variant: "destructive" }),
  });

  return (
    <div className="border-t border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Collaborators
        </p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-3/4" />
        </div>
      ) : collaborators.length === 0 ? (
        <p className="text-xs text-muted-foreground">No collaborators yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {collaborators.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
                  {(c.user.displayName ?? c.user.username)[0].toUpperCase()}
                </div>
                <span className="text-xs truncate">{c.user.displayName ?? c.user.username}</span>
              </div>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeMutation.mutate(c.userId)}
                  disabled={removeMutation.isPending}
                  data-testid={`button-remove-collaborator-${c.userId}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        adding ? (
          <div className="flex gap-1.5">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === "Enter" && username.trim() && addMutation.mutate()}
              data-testid="input-collaborator-username"
              autoFocus
            />
            <Button
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => username.trim() && addMutation.mutate()}
              disabled={addMutation.isPending || !username.trim()}
              data-testid="button-confirm-add-collaborator"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => { setAdding(false); setUsername(""); }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs w-full"
            onClick={() => setAdding(true)}
            data-testid="button-add-collaborator"
          >
            <UserPlus className="h-3 w-3 mr-1.5" />
            Invite collaborator
          </Button>
        )
      )}
    </div>
  );
}

function NoteListItem({
  note,
  selected,
  onSelect,
  currentUserId,
}: {
  note: Note;
  selected: boolean;
  onSelect: () => void;
  currentUserId: string;
}) {
  const color = getNoteColor(note.color);
  const isOwner = note.authorId === currentUserId;
  const preview = note.content.replace(/\n/g, " ").slice(0, 80) || "No additional text";

  return (
    <button
      onClick={onSelect}
      data-testid={`button-note-item-${note.id}`}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group border ${
        selected
          ? "bg-primary/10 border-primary/30"
          : `${color.bg} ${color.border} hover:border-primary/20`
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {note.pinned && <Pin className="h-2.5 w-2.5 text-primary shrink-0" />}
            {note.isShared && (
              <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-blue-300 text-blue-600 dark:text-blue-400">
                Shared
              </Badge>
            )}
            {!isOwner && (
              <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                <Users className="h-2 w-2 mr-0.5" />
                Collab
              </Badge>
            )}
          </div>
          <p className="text-xs font-semibold truncate leading-tight">
            {note.title || "Untitled"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex gap-2">
            <span className="shrink-0">{formatDate(note.updatedAt)}</span>
            <span className="truncate opacity-70">{preview}</span>
          </p>
        </div>
      </div>
    </button>
  );
}

function toMarkdown(title: string, content: string) {
  return `# ${title}\n\n${content}`;
}

function toPlainText(title: string, content: string) {
  return `${title}\n\n${content}`;
}

function downloadFile(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(title: string) {
  return (title || "untitled").replace(/[/\\?%*:|"<>]/g, "-").trim() || "untitled";
}

export default function NotesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mobileShowEditor, setMobileShowEditor] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<{ title: string; content: string }>({ title: "", content: "" });

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    enabled: !!user,
  });

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;
  const isOwner = selectedNote?.authorId === user?.id;

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notes", { title: "New Note", content: "" }),
    onSuccess: async (res) => {
      const note = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setSelectedId(note.id);
      setMobileShowEditor(true);
      setTimeout(() => titleRef.current?.focus(), 100);
    },
    onError: () => toast({ title: "Failed to create note", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; content?: string; pinned?: boolean; color?: string } }) =>
      apiRequest("PATCH", `/api/notes/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setSelectedId(null);
      setDeleteDialogOpen(false);
      setMobileShowEditor(false);
      toast({ title: "Note deleted" });
    },
  });

  const scheduleAutoSave = useCallback((id: number, title: string, content: string) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (title !== lastSavedRef.current.title || content !== lastSavedRef.current.content) {
        lastSavedRef.current = { title, content };
        updateMutation.mutate({ id, data: { title, content } });
      }
    }, 800);
  }, []);

  useEffect(() => {
    if (selectedNote) {
      lastSavedRef.current = { title: selectedNote.title, content: selectedNote.content };
      if (titleRef.current) titleRef.current.value = selectedNote.title;
      if (contentRef.current) contentRef.current.value = selectedNote.content;
    }
  }, [selectedNote?.id]);

  const filteredNotes = notes.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  function handleSelectNote(id: number) {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      if (selectedId && titleRef.current && contentRef.current) {
        const title = titleRef.current.value;
        const content = contentRef.current.value;
        if (title !== lastSavedRef.current.title || content !== lastSavedRef.current.content) {
          lastSavedRef.current = { title, content };
          updateMutation.mutate({ id: selectedId, data: { title, content } });
        }
      }
    }
    setSelectedId(id);
    setShowCollabPanel(false);
    setMobileShowEditor(true);
  }

  const color = selectedNote ? getNoteColor(selectedNote.color) : getNoteColor("default");

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3rem)] gap-6 px-4">
        <StickyNote className="h-12 w-12 text-muted-foreground" />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Sign in to access Notes</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your personal notes are private to your account. Sign in to create and manage them.
          </p>
        </div>
        <Link href="/auth">
          <Button data-testid="button-signin-notes">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
      {/* Left Pane — Note List */}
      <div className={`flex flex-col border-r border-border bg-background ${mobileShowEditor ? "hidden md:flex" : "flex"} w-full md:w-64 lg:w-72 shrink-0`}>
        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <StickyNote className="h-4 w-4 text-primary" />
              Notes
            </h1>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              data-testid="button-new-note"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-7 text-xs bg-muted/50"
              data-testid="input-search-notes"
            />
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-full" />
              </div>
            ))
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
              <StickyNote className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                {search ? "No notes match your search" : "No notes yet. Create one to get started."}
              </p>
              {!search && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => createMutation.mutate()}
                  data-testid="button-create-first-note"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New Note
                </Button>
              )}
            </div>
          ) : (
            <>
              {pinnedNotes.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Pinned</p>
                  <div className="space-y-1">
                    {pinnedNotes.map((n) => (
                      <NoteListItem
                        key={n.id}
                        note={n}
                        selected={n.id === selectedId}
                        onSelect={() => handleSelectNote(n.id)}
                        currentUserId={user?.id ?? ""}
                      />
                    ))}
                  </div>
                  {unpinnedNotes.length > 0 && (
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mt-2">Notes</p>
                  )}
                </div>
              )}
              <div className="space-y-1">
                {unpinnedNotes.map((n) => (
                  <NoteListItem
                    key={n.id}
                    note={n}
                    selected={n.id === selectedId}
                    onSelect={() => handleSelectNote(n.id)}
                    currentUserId={user?.id ?? ""}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Count footer */}
        <div className="px-3 py-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">{notes.length} {notes.length === 1 ? "note" : "notes"}</p>
        </div>
      </div>

      {/* Right Pane — Editor */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileShowEditor ? "flex" : "hidden md:flex"}`}>
        {selectedNote ? (
          <>
            {/* Editor toolbar */}
            <div className={`flex items-center gap-2 px-4 py-2 border-b border-border shrink-0 ${color.bg}`}>
              {/* Mobile back */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-7 w-7 mr-1"
                onClick={() => setMobileShowEditor(false)}
                data-testid="button-back-to-list"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Color picker */}
              <div className="flex items-center gap-1">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => updateMutation.mutate({ id: selectedNote.id, data: { color: c.value } })}
                    title={c.label}
                    data-testid={`button-color-${c.value}`}
                    className={`h-4 w-4 rounded-full ${c.dot} border-2 transition-all ${
                      selectedNote.color === c.value ? "border-foreground scale-110" : "border-transparent hover:border-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>

              <div className="flex-1" />

              {/* Toolbar actions */}
              <div className="flex items-center gap-1">
                {/* Pin toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateMutation.mutate({ id: selectedNote.id, data: { pinned: !selectedNote.pinned } })}
                  data-testid="button-toggle-pin"
                  title={selectedNote.pinned ? "Unpin" : "Pin"}
                >
                  {selectedNote.pinned ? <PinOff className="h-3.5 w-3.5 text-primary" /> : <Pin className="h-3.5 w-3.5" />}
                </Button>

                {/* Collaborators toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${showCollabPanel ? "bg-muted" : ""}`}
                  onClick={() => setShowCollabPanel((v) => !v)}
                  data-testid="button-toggle-collaborators"
                  title="Collaborators"
                >
                  <Users className={`h-3.5 w-3.5 ${selectedNote.isShared ? "text-blue-500" : ""}`} />
                </Button>

                {/* Share / Export */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-share-export" title="Share / Export">
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Share / Export</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      data-testid="menu-copy-markdown"
                      onClick={() => {
                        const title = titleRef.current?.value ?? selectedNote.title;
                        const content = contentRef.current?.value ?? selectedNote.content;
                        navigator.clipboard.writeText(toMarkdown(title, content)).then(() => {
                          toast({ title: "Copied to clipboard" });
                        });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copy as Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-testid="menu-copy-plain-text"
                      onClick={() => {
                        const title = titleRef.current?.value ?? selectedNote.title;
                        const content = contentRef.current?.value ?? selectedNote.content;
                        navigator.clipboard.writeText(toPlainText(title, content)).then(() => {
                          toast({ title: "Copied to clipboard" });
                        });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copy as Plain Text
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      data-testid="menu-download-markdown"
                      onClick={() => {
                        const title = titleRef.current?.value ?? selectedNote.title;
                        const content = contentRef.current?.value ?? selectedNote.content;
                        downloadFile(`${safeName(title)}.md`, toMarkdown(title, content), "text/markdown");
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Download as Markdown (.md)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-testid="menu-download-text"
                      onClick={() => {
                        const title = titleRef.current?.value ?? selectedNote.title;
                        const content = contentRef.current?.value ?? selectedNote.content;
                        downloadFile(`${safeName(title)}.txt`, toPlainText(title, content), "text/plain");
                      }}
                    >
                      <FileText className="h-3.5 w-3.5 mr-2" />
                      Download as Text (.txt)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      data-testid="menu-open-in-bear"
                      onClick={() => {
                        const title = titleRef.current?.value ?? selectedNote.title;
                        const content = contentRef.current?.value ?? selectedNote.content;
                        const url = `bear://x-callback-url/create?title=${encodeURIComponent(title)}&text=${encodeURIComponent(content)}`;
                        window.open(url, "_blank");
                      }}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-2" />
                      Open in Bear
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* More actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-note-menu">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={() => updateMutation.mutate({ id: selectedNote.id, data: { pinned: !selectedNote.pinned } })}
                      data-testid="menu-toggle-pin"
                    >
                      {selectedNote.pinned ? <PinOff className="h-3.5 w-3.5 mr-2" /> : <Pin className="h-3.5 w-3.5 mr-2" />}
                      {selectedNote.pinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    {isOwner && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteDialogOpen(true)}
                          className="text-destructive focus:text-destructive"
                          data-testid="menu-delete-note"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete Note
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Editor body */}
            <div className={`flex flex-col flex-1 overflow-hidden ${color.bg}`}>
              <div className="flex flex-col flex-1 overflow-hidden px-6 pt-5 pb-4 gap-2">
                <input
                  ref={titleRef}
                  type="text"
                  defaultValue={selectedNote.title}
                  placeholder="Title"
                  data-testid="input-note-title"
                  onChange={(e) => {
                    scheduleAutoSave(selectedNote.id, e.target.value, contentRef.current?.value ?? "");
                  }}
                  className="w-full text-xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground"
                />
                <textarea
                  ref={contentRef}
                  defaultValue={selectedNote.content}
                  placeholder="Start writing…"
                  data-testid="textarea-note-content"
                  onChange={(e) => {
                    scheduleAutoSave(selectedNote.id, titleRef.current?.value ?? "", e.target.value);
                  }}
                  className="flex-1 w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed placeholder:text-muted-foreground/40 text-foreground"
                />
              </div>

              {/* Collaborator panel */}
              {showCollabPanel && (
                <CollaboratorPanel
                  note={selectedNote}
                  isOwner={isOwner}
                  onClose={() => setShowCollabPanel(false)}
                />
              )}

              {/* Save indicator */}
              <div className="px-6 py-1 border-t border-border/30 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  Edited {formatDate(selectedNote.updatedAt)}
                </p>
                {!isOwner && (
                  <p className="text-[10px] text-blue-500 flex items-center gap-1">
                    <Users className="h-2.5 w-2.5" />
                    Shared with you
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <StickyNote className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold text-base text-muted-foreground">Select a note</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Choose a note from the list or create a new one</p>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              data-testid="button-create-note-empty"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{selectedNote?.title || "this note"}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedNote && deleteMutation.mutate(selectedNote.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-note"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
