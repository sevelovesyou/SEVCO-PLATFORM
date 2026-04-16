import { Link } from "wouter";
import { ArrowRight, Building2, Globe, Music, Layers, Zap, Users, Package, FileImage, Type, Image, Download, ExternalLink, Search, Plus, Settings, Trash2, Check, X, ChevronRight } from "lucide-react";
import { PageHead } from "@/components/page-head";
import { SiInstagram, SiX, SiYoutube, SiDiscord, SiGithub } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import type { BrandAsset } from "@shared/schema";
import {
  BrandSection,
  ColorSwatch,
  ColorScale,
  TypeSpecimen,
  TypeScale,
  ShadowCard,
  SpacingRuler,
  MotionDemo,
  ShaderPaletteCard,
  ComponentExample,
  IconExample,
} from "@/components/brand";

const SOCIAL_LINKS = [
  { icon: SiX,         label: "X / Twitter",  href: "https://x.com/sevelovesu",                         handle: "@sevelovesu" },
  { icon: SiInstagram, label: "Instagram",     href: "https://instagram.com/sevelovesyou",                handle: "@sevelovesyou" },
  { icon: SiDiscord,   label: "Discord",       href: "https://discord.gg/sevco",                          handle: "SEVCO Discord" },
  { icon: SiYoutube,   label: "YouTube",       href: "https://youtube.com/@sevco",                        handle: "SEVCO" },
  { icon: SiGithub,    label: "GitHub",        href: "https://github.com/sevco",                          handle: "sevco" },
];

const PILLARS = [
  {
    icon: Music,
    title: "SEVCO Records",
    description: "An independent label discovering and amplifying emerging talent. From submission to release, we back artists who mean it.",
    href: "/music",
  },
  {
    icon: Globe,
    title: "SEVCO Services",
    description: "Creative and technical services — from web and design to domain infrastructure — to help partners build and grow.",
    href: "/services",
  },
  {
    icon: Layers,
    title: "SEVCO Ventures",
    description: "A portfolio of internal projects and products. Platforms, apps, brands, and experiments built under the SEVCO umbrella.",
    href: "/projects",
  },
  {
    icon: Zap,
    title: "SEVCO Platform",
    description: "The operational backbone — the wiki, tools, and internal systems that keep the whole organisation running.",
    href: "/wiki",
  },
];

const ASSET_TYPE_ORDER = ["logo", "color_palette", "font", "banner", "icon", "other"];

const ASSET_TYPE_LABELS: Record<string, string> = {
  logo: "Logos",
  color_palette: "Color Palettes",
  font: "Typography",
  banner: "Banners",
  icon: "Icons",
  other: "Other",
};

function assetTypeIcon(type: string) {
  switch (type) {
    case "logo": return <Image className="h-5 w-5 text-muted-foreground" />;
    case "color_palette": return <div className="h-5 w-5 rounded-full bg-gradient-to-br from-primary to-primary/40" />;
    case "font": return <Type className="h-5 w-5 text-muted-foreground" />;
    case "banner": return <FileImage className="h-5 w-5 text-muted-foreground" />;
    case "icon": return <Package className="h-5 w-5 text-muted-foreground" />;
    default: return <Package className="h-5 w-5 text-muted-foreground" />;
  }
}

const BRAND_COLORS = [
  { name: "Brand Main", settingKey: "color.brand.main", fallback: "225 60% 48%", usage: "Primary brand identity" },
  { name: "Brand Secondary", settingKey: "color.brand.secondary", fallback: "225 65% 58%", usage: "Secondary brand support" },
  { name: "Brand Accent", settingKey: "color.brand.accent", fallback: "220 14% 93%", usage: "Brand accent surfaces" },
  { name: "Brand Highlight", settingKey: "color.brand.highlight", fallback: "45 90% 60%", usage: "Spotlights & callouts" },
];

