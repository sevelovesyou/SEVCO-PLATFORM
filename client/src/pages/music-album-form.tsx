import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Disc, ShieldOff } from "lucide-react";
import type { Artist } from "@shared/schema";
import { usePermission } from "@/hooks/use-permission";

const currentYear = new Date().getFullYear();
const CAN_MANAGE_MUSIC = ["admin", "executive", "staff"];

function AccessDenied() {
  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <ShieldOff className="h-12 w-12 text-muted-foreground opacity-30" />
      <div>
        <h2 className="text-lg font-semibold mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Only Admin, Executive, and Staff can add albums to the catalog.
        </p>
        <Link href="/music">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            Back to Records
          </Button>
        </Link>
      </div>
    </div>
  );
}

const formSchema = z.object({
  artistId: z.string().min(1, "Artist is required"),
  title: z.string().min(1, "Title is required").max(300),
  slug: z.string()
    .min(1, "Slug is required")
    .max(300)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  releaseYear: z.string().optional(),
  trackList: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function MusicAlbumForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { role } = usePermission();

  if (!CAN_MANAGE_MUSIC.includes(role ?? "")) {
    return <AccessDenied />;
  }

  const { data: artistsList } = useQuery<Artist[]>({
    queryKey: ["/api/music/artists"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      artistId: "",
      title: "",
      slug: "",
      releaseYear: "",
      trackList: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const tracks = values.trackList
        ? values.trackList.split("\n").map((t) => t.trim()).filter(Boolean)
        : [];
      return apiRequest("POST", "/api/music/albums", {
        artistId: parseInt(values.artistId),
        title: values.title,
        slug: values.slug,
        releaseYear: values.releaseYear ? parseInt(values.releaseYear) : null,
        trackList: tracks.length > 0 ? tracks : null,
      });
    },
    onSuccess: async (res) => {
      const album = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/music/albums"] });
      toast({ title: "Album added to the catalog" });
      setLocation(`/music/albums/${album.slug}`);
    },
    onError: (err: any) => {
      toast({ title: "Failed to create album", description: err.message, variant: "destructive" });
    },
  });

  function handleTitleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!form.getValues("slug")) {
      form.setValue("slug", toSlug(e.target.value), { shouldValidate: true });
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href="/music">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            Records
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Disc className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Add Album</h1>
          <p className="text-sm text-muted-foreground">Add a new album to the SEVCO RECORDS catalog.</p>
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
              name="artistId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artist *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-artist-id">
                        <SelectValue placeholder="Select an artist…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(artistsList || []).map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Album Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. First Light"
                      data-testid="input-album-title"
                      {...field}
                      onBlur={(e) => { field.onBlur(); handleTitleBlur(e); }}
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
                      placeholder="e.g. first-light"
                      data-testid="input-album-slug"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="releaseYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Release Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={String(currentYear)}
                      min={1900}
                      max={currentYear + 2}
                      data-testid="input-album-year"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trackList"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Track Listing</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={"One track per line:\nTrack 1 Title\nTrack 2 Title\n…"}
                      rows={6}
                      data-testid="input-album-tracks"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/music">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-album"
              >
                {mutation.isPending ? "Adding…" : "Add Album"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
