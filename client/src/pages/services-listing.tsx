import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageHead } from "@/components/page-head";
import {
  ArrowRight,
  Code2, Plug, Lightbulb, Palette, MousePointer2, Sparkles,
  FileText, Share2, TrendingUp, ClipboardList, Settings2,
  Handshake, Target, BookOpen, HeadphonesIcon,
  Server, Globe, Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Service } from "@shared/schema";

const CATEGORY_BORDER_COLORS: Record<string, string> = {
  Technology: "border-l-blue-500",
  Creative:   "border-l-blue-600",
  Marketing:  "border-l-red-700",
  Business:   "border-l-green-500",
  Media:      "border-l-yellow-500",
  Support:    "border-l-pink-500",
};

const DEFAULT_SOCIAL_PROOF_ITEMS = [
  "Enterprise Teams",
  "Startups",
  "Indie Creators",
  "Agencies",
  "Open-Source Projects",
];

const ICON_MAP: Record<string, React.ElementType> = {
  Code2, Plug, Lightbulb, Palette, MousePointer2, Sparkles,
  FileText, Share2, TrendingUp, ClipboardList, Settings2,
  Handshake, Target, BookOpen, HeadphonesIcon,
};

const CATEGORY_STYLES: Record<string, { accent: string; badge: string }> = {
  Technology: { accent: "text-blue-600 dark:text-blue-400",    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
  Creative:   { accent: "text-blue-600 dark:text-blue-400", badge: "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-600/20" },
  Marketing:  { accent: "text-red-700 dark:text-red-500", badge: "bg-red-700/10 text-red-800 dark:text-red-300 border-red-700/20" },
  Business:   { accent: "text-green-600 dark:text-green-400",   badge: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20" },
  Media:      { accent: "text-yellow-600 dark:text-yellow-500", badge: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20" },
  Support:    { accent: "text-pink-600 dark:text-pink-400",     badge: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20" },
};

const CATEGORY_ORDER = ["Technology", "Creative", "Marketing", "Business", "Media", "Support"];

export default function ServicesListingPage() {
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: platformSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const servicesAccentHsl = platformSettings["services.accentColor"];

  const grouped = CATEGORY_ORDER.reduce<Record<string, Service[]>>((acc, cat) => {
    const items = (services ?? []).filter((s) => s.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const featured = (services ?? []).filter((s) => s.featured);

  return (
    <div className="min-h-screen bg-background" data-page="services">
      <PageHead
        slug="services"
        title="Services — Engineering, Design & Marketing | SEVCO"
        description="SEVCO offers professional services across engineering, design, marketing, and operations. Partner with our team to build and grow."
        ogUrl="https://sevco.us/services"
      />
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="mb-12">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            SEVCO Services
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            What we do
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            From engineering and design to marketing and operations — the SEVCO team brings expertise across every discipline.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Link href="/pricing">
              <Button variant="destructive" size="lg" className="font-semibold gap-2 px-6" data-testid="button-services-primary-cta">
                <ArrowRight className="h-4 w-4" />
                Get Started
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="border-white/20 font-semibold gap-2 px-6" data-testid="button-services-secondary-cta">
                Get in Touch
              </Button>
            </Link>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mb-12 py-6 border-y border-border/40" data-testid="section-social-proof">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {platformSettings["services.socialProof.heading"] || "Trusted by teams and creators"}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {(() => {
                let items = DEFAULT_SOCIAL_PROOF_ITEMS;
                if (platformSettings["services.socialProof.items"]) {
                  try {
                    const parsed = JSON.parse(platformSettings["services.socialProof.items"]);
                    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((v: unknown) => typeof v === "string")) items = parsed;
                  } catch {}
                }
                return items.map((item: string) => (
                  <span
                    key={item}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground opacity-60"
                    data-testid={`social-proof-badge-${item.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {item}
                  </span>
                ));
              })()}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border rounded-xl p-5 space-y-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && featured.length > 0 && (
          <div className="mb-12">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Featured</p>
            <div className="grid md:grid-cols-2 gap-4">
              {featured.map((service) => {
                const Icon = (service.iconName && ICON_MAP[service.iconName]) ? ICON_MAP[service.iconName] : Sparkles;
                const styles = CATEGORY_STYLES[service.category] ?? CATEGORY_STYLES.Technology;
                return (
                  <Link href={`/services/${service.slug}`} key={service.id}>
                    <div
                      data-testid={`card-service-featured-${service.id}`}
                      className="group border rounded-xl p-6 hover:border-foreground/20 hover:shadow-sm transition-all cursor-pointer bg-background"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-lg bg-muted ${styles.accent}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base">{service.name}</h3>
                            <Badge variant="outline" className={`text-xs ${styles.badge}`}>
                              {service.category}
                            </Badge>
                          </div>
                          {service.tagline && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{service.tagline}</p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && Object.entries(grouped).map(([category, items]) => {
          const styles = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Technology;
          const accentStyle = servicesAccentHsl ? { color: `hsl(${servicesAccentHsl})` } : undefined;
          const borderColor = CATEGORY_BORDER_COLORS[category] ?? "border-l-border";
          return (
            <div key={category} className={`mb-10 border-l-[3px] pl-4 ${borderColor}`}>
              <div className="flex items-center gap-3 mb-4">
                <h2
                  className={`text-sm font-semibold uppercase tracking-wider ${accentStyle ? "" : styles.accent}`}
                  style={accentStyle}
                >
                  {category}
                </h2>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {items.map((service) => {
                  const Icon = (service.iconName && ICON_MAP[service.iconName]) ? ICON_MAP[service.iconName] : Sparkles;
                  return (
                    <Link href={`/services/${service.slug}`} key={service.id}>
                      <div
                        data-testid={`card-service-${service.id}`}
                        className="group border rounded-xl p-4 hover:border-foreground/20 hover:shadow-sm transition-all cursor-pointer bg-background h-full"
                      >
                        <div className={`mb-3 ${accentStyle ? "" : styles.accent}`} style={accentStyle}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-sm mb-1 group-hover:text-foreground transition-colors">
                          {service.name}
                        </h3>
                        {service.tagline && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{service.tagline}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!isLoading && (services ?? []).length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium mb-2">No services yet</p>
            <p className="text-sm">Check back soon.</p>
          </div>
        )}

        {/* Infrastructure section */}
        <div className="mt-12 mb-8" data-testid="section-infrastructure">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">Infrastructure</h2>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/hosting">
              <div
                data-testid="card-infra-hosting"
                className="group border border-teal-500/20 rounded-xl p-6 bg-gradient-to-br from-teal-500/5 to-background hover:border-teal-500/40 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
                    <Server className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">SEVCO Hosting</h3>
                      <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20">
                        Infrastructure
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Reliable, managed hosting solutions for your websites and web applications.</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                </div>
              </div>
            </Link>
            <Link href="/domains">
              <div
                data-testid="card-infra-domains"
                className="group border border-teal-500/20 rounded-xl p-6 bg-gradient-to-br from-teal-500/5 to-background hover:border-teal-500/40 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">Domain Registration</h3>
                      <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20">
                        Infrastructure
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Register and manage domain names for your brand, business, or project.</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="mt-8 border rounded-2xl p-8 md:p-10 bg-muted/30 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to work together?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Reach out and let's talk about what SEVCO can build for you.
          </p>
          <Link href="/contact">
            <Button size="lg" data-testid="button-contact-cta">
              Get in touch
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