const SEMANTIC_COLORS = [
  { name: "Primary", cssVar: "--primary", fallback: "225 60% 48%", usage: "Primary actions" },
  { name: "Secondary", cssVar: "--secondary", fallback: "220 14% 93%", usage: "Secondary surfaces" },
  { name: "Accent", cssVar: "--accent", fallback: "220 14% 93%", usage: "Subtle accents" },
  { name: "Muted", cssVar: "--muted", fallback: "220 14% 95%", usage: "Muted backgrounds" },
  { name: "Destructive", cssVar: "--destructive", fallback: "0 72% 51%", usage: "Errors & destructive actions" },
  { name: "Success", cssVar: "--chart-success", fallback: "142 71% 45%", usage: "Success / confirmations" },
  { name: "Warning", cssVar: "--chart-warning", fallback: "38 92% 50%", usage: "Warnings & cautions" },
  { name: "Border", cssVar: "--border", fallback: "220 13% 89%", usage: "Default borders" },
  { name: "Ring", cssVar: "--ring", fallback: "225 60% 48%", usage: "Focus rings" },
];

const CHART_COLORS = [
  { name: "Chart 1", cssVar: "--chart-1", fallback: "225 60% 48%" },
  { name: "Chart 2", cssVar: "--chart-2", fallback: "160 60% 40%" },
  { name: "Chart 3", cssVar: "--chart-3", fallback: "30 80% 55%" },
  { name: "Chart 4", cssVar: "--chart-4", fallback: "280 60% 55%" },
  { name: "Chart 5", cssVar: "--chart-5", fallback: "340 60% 55%" },
];

const SHADER_PALETTES = [
  { id: "cosmic" as const, title: "Cosmic", mood: "Deep, electric, mysterious", useFor: "Hero backgrounds, brand moments" },
  { id: "ocean" as const, title: "Ocean", mood: "Calm, fluid, contemplative", useFor: "Editorial, long-form, music" },
  { id: "ember" as const, title: "Ember", mood: "Warm, raw, energetic", useFor: "Announcements, drops, releases" },
  { id: "midnight" as const, title: "Midnight", mood: "Quiet, formal, focused", useFor: "Auth, command panels, settings" },
  { id: "galactic" as const, title: "Galactic", mood: "Wide, expansive, optimistic", useFor: "Storytelling, vision pages" },
  { id: "nebula" as const, title: "Nebula", mood: "Vivid, dramatic, alive", useFor: "Special events, campaigns" },
];

const SHADOW_TOKENS = [
  { token: "shadow-2xs", usage: "Hairline elevation" },
  { token: "shadow-xs", usage: "Subtle lift" },
  { token: "shadow-sm", usage: "Cards & inputs" },
  { token: "shadow-md", usage: "Popovers & menus" },
  { token: "shadow-lg", usage: "Dialogs" },
  { token: "shadow-xl", usage: "Floating panels" },
];

const MOTION_TOKENS = [
  { name: "Fast", durationVar: "--motion-duration-fast", easingVar: "--motion-easing-standard", description: "Hover states, toggles, micro-interactions." },
  { name: "Default", durationVar: "--motion-duration-default", easingVar: "--motion-easing-standard", description: "Most UI transitions, panels, drawers." },
  { name: "Slow", durationVar: "--motion-duration-slow", easingVar: "--motion-easing-emphasized", description: "Page transitions, hero reveals." },
];

const BRAND_NAV = [
  { id: "voice", label: "Voice & mission" },
  { id: "logo", label: "Logo system" },
  { id: "color", label: "Color" },
  { id: "shader", label: "Shader palettes" },
  { id: "type", label: "Typography" },
  { id: "spacing", label: "Spacing & radius" },
  { id: "elevation", label: "Elevation" },
  { id: "motion", label: "Motion" },
  { id: "components", label: "Components" },
  { id: "icons", label: "Iconography" },
  { id: "imagery", label: "Imagery" },
  { id: "downloads", label: "Downloads" },
];

