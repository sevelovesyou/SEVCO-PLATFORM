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
import { ScrollText, Plus, Shield } from "lucide-react";
import type { Changelog, ChangelogCategory } from "@shared/schema";
import { insertChangelogSchema } from "@shared/schema";
import { z } from "zod";

const CHANGELOG_CATEGORY_COLORS: Record<ChangelogCategory, string> = {
  feature:     "bg-primary/10 text-primary border-primary/20",
  fix:         "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  improvement: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  other:       "bg-muted text-muted-foreground border-border",
};

const changelogFormSchema = insertChangelogSchema.extend({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(1000),
});
type ChangelogFormValues = z.infer<typeof changelogFormSchema>;

export default function CommandChangelog() {
  const { isAdmin, isExecutive, isStaff } = usePermission();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);

  const canAccess = isAdmin || isExecutive || isStaff;

  const { data: entries, isLoading } = useQuery<Changelog[]>({
    queryKey: ["/api/changelog"],
    enabled: canAccess,
  });

  const form = useForm<ChangelogFormValues>({
    resolver: zodResolver(changelogFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "improvement",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ChangelogFormValues) =>
      apiRequest("POST", "/api/changelog", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/changelog"] });
      form.reset();
      setFormOpen(false);
      toast({ title: "Changelog entry added" });
    },
    onError: () => {
      toast({ title: "Failed to add entry", variant: "destructive" });
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
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setFormOpen((v: boolean) => !v)}
          data-testid="button-toggle-changelog-form"
        >
          <Plus className="h-3 w-3" />
          Add Entry
        </Button>
      </div>

      {formOpen && (
        <Card className="p-4 overflow-visible">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="flex flex-col gap-3"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
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
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{entry.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{entry.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
