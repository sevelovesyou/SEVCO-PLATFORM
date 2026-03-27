import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChevronLeft, Users, ShieldOff } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  bio: z.string().max(2000).optional(),
  genres: z.string().optional(),
  wikiArticleSlug: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CAN_MANAGE_MUSIC = ["admin", "executive", "staff"];

function AccessDenied() {
  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <ShieldOff className="h-12 w-12 text-muted-foreground opacity-30" />
      <div>
        <h2 className="text-lg font-semibold mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Only Admin, Executive, and Staff can add artists to the catalog.
        </p>
        <Link href="/music/artists">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            Back to Artists
          </Button>
        </Link>
      </div>
    </div>
  );
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function MusicArtistForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { role } = usePermission();

  if (!CAN_MANAGE_MUSIC.includes(role ?? "")) {
    return <AccessDenied />;
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", slug: "", bio: "", genres: "", wikiArticleSlug: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const genres = values.genres
        ? values.genres.split(",").map((g) => g.trim()).filter(Boolean)
        : [];
      return apiRequest("POST", "/api/music/artists", {
        name: values.name,
        slug: values.slug,
        bio: values.bio || null,
        genres: genres.length > 0 ? genres : null,
        wikiArticleSlug: values.wikiArticleSlug || null,
      });
    },
    onSuccess: async (res) => {
      const artist = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/music/artists"] });
      toast({ title: "Artist added to the catalog" });
      setLocation(`/music/artists/${artist.slug}`);
    },
    onError: (err: any) => {
      toast({ title: "Failed to create artist", description: err.message, variant: "destructive" });
    },
  });

  function handleNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!form.getValues("slug")) {
      form.setValue("slug", toSlug(e.target.value), { shouldValidate: true });
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href="/music/artists">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            Artists
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-blue-600/10 flex items-center justify-center">
          <Users className="h-4 w-4 text-blue-700 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Add Artist</h1>
          <p className="text-sm text-muted-foreground">Add a new artist to the SEVCO RECORDS catalog.</p>
        </div>
      </div>

      <Card className="p-5 overflow-visible">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artist Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. The SEVCO Band"
                      data-testid="input-artist-name"
                      {...field}
                      onBlur={(e) => { field.onBlur(); handleNameBlur(e); }}
                    />
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
                  <FormLabel>Slug *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. the-sevco-band"
                      data-testid="input-artist-slug"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="genres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genres</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Hip-Hop, R&B, Electronic (comma-separated)"
                      data-testid="input-artist-genres"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Short biography or description…"
                      rows={4}
                      data-testid="input-artist-bio"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wikiArticleSlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wiki Article Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. sevco-band-history (optional)"
                      data-testid="input-artist-wiki"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/music/artists">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-artist"
              >
                {mutation.isPending ? "Adding…" : "Add Artist"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
