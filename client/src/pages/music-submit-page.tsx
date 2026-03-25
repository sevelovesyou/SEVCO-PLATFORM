import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Music, CheckCircle, Send, Mic2, Disc3, Radio } from "lucide-react";
import { Link } from "wouter";

const submitSchema = z.object({
  artistName: z.string().min(1, "Artist name is required"),
  email: z.string().email("Valid email is required"),
  genre: z.string().optional(),
  socialLink: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  musicLink: z.string().url("Enter a valid link to your music").min(1, "Music link is required"),
  message: z.string().max(1000).optional(),
});
type SubmitForm = z.infer<typeof submitSchema>;

const GENRES = [
  "Hip-Hop / Rap", "R&B / Soul", "Pop", "Electronic / Dance",
  "Alternative", "Rock", "Indie", "Jazz", "Lo-Fi", "Other",
];

const WHAT_WE_LOOK_FOR = [
  { icon: Mic2, title: "Originality", desc: "We're drawn to artists with a unique voice and perspective." },
  { icon: Disc3, title: "Production Quality", desc: "Your music doesn't need to be fully mastered, but it should be well-crafted." },
  { icon: Radio, title: "Artistic Vision", desc: "We want artists who know what they're building and why." },
];

export default function MusicSubmitPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<SubmitForm>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      artistName: "",
      email: "",
      genre: "",
      socialLink: "",
      musicLink: "",
      message: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: SubmitForm) => apiRequest("POST", "/api/music/submit", data),
    onSuccess: () => {
      setSubmitted(true);
      form.reset();
    },
    onError: (e: Error) => {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-widest">
          <Music className="h-3.5 w-3.5" />
          SEVCO Records
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Submit your music</h1>
        <p className="text-muted-foreground max-w-xl">
          SEVCO Records is always listening. If you make music that moves people, we want to hear it.
          Share your work and we'll be in touch if there's a fit.
        </p>
      </div>

      {/* What we look for */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {WHAT_WE_LOOK_FOR.map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="p-4 overflow-visible">
            <Icon className="h-5 w-5 text-violet-500 mb-2" />
            <h3 className="text-sm font-semibold mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </Card>
        ))}
      </div>

      {/* Form */}
      {submitted ? (
        <Card className="p-10 overflow-visible text-center" data-testid="submit-success">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <h2 className="font-bold text-xl mb-2">Submission received</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Thanks for reaching out. We listen to every submission and will follow up if your music is a fit for SEVCO Records.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/music">
              <Button variant="outline" size="sm">Explore music</Button>
            </Link>
            <Button size="sm" onClick={() => setSubmitted(false)} variant="ghost">
              Submit another
            </Button>
          </div>
        </Card>
      ) : (
        <div className="border rounded-xl p-6">
          <h2 className="font-semibold mb-5 text-sm">Your submission</h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="space-y-5"
              data-testid="form-music-submit"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="artistName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artist / Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Stage name or project" {...field} data-testid="input-artist-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        list="genre-list"
                        placeholder="e.g. Hip-Hop, R&B, Electronic..."
                        {...field}
                        data-testid="input-genre"
                      />
                    </FormControl>
                    <datalist id="genre-list">
                      {GENRES.map((g) => <option key={g} value={g} />)}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="musicLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Music Link</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SoundCloud, YouTube, Spotify, Dropbox..."
                        {...field}
                        data-testid="input-music-link"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Share a link to your best work — SoundCloud, YouTube, Spotify, or a direct file.</p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Social / Website <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Instagram, TikTok, or personal site URL"
                        {...field}
                        data-testid="input-social-link"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anything else <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself, your influences, what you're working on..."
                        rows={4}
                        className="resize-none"
                        {...field}
                        data-testid="input-message"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">{(field.value ?? "").length}/1000</p>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={mutation.isPending}
                data-testid="button-submit-music"
              >
                {mutation.isPending ? "Submitting..." : (
                  <><Send className="h-4 w-4" /> Submit Demo</>
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center mt-6">
        We review all submissions personally. Due to volume, we can only respond to submissions we're pursuing.
        Submitting your music does not constitute an agreement or obligation of any kind.
      </p>
    </div>
  );
}
