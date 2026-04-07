import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Save,
  Send,
  Plus,
  X,
  ArrowLeft,
  FileText,
  Tag,
  Info,
  Link2,
} from "lucide-react";
import type { Article, Category, Citation } from "@shared/schema";
import { articleUrl } from "@/lib/wiki-urls";
import { usePermission } from "@/hooks/use-permission";
import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const articleFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.string().min(1, "Content is required"),
  summary: z.string().optional(),
  categoryId: z.number().optional().nullable(),
  infoboxType: z.string().optional().nullable(),
  editSummary: z.string().optional(),
});

type ArticleFormValues = z.infer<typeof articleFormSchema>;

const infoboxTypes = [
  { value: "artist", label: "Artist" },
  { value: "song", label: "Song" },
  { value: "album", label: "Album" },
  { value: "merchandise", label: "Merchandise" },
  { value: "event", label: "Event" },
  { value: "general", label: "General" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ArticleEditor() {
  const [, params] = useRoute("/edit/:slug");
  const isEditing = !!params?.slug;
  const slug = params?.slug;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { canCreateArticle } = usePermission();

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [infoboxFields, setInfoboxFields] = useState<Array<{ key: string; value: string }>>([]);
  const [citations, setCitations] = useState<Array<{ title: string; url: string; text: string; format: string }>>([]);
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<number | null>(null);

  const { data: article } = useQuery<Article & { citations?: Citation[] }>({
    queryKey: ["/api/articles", slug],
    enabled: isEditing,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      summary: "",
      categoryId: null,
      infoboxType: null,
      editSummary: "",
    },
  });

  useEffect(() => {
    if (article && categories) {
      const artCat = categories.find((c) => c.id === article.categoryId);
      if (artCat?.parentId) {
        setSelectedParentCategoryId(artCat.parentId);
      } else if (artCat) {
        setSelectedParentCategoryId(artCat.id);
      }
      form.reset({
        title: article.title,
        slug: article.slug,
        content: article.content,
        summary: article.summary || "",
        categoryId: article.categoryId,
        infoboxType: article.infoboxType,
        editSummary: "",
      });
      setTags(article.tags || []);
      if (article.infoboxData && typeof article.infoboxData === "object") {
        setInfoboxFields(
          Object.entries(article.infoboxData as Record<string, string>).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        );
      }
      if ((article as any).citations) {
        setCitations(
          (article as any).citations.map((c: Citation) => ({
            title: c.title,
            url: c.url || "",
            text: c.text,
            format: c.format,
          }))
        );
      }
    }
  }, [article, categories, form]);

  const titleValue = form.watch("title");
  useEffect(() => {
    if (!isEditing && titleValue) {
      form.setValue("slug", slugify(titleValue));
    }
  }, [titleValue, isEditing, form]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/articles", data),
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Article created" });
      navigate(articleUrl(result));
    },
    onError: (err: Error) => {
      toast({ title: "Error creating article", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/articles/${slug}`, data),
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", "pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Revision submitted for review" });
      navigate(articleUrl(result));
    },
    onError: (err: Error) => {
      toast({ title: "Error updating article", description: err.message, variant: "destructive" });
    },
  });

  function addTag() {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function addInfoboxField() {
    setInfoboxFields([...infoboxFields, { key: "", value: "" }]);
  }

  function removeInfoboxField(index: number) {
    setInfoboxFields(infoboxFields.filter((_, i) => i !== index));
  }

  function addCitation() {
    setCitations([...citations, { title: "", url: "", text: "", format: "APA" }]);
  }

  function removeCitation(index: number) {
    setCitations(citations.filter((_, i) => i !== index));
  }

  function onSubmit(values: ArticleFormValues) {
    const infoboxData: Record<string, string> = {};
    infoboxFields.forEach((f) => {
      if (f.key.trim()) {
        infoboxData[f.key.trim()] = f.value;
      }
    });

    const payload = {
      ...values,
      tags,
      infoboxData: Object.keys(infoboxData).length > 0 ? infoboxData : null,
      citations: citations.filter((c) => c.title.trim()),
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!canCreateArticle) {
    return (
      <div className="max-w-sm mx-auto p-4 md:p-6 mt-16">
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-1">Access Restricted</h1>
          <p className="text-sm text-muted-foreground">
            You need Staff, Partner, Executive, or Admin access to create or edit articles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="h-3 w-3 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">{isEditing ? "Edit Article" : "New Article"}</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Article title" {...field} data-testid="input-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="article-slug" {...field} data-testid="input-slug" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Summary</FormLabel>
                <FormControl>
                  <Input placeholder="Brief summary of the article" {...field} data-testid="input-summary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={(v) => {
                    const id = v ? Number(v) : null;
                    setSelectedParentCategoryId(id);
                    form.setValue("categoryId", id);
                  }}
                  value={selectedParentCategoryId?.toString() || ""}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.filter((c) => !c.parentId).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
              {selectedParentCategoryId && (categories ?? []).some((c) => c.parentId === selectedParentCategoryId) && (
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategory <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v ? Number(v) : selectedParentCategoryId)}
                        value={
                          field.value && field.value !== selectedParentCategoryId
                            ? field.value.toString()
                            : ""
                        }
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-subcategory">
                            <SelectValue placeholder="Select subcategory" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.filter((c) => c.parentId === selectedParentCategoryId).map((sub) => (
                            <SelectItem key={sub.id} value={sub.id.toString()}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <FormField
              control={form.control}
              name="infoboxType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Infobox Type</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v || null)}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-infobox-type">
                        <SelectValue placeholder="Select infobox type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {infoboxTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Start writing your article content..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Label className="flex items-center gap-1 mb-2">
              <Tag className="h-3 w-3" />
              Tags
            </Label>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1"
                    data-testid={`button-remove-tag-${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="max-w-xs"
                data-testid="input-tag"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag} data-testid="button-add-tag">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="flex items-center gap-1 mb-2">
              <Info className="h-3 w-3" />
              Infobox Fields
            </Label>
            <div className="space-y-2">
              {infoboxFields.map((field, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Field name"
                    value={field.key}
                    onChange={(e) => {
                      const updated = [...infoboxFields];
                      updated[i].key = e.target.value;
                      setInfoboxFields(updated);
                    }}
                    className="max-w-[180px]"
                    data-testid={`input-infobox-key-${i}`}
                  />
                  <Input
                    placeholder="Value"
                    value={field.value}
                    onChange={(e) => {
                      const updated = [...infoboxFields];
                      updated[i].value = e.target.value;
                      setInfoboxFields(updated);
                    }}
                    data-testid={`input-infobox-value-${i}`}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInfoboxField(i)}
                        data-testid={`button-remove-infobox-${i}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove field</TooltipContent>
                  </Tooltip>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addInfoboxField} data-testid="button-add-infobox-field">
                <Plus className="h-3 w-3 mr-1" />
                Add Infobox Field
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="flex items-center gap-1 mb-2">
              <Link2 className="h-3 w-3" />
              Citations / References
            </Label>
            <div className="space-y-3">
              {citations.map((cit, i) => (
                <Card key={i} className="p-3 overflow-visible">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Citation title"
                          value={cit.title}
                          onChange={(e) => {
                            const updated = [...citations];
                            updated[i].title = e.target.value;
                            setCitations(updated);
                          }}
                          data-testid={`input-citation-title-${i}`}
                        />
                        <Input
                          placeholder="URL (optional)"
                          value={cit.url}
                          onChange={(e) => {
                            const updated = [...citations];
                            updated[i].url = e.target.value;
                            setCitations(updated);
                          }}
                          data-testid={`input-citation-url-${i}`}
                        />
                      </div>
                      <Input
                        placeholder="Citation text (e.g. Author, A. (2024). Title. Publisher.)"
                        value={cit.text}
                        onChange={(e) => {
                          const updated = [...citations];
                          updated[i].text = e.target.value;
                          setCitations(updated);
                        }}
                        data-testid={`input-citation-text-${i}`}
                      />
                      <Select
                        value={cit.format}
                        onValueChange={(v) => {
                          const updated = [...citations];
                          updated[i].format = v;
                          setCitations(updated);
                        }}
                      >
                        <SelectTrigger className="w-[120px]" data-testid={`select-citation-format-${i}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APA">APA</SelectItem>
                          <SelectItem value="MLA">MLA</SelectItem>
                          <SelectItem value="Chicago">Chicago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCitation(i)}
                          data-testid={`button-remove-citation-${i}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove citation</TooltipContent>
                    </Tooltip>
                  </div>
                </Card>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addCitation} data-testid="button-add-citation">
                <Plus className="h-3 w-3 mr-1" />
                Add Citation
              </Button>
            </div>
          </div>

          {isEditing && (
            <>
              <Separator />
              <FormField
                control={form.control}
                name="editSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edit Summary</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe your changes" {...field} data-testid="input-edit-summary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending} data-testid="button-submit">
              {isEditing ? (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  {isPending ? "Submitting..." : "Submit Revision"}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  {isPending ? "Creating..." : "Create Article"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
