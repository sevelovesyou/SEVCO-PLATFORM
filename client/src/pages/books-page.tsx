import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHead } from "@/components/page-head";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, ExternalLink } from "lucide-react";
import type { Book } from "@shared/schema";

function CoverImage({ book }: { book: Book }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div
        className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted/30"
        data-testid={`img-book-cover-${book.id}`}
      >
        <BookOpen className="h-10 w-10 text-muted-foreground/40" />
      </div>
    );
  }
  return (
    <img
      src={resolveImageUrl(book.coverImageUrl)}
      alt={`Cover of ${book.title}`}
      loading="lazy"
      onError={() => setErrored(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      data-testid={`img-book-cover-${book.id}`}
    />
  );
}

function BookCard({ book, onOpen }: { book: Book; onOpen: (b: Book) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(book)}
      className="group text-left flex flex-col gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      data-testid={`card-book-${book.id}`}
    >
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-muted shadow-sm group-hover:shadow-md transition-shadow">
        <CoverImage book={book} />
      </div>
      <div className="px-0.5">
        <p className="font-semibold text-sm truncate" data-testid={`text-book-title-${book.id}`}>
          {book.title}
        </p>
        <p className="text-xs text-muted-foreground truncate" data-testid={`text-book-author-${book.id}`}>
          {book.author}
        </p>
      </div>
    </button>
  );
}

function BookCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="w-full aspect-[2/3] rounded-xl" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export default function BooksPage() {
  const [selected, setSelected] = useState<Book | null>(null);

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  return (
    <div className="min-h-screen bg-background" data-page="books">
      <PageHead
        slug="books"
        title="Books — SEVCO"
        description="Books from the SEVCO library."
        ogUrl="https://sevco.us/books"
      />
      <div className="w-full px-4 md:px-8 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight"
            data-testid="heading-books"
          >
            Books
          </h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 gap-3 text-center"
            data-testid="empty-books"
          >
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No books yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {books.map((book) => (
              <BookCard key={book.id} book={book} onOpen={setSelected} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle data-testid="text-book-detail-title">
              {selected?.title}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 sm:gap-6 pt-2">
              <div className="w-full sm:w-40 mx-auto sm:mx-0">
                <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                  <CoverImage book={selected} />
                </div>
              </div>
              <div className="flex flex-col gap-3 min-w-0">
                <div>
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="text-book-detail-author"
                  >
                    by {selected.author}
                  </p>
                </div>
                {selected.description && (
                  <p
                    className="text-sm whitespace-pre-wrap leading-relaxed"
                    data-testid="text-book-detail-description"
                  >
                    {selected.description}
                  </p>
                )}
                {selected.buyLink && (
                  <div className="pt-2">
                    <Button
                      asChild
                      className="gap-2"
                      data-testid={`button-book-buy-${selected.id}`}
                    >
                      <a
                        href={selected.buyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Buy
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
