import { useQuery } from "@tanstack/react-query";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StickyNote } from "lucide-react";
import type { Note } from "@shared/schema";

type PublicNote = Note & {
  author: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
};

interface StaffNotesProps {
  resourceType: "project" | "article";
  resourceId: number;
}

export function StaffNotes({ resourceType, resourceId }: StaffNotesProps) {
  const { data: staffNotes = [], isLoading } = useQuery<PublicNote[]>({
    queryKey: ["/api/public-notes", resourceType, resourceId],
    queryFn: () =>
      fetch(`/api/public-notes/${resourceType}/${resourceId}`).then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 mt-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (staffNotes.length === 0) return null;

  return (
    <section className="mt-10 space-y-5" data-testid="section-staff-notes">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <StickyNote className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Staff Notes
        </h2>
      </div>
      <div className="space-y-4">
        {staffNotes.map((note) => (
          <div
            key={note.id}
            className="rounded-xl border border-border bg-muted/30 px-5 py-4 space-y-3"
            data-testid={`staff-note-${note.id}`}
          >
            <div className="flex items-center gap-2.5">
              <Avatar className="h-6 w-6">
                {note.author?.avatarUrl && <AvatarImage src={resolveImageUrl(note.author.avatarUrl)} />}
                <AvatarFallback className="text-[10px]">
                  {(note.author?.displayName ?? note.author?.username ?? "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-foreground">
                {note.author?.displayName ?? note.author?.username ?? "Staff"}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(note.updatedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            {note.title && note.title !== "New Note" && (
              <h3 className="text-sm font-semibold text-foreground leading-snug">{note.title}</h3>
            )}
            {note.content && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
