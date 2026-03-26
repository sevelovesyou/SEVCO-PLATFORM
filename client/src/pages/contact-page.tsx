import { useState } from "react";
import { useForm } from "react-hook-form";
import { PageHead } from "@/components/page-head";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Mail, MessageSquare } from "lucide-react";
import {
  SiDiscord, SiInstagram, SiX, SiTiktok, SiFacebook, SiYoutube,
  SiThreads, SiLinkedin, SiBluesky, SiSnapchat, SiPinterest, SiVimeo,
  SiGithub, SiSoundcloud, SiSpotify, SiApplemusic, SiPatreon, SiTwitch,
} from "react-icons/si";
import type { PlatformSocialLink } from "@shared/schema";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  subject: z.enum(["Support", "Business Inquiry", "Press", "Other"], {
    required_error: "Please select a subject",
  }),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const DISCORD_INVITE = "https://discord.gg/sevco";

type IconComponent = React.ComponentType<{ className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  SiFacebook, SiInstagram, SiYoutube, SiTiktok, SiX, SiThreads,
  SiLinkedin, SiBluesky, SiSnapchat, SiPinterest, SiVimeo, SiGithub,
  SiDiscord, SiSoundcloud, SiSpotify, SiApplemusic, SiPatreon, SiTwitch,
};

const FALLBACK_SOCIALS = [
  { platform: "Instagram", url: "https://instagram.com/sevelovesyou", iconName: "SiInstagram" },
  { platform: "X / Twitter", url: "https://x.com/sevelovesu", iconName: "SiX" },
  { platform: "TikTok", url: "https://www.tiktok.com/@sevelovesu", iconName: "SiTiktok" },
];

export default function ContactPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const { data: socialLinks } = useQuery<PlatformSocialLink[]>({
    queryKey: ["/api/social-links"],
  });

  const contactSocials = socialLinks
    ? socialLinks.filter((l) => l.showOnContact)
    : FALLBACK_SOCIALS.map((s, i) => ({ ...s, id: i, showInFooter: false, showOnContact: true, displayOrder: i }));

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ContactFormValues) =>
      apiRequest("POST", "/api/contact", data),
    onSuccess: () => {
      setSubmitted(true);
      form.reset();
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to send",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ContactFormValues) {
    mutation.mutate(data);
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title="Contact SEVCO — Get in Touch"
        description="Have a question, partnership idea, or want to say hello? Reach out to the SEVCO team through the contact form or social media."
        ogUrl="https://sevco.us/contact"
      />
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="heading-contact">
            Get in Touch
          </h1>
          <p className="text-muted-foreground text-base max-w-lg">
            Have a question, a partnership idea, or just want to say hello? Fill out the form or reach us through any of our channels below.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-5 gap-12">
          {/* Contact form — left/main */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Send a Message</h2>
            </div>

            {submitted ? (
              <div
                className="flex flex-col items-center justify-center gap-4 py-16 text-center rounded-2xl border bg-muted/30"
                data-testid="contact-success"
              >
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div>
                  <h3 className="text-lg font-bold mb-1">Message sent!</h3>
                  <p className="text-sm text-muted-foreground">
                    We'll get back to you as soon as possible. You can also reach us on Discord for faster responses.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubmitted(false)}
                  data-testid="button-send-another"
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" data-testid="form-contact">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your name"
                              data-testid="input-contact-name"
                              {...field}
                            />
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
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              data-testid="input-contact-email"
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
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-contact-subject">
                              <SelectValue placeholder="Select a topic" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Support">Support</SelectItem>
                            <SelectItem value="Business Inquiry">Business Inquiry</SelectItem>
                            <SelectItem value="Press">Press</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us what's on your mind..."
                            className="min-h-[140px] resize-none"
                            data-testid="textarea-contact-message"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full font-semibold"
                    disabled={mutation.isPending}
                    data-testid="button-contact-submit"
                  >
                    {mutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </Form>
            )}
          </div>

          {/* Sidebar — right */}
          <div className="md:col-span-2 space-y-6">
            {/* Discord card */}
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              data-testid="card-discord"
            >
              <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 p-6 hover:border-indigo-500/50 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <SiDiscord className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Join our Discord</p>
                    <p className="text-xs text-muted-foreground">SEVCO Community</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  The fastest way to reach us and connect with the community. Drop in and say hello.
                </p>
                <Button
                  size="sm"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2"
                  asChild
                >
                  <span>
                    <SiDiscord className="h-3.5 w-3.5" />
                    Join Discord
                  </span>
                </Button>
              </div>
            </a>

            {/* Socials */}
            {contactSocials.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Follow Along
                </h3>
                <div className="space-y-2">
                  {contactSocials.map((social) => {
                    const Icon = ICON_MAP[social.iconName];
                    if (!Icon) return null;
                    return (
                      <a
                        key={social.id}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`link-social-${social.platform.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                      >
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted hover:opacity-80 transition-opacity cursor-pointer">
                          <Icon className="h-4 w-4 text-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground">{social.platform}</p>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* General info */}
            <div className="rounded-xl border bg-muted/30 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Business Inquiries
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                For partnerships, press, and business inquiries, use the form or reach us through your designated SEVCO contact if you're an existing partner.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
