import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageHead } from "@/components/page-head";
import {
  ArrowLeft, ArrowRight, CircleX, ExternalLink, Mail,
  Code2, Plug, Lightbulb, Palette, MousePointer2, Sparkles,
  FileText, Share2, TrendingUp, ClipboardList, Settings2,
  Handshake, Target, BookOpen, HeadphonesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Service } from "@shared/schema";

const ICON_MAP: Record<string, React.ElementType> = {
  Code2, Plug, Lightbulb, Palette, MousePointer2, Sparkles,
  FileText, Share2, TrendingUp, ClipboardList, Settings2,
  Handshake, Target, BookOpen, HeadphonesIcon,
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string; badge: string }> = {
  Engineering: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
  Design:      { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20" },
  Marketing:   { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20" },
  Operations:  { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", badge: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20" },
  Sales:       { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-500", badge: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20" },
  Support:     { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", badge: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20" },
};

function parseMarkdownBlocks(text: string): Array<{ type: "heading" | "bullet" | "text"; content: string }> {
  const lines = text.split("\n");
  const blocks: Array<{ type: "heading" | "bullet" | "text"; content: string }> = [];
  for (const line of lines) {
    if (line.startsWith("**") && line.endsWith("**")) {
      blocks.push({ type: "heading", content: line.slice(2, -2) });
    } else if (line.startsWith("- ")) {
      blocks.push({ type: "bullet", content: line.slice(2) });
    } else if (line.trim()) {
      blocks.push({ type: "text", content: line });
    }
  }
  return blocks;
}

function ServiceIcon({ iconName, className }: { iconName: string | null | undefined; className?: string }) {
  const Icon = ICON_MAP[iconName ?? ""] ?? Code2;
  return <Icon className={className} />;
}

export default function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: service, isLoading, isError } = useQuery<Service>({
    queryKey: ["/api/services", slug],
    queryFn: async () => {
      const res = await fetch(`/api/services/${slug}`);
      if (!res.ok) throw new Error("Service not found");
      return res.json();
    },
  });

  const { data: allServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const relatedServices = (allServices ?? [])
    .filter((s) => s.slug !== slug && s.category === service?.category && s.status === "active")
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    );
  }

  if (isError || !service) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col items-center gap-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <CircleX className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-lg">Service Not Found</p>
          <p className="text-muted-foreground text-sm mt-1">
            This service doesn't exist or has been removed.
          </p>
        </div>
        <Link href="/services">
          <Button variant="outline" size="sm" data-testid="button-back-to-services">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
        </Link>
      </div>
    );
  }

  const categoryStyle = CATEGORY_STYLES[service.category] ?? CATEGORY_STYLES.Engineering;
  const descBlocks = service.description ? parseMarkdownBlocks(service.description) : [];

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title={`${service.name} — SEVCO Services`}
        description={service.tagline || service.description?.slice(0, 155) || `Learn about ${service.name}, a SEVCO service in the ${service.category} category.`}
        ogUrl={`https://sevco.us/services/${service.slug}`}
      />
      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-8">
          <Link href="/services">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -ml-2"
              data-testid="button-back-to-services"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Services
            </Button>
          </Link>
        </div>

        <div className="rounded-2xl border border-border overflow-hidden mb-10">
          <div className={`${categoryStyle.bg} px-8 py-10 border-b border-border`}>
            <div className="flex items-start gap-6">
              <div className={`h-16 w-16 rounded-2xl ${categoryStyle.bg} border border-border/50 flex items-center justify-center shrink-0`}>
                <ServiceIcon iconName={service.iconName} className={`h-8 w-8 ${categoryStyle.text}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${categoryStyle.badge}`}>
                    {service.category}
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-2" data-testid="text-service-name">
                  {service.name}
                </h1>
                {service.tagline && (
                  <p className="text-muted-foreground text-lg" data-testid="text-service-tagline">
                    {service.tagline}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="px-8 py-8">
            {descBlocks.length > 0 ? (
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                {descBlocks.map((block, i) => {
                  if (block.type === "heading") {
                    return (
                      <h2 key={i} className="text-base font-bold text-foreground mt-6 first:mt-0">
                        {block.content}
                      </h2>
                    );
                  }
                  if (block.type === "bullet") {
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <span className={`h-1.5 w-1.5 rounded-full mt-2 shrink-0 ${categoryStyle.text}`} style={{ background: "currentColor" }} />
                        <span>{block.content}</span>
                      </div>
                    );
                  }
                  return <p key={i}>{block.content}</p>;
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Details about this service are coming soon. Get in touch for more information.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-8 mb-10">
          <div className="max-w-xl">
            <h2 className="text-xl font-bold mb-2">Interested in this service?</h2>
            <p className="text-muted-foreground mb-5">
              Reach out to the SEVCO team to learn more about working together on <strong>{service.name}</strong>.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/contact">
                <Button className="gap-2" data-testid="button-contact-service">
                  <Mail className="h-4 w-4" />
                  Get in Touch
                </Button>
              </Link>
              <Link href="/services">
                <Button variant="outline" className="gap-2" data-testid="button-browse-services">
                  <ArrowLeft className="h-4 w-4" />
                  All Services
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {relatedServices.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">More {service.category} Services</h2>
              <Link href="/services">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedServices.map((s) => {
                const relStyle = CATEGORY_STYLES[s.category] ?? CATEGORY_STYLES.Engineering;
                return (
                  <Link key={s.id} href={`/services/${s.slug}`}>
                    <div
                      className="border border-border rounded-xl p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                      data-testid={`related-service-${s.slug}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`h-9 w-9 rounded-xl ${relStyle.bg} flex items-center justify-center shrink-0`}>
                          <ServiceIcon iconName={s.iconName} className={`h-4 w-4 ${relStyle.text}`} />
                        </div>
                        <p className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-1">
                          {s.name}
                        </p>
                      </div>
                      {s.tagline && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {s.tagline}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
