import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollText, Plus, Shield, Tag, ExternalLink, Link2 } from "lucide-react";
import type { Changelog, ChangelogCategory } from "@shared/schema";
import { insertChangelogSchema } from "@shared/schema";
import { z } from "zod";

const CHANGELOG_CATEGORY_COLORS: Record<ChangelogCategory, string> = {
  feature:     "bg-primary/10 text-primary border-primary/20",
  fix:         "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  improvement: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  other:       "bg-muted text-muted-foreground border-border",
};

const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

function suggestNextVersion(current: string | null | undefined): string {
  if (!current || !VERSION_REGEX.test(current)) return "1.0.0";
  const parts = current.split(".").map(Number);
  parts[2] += 1;
  return parts.join(".");
}

const changelogFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(1000),
  version: z.string()
    .min(1, "Version is required")
    .regex(/^\d+\.\d+\.\d+$/, "Use MAJOR.MINOR.PATCH format (e.g. 1.2.0)"),
  category: z.enum(["feature", "fix", "improvement", "other"]).default("improvement"),
  wikiSlug: z.string().optional().nullable(),
});
type ChangelogFormValues = z.infer<typeof changelogFormSchema>;

const wikiSlugFormSchema = z.object({
  wikiSlug: z.string().optional().nullable(),
});
type WikiSlugFormValues = z.infer<typeof wikiSlugFormSchema>;

export default function CommandChangelog() {
  const { isAdmin, isExecutive, isStaff } = usePermission();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSlugId, setEditingSlugId] = useState<number | null>(null);

  const canAccess = isAdmin || isExecutive || isStaff;

  const { data: entries, isLoading } = useQuery<Changelog[]>({
    queryKey: ["/api/changelog"],
    enabled: canAccess,
  });

  const latestVersion = entries?.[0]?.version ?? null;
  const suggestedVersion = suggestNextVersion(latestVersion);

  const form = useForm<ChangelogFormValues>({
    resolver: zodResolver(changelogFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "improvement",
      version: suggestedVersion,
      wikiSlug: "",
    },
  });

  const slugForm = useForm<WikiSlugFormValues>({
    resolver: zodResolver(wikiSlugFormSchema),
    defaultValues: { wikiSlug: "" },
  });

  const handleOpenForm = () => {
    form.setValue("version", suggestNextVersion(latestVersion));
    setFormOpen(true);
  };

  const mutation = useMutation({
    mutationFn: (data: ChangelogFormValues) =>
      apiRequest("POST", "/api/changelog", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/changelog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/changelog/latest"] });
      form.reset();
      setFormOpen(false);
      toast({ title: "Changelog entry added" });
    },
    onError: () => {
      toast({ title: "Failed to add entry", variant: "destructive" });
    },
  });

  const slugMutation = useMutation({
    mutationFn: ({ id, wikiSlug }: { id: number; wikiSlug: string | null | undefined }) =>
      apiRequest("PATCH", `/api/changelog/${id}`, { wikiSlug: wikiSlug || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/changelog"] });
      setEditingSlugId(null);
      toast({ title: "Wiki link updated" });
    },
    onError: () => {
      toast({ title: "Failed to update wiki link", variant: "destructive" });
    },
  });

  if (!canAccess) {
    return (
      <Card className="p-6 text-center overflow-visible">
        <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Access restricted.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Platform Changelog
          </h2>
          {latestVersion && (
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              v{latestVersion}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleOpenForm}
          data-testid="button-toggle-changelog-form"
        >
          <Plus className="h-3 w-3" />
          Add Entry
        </Button>
      </div>

      {formOpen && (
        <Card className="p-4 overflow-visible">
          <div className="mb-3 p-2.5 rounded bg-muted/50 border border-border">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold">Semantic versioning:</span>{" "}
              <span className="font-mono">MAJOR.MINOR.PATCH</span> —
              bump <span className="font-mono">PATCH</span> for fixes,
              <span className="font-mono"> MINOR</span> for new features,
              <span className="font-mono"> MAJOR</span> for breaking changes.
            </p>
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="flex flex-col gap-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel className="text-xs">Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="What changed?"
                          className="h-8 text-sm"
                          data-testid="input-changelog-title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel className="text-xs flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Version
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 1.2.0"
                          className="h-8 text-sm font-mono"
                          data-testid="input-changelog-version"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the change..."
                        className="text-sm resize-none"
                        rows={3}
                        data-testid="input-changelog-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm" data-testid="select-changelog-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="feature">Feature</SelectItem>
                          <SelectItem value="fix">Fix</SelectItem>
                          <SelectItem value="improvement">Improvement</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wikiSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        Wiki Article Slug
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. eng-task-36-..."
                          className="h-8 text-sm font-mono"
                          data-testid="input-changelog-wiki-slug"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={mutation.isPending}
                  data-testid="button-submit-changelog"
                >
                  {mutation.isPending ? "Adding..." : "Add Entry"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { form.reset(); setFormOpen(false); }}
                  data-testid="button-cancel-changelog"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 overflow-visible">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(entries ?? []).map((entry) => (
            <Card key={entry.id} className="p-4 overflow-visible" data-testid={`card-changelog-${entry.id}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span
                      className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${CHANGELOG_CATEGORY_COLORS[entry.category as ChangelogCategory] ?? CHANGELOG_CATEGORY_COLORS.other}`}
                      data-testid={`badge-changelog-category-${entry.id}`}
                    >
                      {entry.category}
                    </span>
                    {entry.version && (
                      <span
                        className="inline-block text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border bg-muted text-muted-foreground border-border"
                        data-testid={`badge-changelog-version-${entry.id}`}
                      >
                        v{entry.version}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground" data-testid={`text-changelog-date-${entry.id}`}>
                      {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{entry.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{entry.description}</p>

                  {editingSlugId === entry.id ? (
                    <form
                      className="mt-2 flex gap-2 items-center"
                      onSubmit={slugForm.handleSubmit((data) =>
                        slugMutation.mutate({ id: entry.id, wikiSlug: data.wikiSlug })
                      )}
                    >
                      <Input
                        className="h-7 text-xs font-mono flex-1"
                        placeholder="wiki article slug..."
                        data-testid={`input-wiki-slug-${entry.id}`}
                        {...slugForm.register("wikiSlug")}
                        defaultValue={entry.wikiSlug ?? ""}
                      />
                      <Button type="submit" size="sm" className="h-7 text-xs" disabled={slugMutation.isPending}>
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setEditingSlugId(null)}
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-2">
                      {entry.wikiSlug ? (
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded" data-testid={`text-wiki-slug-${entry.id}`}>
                          /wiki/{entry.wikiSlug}
                        </span>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-muted-foreground"
                        onClick={() => {
                          slugForm.setValue("wikiSlug", entry.wikiSlug ?? "");
                          setEditingSlugId(entry.id);
                        }}
                        data-testid={`button-edit-wiki-slug-${entry.id}`}
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        {entry.wikiSlug ? "Edit link" : "Link article"}
                      </Button>
                      {entry.wikiSlug && (
                        <a
                          href={`/wiki/${entry.wikiSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                          data-testid={`link-wiki-article-${entry.id}`}
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          View
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
