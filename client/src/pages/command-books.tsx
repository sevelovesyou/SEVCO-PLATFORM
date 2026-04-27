import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileUploadWithFallback } from "@/components/file-upload";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Shield,
  ExternalLink,
} from "lucide-react";
import type { Book } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const bookFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  coverImageUrl: z.string().min(1, "Cover image is required"),
  description: z.string().optional().or(z.literal("")),
  buyLink: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => {
        if (!v) return true;
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Buy link must be a valid URL" },
    ),
  displayOrder: z.string().default("0"),
});

type BookFormValues = z.infer<typeof bookFormSchema>;

function BookForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: {
  defaultValues?: Partial<BookFormValues>;
  onSubmit: (values: BookFormValues) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: "",
      author: "",
      coverImageUrl: "",
      description: "",
      buyLink: "",
      displayOrder: "0",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Book title"
                  data-testid="input-book-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="author"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Author name"
                  data-testid="input-book-author"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="coverImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Image</FormLabel>
              <FormControl>
                <FileUploadWithFallback
                  bucket="gallery"
                  path={`book-covers/${Date.now()}.{ext}`}
                  accept="image/*"
                  maxSizeMb={50}
                  currentUrl={field.value || null}
                  onUpload={(url) => field.onChange(url)}
                  onUrlChange={(url) => field.onChange(url)}
                  urlValue={field.value}
                  label="Upload Cover"
                  urlPlaceholder="https://..."
                  urlTestId="input-book-cover-url"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={4}
                  placeholder="Longer-form description shown in the book detail dialog."
                  data-testid="textarea-book-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="buyLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Buy Link (optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="url"
                  placeholder="https://example.com/buy"
                  data-testid="input-book-buy-link"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="displayOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Order</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  data-testid="input-book-display-order"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-book-form-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            data-testid="button-book-form-submit"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function BookThumb({ book }: { book: Book }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className="h-[60px] w-10 rounded bg-muted flex items-center justify-center">
        <BookOpen className="h-4 w-4 text-muted-foreground/50" />
      </div>
    );
  }
  return (
    <div className="h-[60px] w-10 rounded overflow-hidden bg-muted shrink-0">
      <img
        src={resolveImageUrl(book.coverImageUrl)}
        alt={book.title}
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

export default function CommandBooks() {
  const { isAdmin } = usePermission();
  const { toast } = useToast();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: books, isLoading } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/books", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      setShowAddDialog(false);
      toast({ title: "Book added", description: "Book has been added." });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      apiRequest("PATCH", `/api/books/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      setEditBook(null);
      toast({ title: "Book updated", description: "Book has been updated." });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/books/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      setDeleteId(null);
      toast({ title: "Book deleted", description: "Book has been removed." });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function buildPayload(values: BookFormValues) {
    return {
      title: values.title,
      author: values.author,
      coverImageUrl: values.coverImageUrl,
      description: values.description ? values.description : null,
      buyLink: values.buyLink ? values.buyLink : null,
      displayOrder: parseInt(values.displayOrder, 10) || 0,
    };
  }

  function handleCreate(values: BookFormValues) {
    createMutation.mutate(buildPayload(values));
  }

  function handleEdit(values: BookFormValues) {
    if (!editBook) return;
    updateMutation.mutate({ id: editBook.id, data: buildPayload(values) });
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {books
              ? `${books.length} book${books.length !== 1 ? "s" : ""}`
              : "Loading..."}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setShowAddDialog(true)}
          data-testid="button-new-book"
        >
          <Plus className="h-4 w-4" />
          New Book
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && books && books.length === 0 && (
        <Card className="p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No books yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Add a book with title, author, and cover.
          </p>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            data-testid="button-books-empty-add"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add First Book
          </Button>
        </Card>
      )}

      {!isLoading && books && books.length > 0 && (
        <div className="rounded-xl border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Cover</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Author</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Buy Link</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Order</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {books.map((book, idx) => (
                <tr
                  key={book.id}
                  className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                  data-testid={`row-book-${book.id}`}
                >
                  <td className="px-4 py-2.5">
                    <BookThumb book={book} />
                  </td>
                  <td className="px-4 py-2.5">
                    <p
                      className="font-medium text-sm leading-tight"
                      data-testid={`text-book-title-${book.id}`}
                    >
                      {book.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 sm:hidden">
                      {book.author}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">{book.author}</span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    {book.buyLink ? (
                      <a
                        href={book.buyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        data-testid={`link-book-buy-${book.id}`}
                      >
                        Buy
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{book.displayOrder}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit"
                            className="h-7 w-7"
                            onClick={() => setEditBook(book)}
                            data-testid={`button-edit-book-${book.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(book.id)}
                            data-testid={`button-delete-book-${book.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Book</DialogTitle>
          </DialogHeader>
          <BookForm
            onSubmit={handleCreate}
            isPending={createMutation.isPending}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editBook} onOpenChange={(o) => !o && setEditBook(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
          </DialogHeader>
          {editBook && (
            <BookForm
              defaultValues={{
                title: editBook.title,
                author: editBook.author,
                coverImageUrl: editBook.coverImageUrl,
                description: editBook.description ?? "",
                buyLink: editBook.buyLink ?? "",
                displayOrder: String(editBook.displayOrder),
              }}
              onSubmit={handleEdit}
              isPending={updateMutation.isPending}
              onCancel={() => setEditBook(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Book</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this book? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-book-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-book-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
