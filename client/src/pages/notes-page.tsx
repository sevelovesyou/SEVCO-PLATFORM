import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, StickyNote, Pin, PinOff, MoreVertical, Pencil, Trash2, Search } from "lucide-react";
import type { Note } from "@shared/schema";
import { cn } from "@/lib/utils";

const NOTE_COLORS = [
  { value: "default", label: "Default", bg: "bg-card", border: "border-border" },
  { value: "yellow",  label: "Yellow",  bg: "bg-yellow-50 dark:bg-yellow-950/30",  border: "border-yellow-200 dark:border-yellow-800" },
  { value: "green",   label: "Green",   bg: "bg-green-50 dark:bg-green-950/30",   border: "border-green-200 dark:border-green-800" },
  { value: "blue",    label: "Blue",    bg: "bg-blue-50 dark:bg-blue-950/30",     border: "border-blue-200 dark:border-blue-800" },
  { value: "purple",  label: "Purple",  bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
  { value: "red",     label: "Red",     bg: "bg-red-50 dark:bg-red-950/30",       border: "border-red-200 dark:border-red-800" },
];

const COLOR_DOT: Record<string, string> = {
  default: "bg-muted-foreground",
  yellow:  "bg-yellow-400",
  green:   "bg-green-400",
  blue:    "bg-blue-400",
  purple:  "bg-purple-400",
  red:     "bg-red-400",
};

const noteFormSchema = z.object({
  title:   z.string().min(1, "Title is required"),
  content: z.string().default(""),
  color:   z.string().default("default"),
  pinned:  z.boolean().default(false),
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

function NoteFormDialog({
  open,
  onClose,
  note,
}: {
  open: boolean;
  onClose: () => void;
  note?: Note | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!note;

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title:   note?.title   ?? "",
      content: note?.content ?? "",
      color:   note?.color   ?? "default",
      pinned:  note?.pinned  ?? false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title:   note?.title   ?? "",
        content: note?.content ?? "",
        color:   note?.color   ?? "default",
        pinned:  note?.pinned  ?? false,
      });
    }
  }, [open, note]);

  const mutation = useMutation({
    mutationFn: (data: NoteFormValues) =>
      isEdit
        ? apiRequest("PATCH", `/api/notes/${note!.id}`, data)
        : apiRequest("POST", "/api/notes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: isEdit ? "Note updated" : "Note created" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const selectedColor = form.watch("color");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Note" : "New Note"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Note title" data-testid="input-note-title" autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Write your note here..."
                    className="min-h-[140px] resize-none"
                    data-testid="input-note-content"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => form.setValue("color", c.value)}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-all",
                        COLOR_DOT[c.value],
                        selectedColor === c.value ? "border-foreground scale-125" : "border-transparent"
                      )}
                      title={c.label}
                      data-testid={`button-note-color-${c.value}`}
                    />
                  ))}
                </div>
              </div>
              <FormField control={form.control} name="pinned" render={({ field }) => (
                <FormItem className="flex flex-col items-center gap-1">
                  <FormLabel className="text-xs text-muted-foreground">Pin</FormLabel>
                  <FormControl>
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={cn(
                        "h-8 w-8 rounded-lg border flex items-center justify-center transition-colors",
                        field.value ? "bg-orange-100 border-orange-300 text-orange-600 dark:bg-orange-950/40 dark:border-orange-700 dark:text-orange-400" : "border-border text-muted-foreground hover:bg-muted"
                      )}
                      data-testid="button-note-pin"
                    >
                      <Pin className="h-4 w-4" />
                    </button>
                  </FormControl>
                </FormItem>
              )} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-note-save">
                {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Note"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function NoteCard({ note, onEdit }: { note: Note; onEdit: (n: Note) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const colorInfo = NOTE_COLORS.find((c) => c.value === (note.color ?? "default")) ?? NOTE_COLORS[0];

  const pinMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/notes/${note.id}`, { pinned: !note.pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notes"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/notes/${note.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: "Note deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <div
        className={cn(
          "rounded-xl border p-4 flex flex-col gap-3 group relative transition-all",
          colorInfo.bg, colorInfo.border
        )}
        data-testid={`card-note-${note.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm leading-tight flex-1 min-w-0 break-words">{note.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            {note.pinned && <Pin className="h-3 w-3 text-orange-500 shrink-0" />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-note-menu-${note.id}`}>
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(note)} data-testid={`menu-edit-note-${note.id}`}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => pinMutation.mutate()} data-testid={`menu-pin-note-${note.id}`}>
                  {note.pinned ? (
                    <><PinOff className="h-3.5 w-3.5 mr-2" />Unpin</>
                  ) : (
                    <><Pin className="h-3.5 w-3.5 mr-2" />Pin</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                  data-testid={`menu-delete-note-${note.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {note.content && (
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">{note.content}</p>
        )}
        <p className="text-[10px] text-muted-foreground/50 mt-auto">
          {new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              "{note.title}" will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { deleteMutation.mutate(); setDeleteOpen(false); }}
              data-testid={`button-confirm-delete-note-${note.id}`}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function NotesPage() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [search, setSearch] = useState("");

  const { data: notes, isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    enabled: !!user,
  });

  const handleEdit = (n: Note) => {
    setEditingNote(n);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingNote(null);
  };

  const filtered = notes
    ? notes.filter((n) =>
        !search ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const pinned    = filtered.filter((n) => n.pinned);
  const unpinned  = filtered.filter((n) => !n.pinned);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <StickyNote className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold">Sign in to use Notes</p>
          <p className="text-sm text-muted-foreground mt-1">Your personal notes are tied to your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your personal scratchpad</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2" data-testid="button-new-note">
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="pl-9"
            data-testid="input-notes-search"
          />
        </div>

        {isLoading ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl break-inside-avoid" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <StickyNote className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-semibold">{search ? "No matching notes" : "No notes yet"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Try a different search" : "Create your first note to get started"}
            </p>
            {!search && (
              <Button className="mt-4 gap-2" onClick={() => setDialogOpen(true)} data-testid="button-create-first-note">
                <Plus className="h-4 w-4" />
                Create Note
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Pin className="h-3.5 w-3.5 text-orange-500" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pinned</p>
                </div>
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                  {pinned.map((n) => (
                    <div key={n.id} className="break-inside-avoid">
                      <NoteCard note={n} onEdit={handleEdit} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {unpinned.length > 0 && (
              <div>
                {pinned.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <StickyNote className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Other Notes</p>
                  </div>
                )}
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                  {unpinned.map((n) => (
                    <div key={n.id} className="break-inside-avoid">
                      <NoteCard note={n} onEdit={handleEdit} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <NoteFormDialog open={dialogOpen} onClose={handleClose} note={editingNote} />
    </div>
  );
}