export default function AboutPage() {
  const { user } = useAuth();
  const staffRoles = ["admin", "executive", "staff"];
  const isStaff = user && staffRoles.includes(user.role);

  const { data: brandAssets = [], isLoading: assetsLoading } = useQuery<BrandAsset[]>({
    queryKey: ["/api/brand-assets"],
  });

  const { data: platformSettings, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const grouped = ASSET_TYPE_ORDER.reduce<Record<string, BrandAsset[]>>((acc, type) => {
    const items = brandAssets.filter((a) => a.assetType === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {});

  const hasAssets = brandAssets.length > 0;
  const showBrandSection = hasAssets || isStaff;

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        slug="about"
        title="About SEVCO — Music, Merch, Projects & Community"
        description="SEVCO is a creative platform built for music, commerce, and community. Learn about SEVCO Records, Services, Ventures, and the team behind it all."
        ogUrl="https://sevco.us/about"
      />
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">

        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide">
            <Building2 className="h-3.5 w-3.5" />
            About SEVCO
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none" data-testid="text-about-heading">
            We build things<br />
            <span className="text-muted-foreground">that matter.</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl" data-testid="text-about-intro">
            SEVCO is a creative and technology organisation operating across music, digital products, and services.
            We started as a music label and grew into a platform — bringing together artists, builders, and partners
            under one roof with shared infrastructure and a shared ethos: do good work, move fast, and be real about it.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/projects">
              <Button className="gap-2" data-testid="link-about-ventures">
                Our Ventures
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="gap-2" data-testid="link-about-contact">
                Get in Touch
              </Button>
            </Link>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">What we do</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {PILLARS.map((pillar) => (
              <Link key={pillar.title} href={pillar.href}>
                <div
                  className="group border border-border rounded-2xl p-6 hover:bg-muted/30 transition-colors cursor-pointer space-y-3"
                  data-testid={`card-pillar-${pillar.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <pillar.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{pillar.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{pillar.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    <span>Explore</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Our mission</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed max-w-2xl">
            <p data-testid="text-mission-1">
              SEVCO exists to lower the barrier between creativity and execution. Too many artists don't know how to build a business, and too many builders don't know how to create anything meaningful. We sit at that intersection.
            </p>
            <p data-testid="text-mission-2">
              We back projects we believe in — regardless of whether they fit a standard category. We use the same platform we sell, and we share what we learn openly. The SEVCO Platform started as an internal tool; it's now the product.
            </p>
            <p data-testid="text-mission-3">
              We're based everywhere, in person nowhere specific, and online everywhere that matters.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Connect
          </h2>
          <p className="text-muted-foreground">Find us on social media or reach out directly.</p>
          <div className="flex flex-wrap gap-3">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-social-${link.label.toLowerCase().replace(/\s+|\//g, "-")}`}
              >
                <Button variant="outline" className="gap-2 h-10">
                  <link.icon className="h-4 w-4" />
                  {link.handle}
                </Button>
              </a>
            ))}
          </div>

          <div className="pt-2">
            <Link href="/contact">
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground" data-testid="link-about-contact-page">
                Or visit our Contact page
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {showBrandSection && (
          <section className="space-y-10 lg:max-w-none lg:-mx-12 xl:-mx-32" data-testid="section-brand-assets">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Design system</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">SEVCO Brand Guidelines</h2>
              <p className="text-muted-foreground max-w-2xl leading-relaxed">
                A living reference for everything that makes SEVCO look and feel like SEVCO. Every token below
                is pulled directly from the production design system — what you see here is what ships.
              </p>
            </div>

            <div className="grid lg:grid-cols-[1fr_200px] gap-10 items-start">
              <div className="space-y-12 min-w-0">
                {/* Mobile/inline anchor nav */}
                <nav className="lg:hidden flex flex-wrap gap-1.5" data-testid="nav-brand-mobile">
                  {BRAND_NAV.map((n) => (
                    <a
                      key={n.id}
                      href={`#${n.id}`}
                      className="text-[11px] px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`link-brand-nav-${n.id}`}
                    >
                      {n.label}
                    </a>
                  ))}
                </nav>

                <BrandSection
                  id="voice"
                  eyebrow="01 / Voice"
                  title="Brand voice & mission"
                  intro={
                    (platformSettings?.["brand.voice.intro"]?.trim() ||
                      "SEVCO is direct, confident, and warm. We make ambitious things and we say so plainly.")
                  }
                >
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      {
                        slot: 1,
                        word: platformSettings?.["brand.voice.pillar1.word"]?.trim() || "Direct",
                        copy: platformSettings?.["brand.voice.pillar1.copy"]?.trim() || "Lead with the point. No filler, no jargon, no hedging.",
                      },
                      {
                        slot: 2,
                        word: platformSettings?.["brand.voice.pillar2.word"]?.trim() || "Confident",
                        copy: platformSettings?.["brand.voice.pillar2.copy"]?.trim() || "We back our work. We share what we know without apology.",
                      },
                      {
                        slot: 3,
                        word: platformSettings?.["brand.voice.pillar3.word"]?.trim() || "Warm",
                        copy: platformSettings?.["brand.voice.pillar3.copy"]?.trim() || "Human, not corporate. Readers should feel addressed, not marketed at.",
                      },
                    ].map((v) => (
                      <div key={v.slot} className="rounded-xl border border-border bg-card p-4 space-y-1.5" data-testid={`voice-pillar-${v.slot}`}>
                        <p className="text-sm font-semibold text-foreground">{v.word}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{v.copy}</p>
                      </div>
                    ))}
                  </div>
                </BrandSection>

                <BrandSection
                  id="logo"
                  eyebrow="02 / Logo"
                  title="Logo system"
                  intro="The SEVCO wordmark is the cornerstone of the identity. Use the approved files below and respect clear space."
                >
                  {/* Approved logo variants pulled from brand_assets */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Approved variants</p>
                    {assetsLoading ? (
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-32 rounded-xl" />
                        ))}
                      </div>
                    ) : (grouped.logo && grouped.logo.length > 0) ? (
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {grouped.logo.map((asset) => (
                          <div
                            key={asset.id}
                            className="rounded-xl border border-border bg-card overflow-hidden"
                            data-testid={`logo-variant-${asset.id}`}
                          >
                            <div className="h-24 bg-muted/30 flex items-center justify-center border-b border-border">
                              {(asset.previewUrl || asset.downloadUrl) ? (
                                <img
                                  src={resolveImageUrl(asset.previewUrl || asset.downloadUrl)}
                                  alt={asset.name}
                                  className="max-h-20 max-w-full object-contain p-2"
                                />
                              ) : (
                                <Image className="h-6 w-6 text-muted-foreground opacity-40" />
                              )}
                            </div>
                            <div className="p-3 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold text-foreground leading-tight truncate">{asset.name}</p>
                                {asset.fileFormat && (
                                  <Badge variant="secondary" className="text-[10px] shrink-0">{asset.fileFormat}</Badge>
                                )}
                              </div>
                              {asset.description && (
                                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{asset.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center" data-testid="logo-empty">
                        <Image className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-40" />
                        <p className="text-xs text-muted-foreground">No approved logo variants uploaded yet. Add logos via Command Center → Brand assets.</p>
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-card p-4 space-y-2" data-testid="logo-clear-space">
                      <p className="text-xs font-semibold text-foreground">Clear space</p>
                      <div className="h-20 rounded-md border border-dashed border-border flex items-center justify-center relative">
                        <div className="absolute inset-3 border border-primary/40 rounded-sm" />
                        <p className="text-sm font-black tracking-tight">SEVCO</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Reserve a margin equal to the cap-height around the mark.</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 space-y-2" data-testid="logo-min-size">
                      <p className="text-xs font-semibold text-foreground">Minimum size</p>
                      <div className="h-20 flex items-end justify-around">
                        <p className="text-[10px] font-black tracking-tight">SEVCO</p>
                        <p className="text-base font-black tracking-tight">SEVCO</p>
                        <p className="text-2xl font-black tracking-tight">SEVCO</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Never render the wordmark below 12px on screen.</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 space-y-2" data-testid="logo-contrast">
                      <p className="text-xs font-semibold text-foreground">Contrast</p>
                      <div className="h-20 grid grid-cols-2 gap-1">
                        <div className="bg-foreground rounded-md flex items-center justify-center"><p className="text-sm font-black tracking-tight text-background">SEVCO</p></div>
                        <div className="bg-background border border-border rounded-md flex items-center justify-center"><p className="text-sm font-black tracking-tight text-foreground">SEVCO</p></div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Always meet WCAG AA contrast against the background.</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { dont: "Don't recolor", desc: "Use only approved palette colors." },
                      { dont: "Don't distort", desc: "Never stretch, skew, or rotate the mark." },
                      { dont: "Don't add effects", desc: "No drop shadows, gradients, or outlines." },
                    ].map((d) => (
                      <div key={d.dont} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-1.5" data-testid={`logo-dont-${d.dont.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                        <div className="flex items-center gap-1.5">
                          <X className="h-3.5 w-3.5 text-destructive" />
                          <p className="text-xs font-semibold text-foreground">{d.dont}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{d.desc}</p>
                      </div>
                    ))}
                  </div>
                </BrandSection>

                <BrandSection
                  id="color"
                  eyebrow="03 / Color"
                  title="Color system"
                  intro="Brand colors live in platform settings. Semantic tokens come from CSS variables and adapt to dark mode."
                >
                  <ColorScale title="Brand colors">
                    {BRAND_COLORS.map((c) => (
                      <ColorSwatch key={c.name} name={c.name} settingKey={c.settingKey} fallback={c.fallback} usage={c.usage} platformSettings={platformSettings} />
                    ))}
                  </ColorScale>
                  <ColorScale title="Semantic tokens">
                    {SEMANTIC_COLORS.map((c) => (
                      <ColorSwatch key={c.name} name={c.name} cssVar={c.cssVar} fallback={c.fallback} usage={c.usage} />
                    ))}
                  </ColorScale>
                  <ColorScale title="Chart palette">
                    {CHART_COLORS.map((c) => (
                      <ColorSwatch key={c.name} name={c.name} cssVar={c.cssVar} fallback={c.fallback} />
                    ))}
                  </ColorScale>
                </BrandSection>

                <BrandSection
                  id="shader"
                  eyebrow="04 / Shader"
                  title="Shader palettes"
                  intro="Six animated palette presets used across SEVCO surfaces. Each conveys a different mood."
                >
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SHADER_PALETTES.map((p) => (
                      <ShaderPaletteCard key={p.id} paletteId={p.id} title={p.title} mood={p.mood} useFor={p.useFor} />
                    ))}
                  </div>
                </BrandSection>

                <BrandSection
                  id="type"
                  eyebrow="05 / Type"
                  title="Typography"
                  intro="Three families work together: Inter for UI and product, Source Serif 4 for editorial, JetBrains Mono for code."
                >
                  <div className="grid md:grid-cols-3 gap-3">
                    <TypeSpecimen name="Inter" family="sans" cssVar="--font-sans" fallbackStack="'Inter', sans-serif" usage="Default UI font for product, dashboards, navigation." weights="400 / 500 / 600 / 700 / 900" />
                    <TypeSpecimen name="Source Serif 4" family="serif" cssVar="--font-serif" fallbackStack="'Source Serif 4', Georgia, serif" usage="Editorial, articles, long-form reading." weights="400 / 600 / 700" />
                    <TypeSpecimen name="JetBrains Mono" family="mono" cssVar="--font-mono" fallbackStack="'JetBrains Mono', 'Fira Code', monospace" usage="Code, tokens, terminal output, IDs." weights="400 / 500 / 700" />
                  </div>
                  <TypeScale />
                </BrandSection>

                <BrandSection
                  id="spacing"
                  eyebrow="06 / Spacing"
                  title="Spacing & radius"
                  intro="A 4px base unit drives all spacing. Six radius values cover everything from inputs to hero cards."
                >
                  <SpacingRuler />
                </BrandSection>

                <BrandSection
                  id="elevation"
                  eyebrow="07 / Elevation"
                  title="Elevation"
                  intro="Six shadow tokens move surfaces up the z-axis. Tokens auto-adjust for dark mode."
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {SHADOW_TOKENS.map((s) => (
                      <ShadowCard key={s.token} token={s.token} usage={s.usage} />
                    ))}
                  </div>
                </BrandSection>

                <BrandSection
                  id="motion"
                  eyebrow="08 / Motion"
                  title="Motion"
                  intro="Three speeds, two easings. Use the slowest motion that still feels responsive."
                >
                  <div className="grid md:grid-cols-3 gap-3">
                    {MOTION_TOKENS.map((m) => (
                      <MotionDemo key={m.name} name={m.name} durationVar={m.durationVar} easingVar={m.easingVar} description={m.description} />
                    ))}
                  </div>
                </BrandSection>

                <BrandSection
                  id="components"
                  eyebrow="09 / Components"
                  title="Component patterns"
                  intro="Production shadcn primitives — exactly what ships in the app."
                >
                  <ComponentExample
                    title="Button variants"
                    code={`<Button>Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>`}
                  >
                    <Button data-testid="example-button-default">Primary</Button>
                    <Button variant="secondary" data-testid="example-button-secondary">Secondary</Button>
                    <Button variant="outline" data-testid="example-button-outline">Outline</Button>
                    <Button variant="ghost" data-testid="example-button-ghost">Ghost</Button>
                    <Button variant="destructive" data-testid="example-button-destructive">Destructive</Button>
                  </ComponentExample>

                  <ComponentExample
                    title="Badges"
                    code={`<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>`}
                  >
                    <Badge data-testid="example-badge-default">Default</Badge>
                    <Badge variant="secondary" data-testid="example-badge-secondary">Secondary</Badge>
                    <Badge variant="outline" data-testid="example-badge-outline">Outline</Badge>
                    <Badge variant="destructive" data-testid="example-badge-destructive">Destructive</Badge>
                  </ComponentExample>

                  <ComponentExample
                    title="Card"
                    code={`<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>Body content goes here.</CardContent>
</Card>`}
                  >
                    <Card className="w-full max-w-xs" data-testid="example-card">
                      <CardHeader><CardTitle className="text-base">Card title</CardTitle></CardHeader>
                      <CardContent className="text-sm text-muted-foreground">Body content goes here.</CardContent>
                    </Card>
                  </ComponentExample>

                  <ComponentExample
                    title="Input"
                    code={`<Input placeholder="Search…" />`}
                  >
                    <Input placeholder="Search…" className="max-w-xs" data-testid="example-input" />
                  </ComponentExample>

                  <ComponentExample
                    title="Avatar"
                    code={`<Avatar><AvatarFallback>SV</AvatarFallback></Avatar>`}
                  >
                    <Avatar data-testid="example-avatar-1"><AvatarFallback>SV</AvatarFallback></Avatar>
                    <Avatar className="h-12 w-12" data-testid="example-avatar-2"><AvatarFallback>AB</AvatarFallback></Avatar>
                    <Avatar className="h-16 w-16" data-testid="example-avatar-3"><AvatarFallback className="text-lg">CD</AvatarFallback></Avatar>
                  </ComponentExample>

                  <ComponentExample
                    title="Tooltip"
                    code={`<Tooltip>
  <TooltipTrigger asChild><Button variant="outline">Hover me</Button></TooltipTrigger>
  <TooltipContent>Helpful hint</TooltipContent>
</Tooltip>`}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" data-testid="example-tooltip-trigger">Hover me</Button>
                        </TooltipTrigger>
                        <TooltipContent>Helpful hint</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </ComponentExample>
                </BrandSection>

                <BrandSection
                  id="icons"
                  eyebrow="10 / Icons"
                  title="Iconography"
                  intro="Lucide for UI actions. react-icons/si for brand and company logos. Use the smallest size that reads cleanly."
                >
                  <div className="grid md:grid-cols-2 gap-3">
                    <IconExample name="Search (Lucide)" Icon={Search} importPath={`import { Search } from "lucide-react"`} />
                    <IconExample name="Plus (Lucide)" Icon={Plus} importPath={`import { Plus } from "lucide-react"`} />
                    <IconExample name="Settings (Lucide)" Icon={Settings} importPath={`import { Settings } from "lucide-react"`} />
                    <IconExample name="Trash (Lucide)" Icon={Trash2} importPath={`import { Trash2 } from "lucide-react"`} />
                    <IconExample name="GitHub (Simple Icons)" Icon={SiGithub} importPath={`import { SiGithub } from "react-icons/si"`} />
                    <IconExample name="Discord (Simple Icons)" Icon={SiDiscord} importPath={`import { SiDiscord } from "react-icons/si"`} />
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground space-y-1.5">
                    <p><span className="font-semibold text-foreground">Sizing rules:</span> 16px inline with body text · 20px nav and toolbars · 24px standalone actions · 32px hero or empty-state icons.</p>
                  </div>
                </BrandSection>

                <BrandSection
                  id="imagery"
                  eyebrow="11 / Imagery"
                  title="Imagery"
                  intro="Photography is honest, warm, and uncluttered. Shaders carry brand mood when photography isn't appropriate."
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-card p-4 space-y-2" data-testid="imagery-do">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-[hsl(var(--chart-success))]" />
                        <p className="text-xs font-semibold text-foreground">Do</p>
                      </div>
                      <ul className="text-[11px] text-muted-foreground space-y-1 leading-relaxed list-disc pl-4">
                        <li>Use natural light and authentic subjects.</li>
                        <li>Compose with negative space — let images breathe.</li>
                        <li>Reach for a shader palette when no photo fits.</li>
                      </ul>
                    </div>
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2" data-testid="imagery-dont">
                      <div className="flex items-center gap-1.5">
                        <X className="h-3.5 w-3.5 text-destructive" />
                        <p className="text-xs font-semibold text-foreground">Don't</p>
                      </div>
                      <ul className="text-[11px] text-muted-foreground space-y-1 leading-relaxed list-disc pl-4">
                        <li>Use generic stock photography.</li>
                        <li>Apply heavy filters that misrepresent reality.</li>
                        <li>Crowd a frame with text overlays.</li>
                      </ul>
                    </div>
                  </div>
                </BrandSection>

                <BrandSection
                  id="downloads"
                  eyebrow="12 / Assets"
                  title="Downloadable assets"
                  intro="Official files for press, partners, and approved usage."
                >
                  {assetsLoading ? (
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="border border-border rounded-xl p-4 motion-safe:animate-pulse space-y-3">
                          <div className="h-24 bg-muted rounded-lg" />
                          <div className="h-3 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : !hasAssets ? (
                    <div className="text-center py-12 border border-border rounded-2xl bg-muted/20" data-testid="text-brand-assets-empty">
                      <Package className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground">Brand assets coming soon</p>
                      <p className="text-xs text-muted-foreground mt-1">Official downloadable brand materials will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {ASSET_TYPE_ORDER.filter((t) => grouped[t]).map((type) => (
                        <div key={type} className="space-y-3">
                          <h4 className="text-sm font-semibold text-foreground">{ASSET_TYPE_LABELS[type]}</h4>
                          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {grouped[type].map((asset) => (
                              <div
                                key={asset.id}
                                className="border border-border rounded-xl overflow-hidden group bg-card"
                                data-testid={`card-brand-asset-${asset.id}`}
                              >
                                <div className="h-28 bg-muted/30 flex items-center justify-center border-b border-border">
                                  {(asset.previewUrl || (asset.assetType === "logo" && asset.downloadUrl)) ? (
                                    <img
                                      src={resolveImageUrl(asset.previewUrl || asset.downloadUrl)}
                                      alt={asset.name}
                                      className="max-h-24 max-w-full object-contain p-2"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center opacity-40">
                                      {assetTypeIcon(asset.assetType)}
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-semibold text-foreground leading-tight">{asset.name}</p>
                                    {asset.fileFormat && (
                                      <Badge variant="secondary" className="text-[10px] shrink-0" data-testid={`badge-format-${asset.id}`}>
                                        {asset.fileFormat}
                                      </Badge>
                                    )}
                                  </div>
                                  {asset.description && (
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">{asset.description}</p>
                                  )}
                                  <a
                                    href={resolveImageUrl(asset.downloadUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid={`link-download-asset-${asset.id}`}
                                  >
                                    <Button size="sm" variant="outline" className="w-full gap-1.5 h-7 text-xs mt-1">
                                      <Download className="h-3 w-3" />
                                      Download
                                    </Button>
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </BrandSection>
              </div>

              {/* Sticky desktop nav */}
              <aside className="hidden lg:block sticky top-24" data-testid="nav-brand-desktop">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">On this page</p>
                <nav className="space-y-1 border-l border-border">
                  {BRAND_NAV.map((n) => (
                    <a
                      key={n.id}
                      href={`#${n.id}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary border-l-2 border-transparent pl-3 -ml-px py-1.5 transition-colors"
                      data-testid={`link-brand-nav-desktop-${n.id}`}
                    >
                      <ChevronRight className="h-3 w-3 opacity-50" />
                      {n.label}
                    </a>
                  ))}
                </nav>
              </aside>
            </div>
          </section>
        )}

        <section className="border-t border-border pt-10 space-y-4">
          <h2 className="text-lg font-bold">Quick links</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/wiki/privacy-policy"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-about-privacy">Privacy Policy</span></Link>
            <Link href="/wiki/terms-of-service"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-about-terms">Terms of Service</span></Link>
            <Link href="/wiki/refund-policy"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-about-refund">Refund Policy</span></Link>
            <Link href="/changelog"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-about-changelog">Changelog</span></Link>
            <Link href="/jobs"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-about-jobs">Careers</span></Link>
          </div>
        </section>

      </div>
    </div>
  );
}
