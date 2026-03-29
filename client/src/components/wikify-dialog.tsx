import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import type { NewsArticle } from "@/components/news-article-card";
import { Link } from "wouter";

const wikifySchema = z.object({
  title: z.string().min(1, "Title is required"),
  categorySlug: z.string().min(1, "Category is required"),
  content: z.string().min(1, "Content is required"),
});

type WikifyForm = z.infer<typeof wikifySchema>;

const WIKI_CATEGORIES = [
  { label: "General", slug: "general" },
  { label: "Engineering", slug: "engineering" },
  { label: "Music", slug: "music" },
  { label: "Business", slug: "business" },
];

interface WikifyDialogBaseProps {
  open: boolean;
  onClose: () => void;
}

interface WikifyDialogArticleProps extends WikifyDialogBaseProps {
  article: NewsArticle;
  postTitle?: never;
  postContent?: never;
  postContext?: never;
}

interface WikifyDialogPostProps extends WikifyDialogBaseProps {
  article?: never;
  postTitle: string;
  postContent: string;
  postContext?: string;
}

type WikifyDialogProps = WikifyDialogArticleProps | WikifyDialogPostProps;

export function WikifyDialog({ open, onClose, article, postTitle, postContent, postContext }: WikifyDialogProps) {
  const { toast } = useToast();
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [aiDraftNotice, setAiDraftNotice] = useState(false);

  const defaultTitle = article ? article.title : (postTitle ?? "");
  const defaultContent = article
    ? `${article.description ? article.description + "\n\n" : ""}*Source: [${article.source || article.link}](${article.link})*`
    : `${postContent ?? ""}${postContext ? `\n\n*Context: ${postContext}*` : ""}`;

  const form = useForm<WikifyForm>({
    resolver: zodResolver(wikifySchema),
    defaultValues: {
      title: defaultTitle,
      categorySlug: "general",
      content: defaultContent,
    },
  });

  const aiWikifyMutation = useMutation({
    mutationFn: async () => {
      if (!article) throw new Error("AI Wikify only available for news articles");
      const res = await apiRequest("POST", "/api/news/wikify-ai", { url: article.link, title: article.title });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error((err as any).message ?? "AI generation failed");
      }
      return res.json() as Promise<{ markdown: string; wikititle: string }>;
    },
    onSuccess: (data) => {
      form.setValue("title", data.wikititle);
      form.setValue("content", data.markdown);
      setAiDraftNotice(true);
      toast({ title: "AI draft ready", description: "Review and edit the generated content before publishing." });
    },
    onError: (err: Error) => {
      toast({ title: "AI generation failed", description: err.message + " — using manual mode.", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WikifyForm) => {
      const cats = await fetch("/api/categories").then((r) => r.json()) as { id: number; slug: string; name: string }[];
      const cat = cats.find((c) => c.slug === data.categorySlug);
      const slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 80);

      const res = await apiRequest("POST", "/api/articles", {
        title: data.title,
        slug: slug + "-" + Date.now().toString(36),
        content: data.content,
        summary: (article?.description ?? postContent ?? "").slice(0, 200),
        categoryId: cat?.id ?? null,
        status: "draft",
      });
      return res.json();
    },
    onSuccess: (created: { slug: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      setCreatedSlug(created.slug);
      toast({
        title: "Article wikified!",
        description: "The wiki article was created as a draft.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to wikify", description: err.message, variant: "destructive" });
    },
  });

  function handleClose() {
    setCreatedSlug(null);
    setAiDraftNotice(false);
    form.reset();
    onClose();
  }

  if (createdSlug) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Article Wikified!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            The wiki article has been created as a draft. You can review and publish it from the wiki.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>Close</Button>
            <Button asChild>
              <Link href={`/wiki/${createdSlug}`} onClick={handleClose} data-testid="link-view-wikified-article">
                View Article →
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Wikify Article
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
          className="space-y-4"
        >
          {article && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              {aiWikifyMutation.isPending ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                    Generating AI wiki draft…
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {aiDraftNotice
                      ? <span className="text-amber-600 dark:text-amber-400 font-medium">✦ AI-generated draft — please review before publishing</span>
                      : "Let AI read the article and write a structured wiki draft for you."}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={aiDraftNotice ? "outline" : "default"}
                    onClick={() => aiWikifyMutation.mutate()}
                    data-testid="button-wikify-ai-generate"
                    className="shrink-0 gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {aiDraftNotice ? "Regenerate" : "✨ Generate with AI"}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="wikify-title">Title</Label>
            <Input
              id="wikify-title"
              {...form.register("title")}
              data-testid="input-wikify-title"
              className="text-sm"
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wikify-category">Wiki Category</Label>
            <Select
              value={form.watch("categorySlug")}
              onValueChange={(v) => form.setValue("categorySlug", v)}
            >
              <SelectTrigger id="wikify-category" data-testid="select-wikify-category">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {WIKI_CATEGORIES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug} data-testid={`option-wikify-${c.slug}`}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wikify-content">Content (Markdown)</Label>
            <Textarea
              id="wikify-content"
              {...form.register("content")}
              rows={8}
              data-testid="textarea-wikify-content"
              className="text-sm font-mono resize-none"
            />
            {form.formState.errors.content && (
              <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-wikify-submit">
              {createMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin mr-1.5" />Creating…</>
              ) : "Create Wiki Article"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
