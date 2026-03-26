import { useState } from "react";
import { PageHead } from "@/components/page-head";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Music, CheckCircle, Send, Mic2, Disc3, Radio, Lock } from "lucide-react";
import { Link } from "wouter";
import { FileUpload } from "@/components/file-upload";

const submitSchema = z.object({
  submitterName: z.string().min(1, "Your name is required"),
  submitterEmail: z.string().email("Valid email is required"),
  artistName: z.string().min(1, "Artist name is required"),
  trackTitle: z.string().min(1, "Track title is required"),
  trackUrl: z.string().url("Enter a valid URL to your track"),
  genre: z.string().optional(),
  notes: z.string().max(1000).optional(),
  agreed: z.boolean().refine((v) => v === true, "You must confirm you own the rights"),
});

type SubmitForm = z.infer<typeof submitSchema>;

const GENRES = [
  "Hip-Hop / Rap", "R&B / Soul", "Pop", "Electronic / Dance",
  "Alternative", "Rock", "Indie", "Jazz", "Lo-Fi", "Other",
];

const WHAT_WE_LOOK_FOR = [
  { icon: Mic2,   title: "Originality",        desc: "We're drawn to artists with a unique voice and perspective." },
  { icon: Disc3,  title: "Production Quality", desc: "Your music doesn't need to be fully mastered, but it should be well-crafted." },
  { icon: Radio,  title: "Artistic Vision",    desc: "We want artists who know what they're building and why." },
];

function SignInPrompt() {
  return (
    <Card className="p-10 overflow-visible text-center" data-testid="submit-signin-prompt">
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="font-bold text-xl mb-2">Sign in to submit</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        A SEVCO account is required to submit music to SEVCO RECORDS.
        Create one for free — it only takes a minute.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/auth">
          <Button data-testid="button-signin">Sign in</Button>
        </Link>
        <Link href="/auth?tab=register">
          <Button variant="outline" data-testid="button-signup">Create account</Button>
        </Link>
      </div>
    </Card>
  );
}

export default function MusicSubmitPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [trackFilePath, setTrackFilePath] = useState<string>("");

  const form = useForm<SubmitForm>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      submitterName: user?.displayName || user?.username || "",
      submitterEmail: user?.email || "",
      artistName: "",
      trackTitle: "",
      trackUrl: "",
      genre: "",
      notes: "",
      agreed: false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: SubmitForm) => {
      const { agreed: _agreed, ...payload } = data;
      const sub = await apiRequest("POST", "/api/music/submissions", { ...payload, type: "label" });
      if (trackFilePath && sub?.id) {
        try {
          await apiRequest("PATCH", `/api/music/submissions/${sub.id}/track-file`, { trackFileUrl: trackFilePath });
        } catch {
          // non-fatal
        }
      }
      return sub;
    },
    onSuccess: () => {
      setSubmitted(true);
      setTrackFilePath("");
      form.reset();
    },
    onError: (e: Error) => {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title="Submit Music — SEVCO Records A&R"
        description="Submit your music to SEVCO Records. We're always listening for artists who move people. Share your work and we'll be in touch."
        ogUrl="https://sevco.us/music/submit"
      />
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10 md:py-14">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <Music className="h-3.5 w-3.5" />
            SEVCO Records A&amp;R
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Submit to SEVCO RECORDS</h1>
          <p className="text-muted-foreground">
            SEVCO RECORDS is always listening. If you make music that moves people, we want to hear it.
            Share your work and we'll be in touch if there's a fit.
          </p>
        </div>

        {/* What we look for */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {WHAT_WE_LOOK_FOR.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="border rounded-xl p-4">
              <Icon className="h-5 w-5 text-violet-500 mb-3" />
              <h3 className="text-sm font-semibold mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Genre preferences */}
        <div className="border rounded-xl p-4 mb-8 bg-muted/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">What we're looking for</p>
          <p className="text-sm text-muted-foreground">
            We're open to all genres but especially love Hip-Hop, R&B, Soul, Electronic, and emerging sounds
            that don't fit neatly into one box. Above all, we want authenticity. We sign artists, not just records.
          </p>
        </div>

        {/* Form or sign-in prompt */}
        {!user ? (
          <SignInPrompt />
        ) : submitted ? (
          <Card className="p-10 overflow-visible text-center" data-testid="submit-success">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <h2 className="font-bold text-xl mb-2">Submission received</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Thanks for reaching out. We listen to every submission and will follow up if your music is a fit for SEVCO RECORDS.
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
                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="submitterName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} data-testid="input-submitter-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="submitterEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} data-testid="input-submitter-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="artistName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artist / Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Stage name or project" {...field} data-testid="input-artist-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="trackTitle" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Track Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Name of the track" {...field} data-testid="input-track-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="trackUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Track Link</FormLabel>
                    <FormControl>
                      <Input placeholder="SoundCloud, YouTube, Spotify, Dropbox..." {...field} data-testid="input-track-url" />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Share a link to your best work.</p>
                  </FormItem>
                )} />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Upload Track File <span className="text-muted-foreground font-normal">(optional)</span></p>
                  <p className="text-xs text-muted-foreground">Upload an audio file directly instead of or in addition to the link above. Max 50 MB.</p>
                  <FileUpload
                    bucket="tracks"
                    path={`submissions/pending/${Date.now()}.{ext}`}
                    accept="audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/aac,audio/mp4"
                    maxSizeMb={50}
                    currentUrl={trackFilePath}
                    onUpload={(_url, storagePath) => setTrackFilePath(storagePath)}
                    label="Upload Audio File"
                    isPrivate
                  />
                  {trackFilePath && (
                    <p className="text-xs text-green-600 dark:text-green-400">Audio file ready to submit</p>
                  )}
                </div>

                <FormField control={form.control} name="genre" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-genre">
                          <SelectValue placeholder="Select a genre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anything else <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself, your influences, what you're working on..."
                        rows={4}
                        className="resize-none"
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">{(field.value ?? "").length}/1000</p>
                  </FormItem>
                )} />

                <FormField control={form.control} name="agreed" render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-agree"
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel className="font-normal text-sm leading-snug cursor-pointer">
                        I confirm this is original content and I own the rights to submit this music
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} />

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

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/music">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">← SEVCO Records</span>
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <Link href="/music/playlists">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Playlist pitches →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
