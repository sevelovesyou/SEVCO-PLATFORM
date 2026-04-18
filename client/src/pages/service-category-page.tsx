import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageHead } from "@/components/page-head";
import {
  ArrowRight, ArrowLeft, Code2, Sparkles, Megaphone,
  HeadphonesIcon, Server, Shield, CheckCircle, Users, Zap,
  Target, Layers, Globe, Lock, TrendingUp, BookOpen, Palette,
  ChevronRight, Star, Building2, Music, ShoppingBag, Briefcase,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Service } from "@shared/schema";
import { SERVICE_CATEGORY_MAP } from "@/lib/service-categories";

const ICON_MAP: Record<string, React.ElementType> = {
  Code2, Sparkles, Megaphone, HeadphonesIcon, Server, Shield,
  CheckCircle, Users, Zap, Target, Layers, Globe, Lock,
  TrendingUp, BookOpen, Palette, ArrowRight, Star, Building2,
  Music, ShoppingBag,
};

export type CategorySlug = "creative" | "technology" | "marketing" | "teams" | "infrastructure" | "security";

interface ValueProp {
  icon: string;
  title: string;
  body: string;
}

interface UseCase {
  label: string;
  description: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface CategoryPageConfig {
  dbCategory: string;
  headline: string;
  subheadline: string;
  keywords: string;
  seoDescription: string;
  valueProps: ValueProp[];
  useCases: UseCase[];
  faqs: FAQ[];
}

const CATEGORY_PAGE_CONFIG: Record<CategorySlug, CategoryPageConfig> = {
  creative: {
    dbCategory: "Creative",
    headline: "Design That Makes People Feel Something",
    subheadline: "Brand identity, UI/UX, and creative direction built for creators, studios, and companies that refuse to blend in.",
    keywords: "brand identity design agency, UI UX design services, creative direction, logo design, visual identity",
    seoDescription: "SEVCO Creative services — brand identity, UI/UX design, and creative direction for creators, studios, and companies that refuse to blend in.",
    valueProps: [
      {
        icon: "Palette",
        title: "Brand Systems, Not Just Logos",
        body: "We build complete visual identities — typography, color systems, motion, and brand guidelines — that scale across every touchpoint.",
      },
      {
        icon: "Layers",
        title: "Design That Converts",
        body: "Our UI/UX work is rooted in user research and interaction principles. Beautiful and functional are not mutually exclusive.",
      },
      {
        icon: "Sparkles",
        title: "Creative Direction with Intent",
        body: "We bring strategic thinking to every project — art direction, campaign concepts, and visual storytelling that carries a point of view.",
      },
    ],
    useCases: [
      { label: "Independent Artists & Creators", description: "You need a brand that reflects your work and connects with your audience — not something that looks like everyone else." },
      { label: "Startups & Emerging Companies", description: "You're building something new and need a visual identity that communicates credibility from day one." },
      { label: "Agencies & Studios", description: "You need a design partner for overflow capacity, rebrand projects, or campaign work that requires deep creative collaboration." },
    ],
    faqs: [
      {
        question: "What's included in brand identity?",
        answer: "A full brand identity engagement covers logo design and variants, color system, typography selection, brand guidelines document, and application mockups. We scope each project to what you actually need.",
      },
      {
        question: "How long does a UI/UX project take?",
        answer: "Smaller UI/UX engagements (landing page, feature flow) typically run 2–4 weeks. Full product design projects range from 4–12 weeks depending on scope. We provide a clear timeline after an initial scoping call.",
      },
      {
        question: "Do you work with indie artists?",
        answer: "Yes — we work with independent artists, musicians, and creators regularly. We offer flexible scoping to match different budget levels without compromising quality.",
      },
      {
        question: "Can I see your portfolio?",
        answer: "Reach out via the contact form and we'll share relevant case studies. Much of our work is under NDA, so we share selectively based on your project type.",
      },
    ],
  },

  technology: {
    dbCategory: "Technology",
    headline: "Engineering That Ships and Scales",
    subheadline: "Platform development, API integrations, and technical consulting for products that need to move fast without breaking things.",
    keywords: "platform development services, API integration, technical consulting, software engineering, web app development",
    seoDescription: "SEVCO Technology services — platform development, API integrations, and technical consulting for products that need to move fast without breaking things.",
    valueProps: [
      {
        icon: "Zap",
        title: "Velocity Without Shortcuts",
        body: "We build with maintainability in mind. Fast shipping matters — but not at the cost of technical debt that slows you down six months later.",
      },
      {
        icon: "Layers",
        title: "Full-Stack Depth",
        body: "From database schema to frontend component architecture, our engineers work across the full stack with TypeScript, React, Node, and modern cloud infrastructure.",
      },
      {
        icon: "Globe",
        title: "API-First Thinking",
        body: "We design systems that integrate cleanly with third-party services and expose well-documented APIs — building for a connected ecosystem, not an island.",
      },
    ],
    useCases: [
      { label: "Early-Stage Startups", description: "You have an idea and need an engineering partner who can move fast, make smart architectural decisions, and ship a real product." },
      { label: "Companies Scaling Up", description: "Your product is growing and you need senior engineers who can refactor, optimize, and build new features without slowing down." },
      { label: "Non-Technical Founders", description: "You need a trusted technical partner who can translate your vision into a working product and help you navigate key technology decisions." },
    ],
    faqs: [
      {
        question: "What tech stack do you use?",
        answer: "Our default stack is TypeScript, React, Node.js/Express, and PostgreSQL — modern, well-supported, and scalable. We're also comfortable working in Python, Go, and other stacks depending on your existing codebase.",
      },
      {
        question: "Do you take over existing codebases?",
        answer: "Yes. We do codebase audits and can take on maintenance, refactoring, or new feature development on existing projects. We ask for access to the repo and a technical walkthrough before scoping the work.",
      },
      {
        question: "What's the difference between consulting and development?",
        answer: "Consulting means we review your architecture, make recommendations, and guide your team — but implementation stays with you. Development means we write the code. Many clients start with consulting and move to development.",
      },
      {
        question: "How do you handle IP and code ownership?",
        answer: "All code we write for your project belongs to you. We sign a standard work-for-hire agreement and can accommodate your company's specific IP terms on request.",
      },
    ],
  },

  marketing: {
    dbCategory: "Marketing",
    headline: "Growth Built on Content, Not Luck",
    subheadline: "Content strategy, social media management, and growth consulting that turns an audience into a community — and a community into revenue.",
    keywords: "content strategy agency, social media management, growth consulting, digital marketing services, audience growth",
    seoDescription: "SEVCO Marketing services — content strategy, social media management, and growth consulting that turns an audience into a community and a community into revenue.",
    valueProps: [
      {
        icon: "BookOpen",
        title: "Strategy Before Tactics",
        body: "We build your content framework first — positioning, audience, content pillars, and channel strategy — so every post has a reason to exist.",
      },
      {
        icon: "TrendingUp",
        title: "Growth That Compounds",
        body: "We focus on content that builds long-term organic reach and community, not vanity metrics that disappear when you stop paying for them.",
      },
      {
        icon: "Target",
        title: "Audience-First Approach",
        body: "We research your audience before we write a word. Every content decision is grounded in what your audience actually cares about.",
      },
    ],
    useCases: [
      { label: "Creators & Independent Brands", description: "You have an audience and want to grow it intentionally — with a content strategy that reflects your voice and builds toward a business." },
      { label: "Startups Launching Products", description: "You're going to market and need content and social infrastructure in place to build awareness and drive early adoption." },
      { label: "Established Brands Reinventing", description: "Your existing marketing is stale or underperforming and you need a fresh strategy, not just more posts." },
    ],
    faqs: [
      {
        question: "What channels do you focus on?",
        answer: "We work across written content (blog, newsletters), social media (X/Twitter, Instagram, LinkedIn, TikTok), and short-form video. Channel strategy is always audience-first — we recommend where your audience already lives.",
      },
      {
        question: "Do you create content or just strategy?",
        answer: "Both. Strategy-only engagements are available for teams who have internal writers but need a framework. Full-service engagements include content creation, scheduling, and community management.",
      },
      {
        question: "How do you measure success?",
        answer: "We define success metrics at the start of each engagement — reach, engagement rate, follower growth, newsletter subscribers, or conversions depending on your goals. We report monthly.",
      },
      {
        question: "What's a minimum engagement look like?",
        answer: "Our minimum engagement is typically a strategy sprint: a 2–3 week project that delivers a positioning document, content pillars, and a 90-day content calendar. From there, we can scope ongoing support.",
      },
    ],
  },

  teams: {
    dbCategory: "Support",
    headline: "Dedicated Support for Teams That Can't Afford Downtime",
    subheadline: "Onboarding programs, dedicated support tiers, and team augmentation for organizations that need a reliable partner in their corner.",
    keywords: "dedicated support services, team augmentation, staff augmentation, onboarding program, business support services",
    seoDescription: "SEVCO Teams services — dedicated support tiers, onboarding programs, and team augmentation for organizations that need a reliable partner.",
    valueProps: [
      {
        icon: "Users",
        title: "Embedded, Not Outsourced",
        body: "Our team augmentation model means you get people who operate as part of your team — not a help desk ticket queue. We learn your systems and your people.",
      },
      {
        icon: "CheckCircle",
        title: "SLA-Backed Reliability",
        body: "Dedicated support tiers come with defined response times and escalation paths. We put our commitments in writing so you know what to expect.",
      },
      {
        icon: "Zap",
        title: "Onboarding That Sticks",
        body: "We build onboarding programs that new team members and customers actually complete — structured, documented, and measurable from day one.",
      },
    ],
    useCases: [
      { label: "Growing Teams", description: "You're scaling faster than your HR process can keep up with and need support infrastructure — onboarding, documentation, and internal tooling — to match your growth." },
      { label: "Product Companies", description: "Your product has customers who need real support — and you want a partner who understands your product well enough to represent it properly." },
      { label: "Agencies & Service Businesses", description: "You have peak periods that exceed your team's capacity and need reliable augmentation without the overhead of full-time hires." },
    ],
    faqs: [
      {
        question: "What does a dedicated support tier include?",
        answer: "Dedicated support tiers include a named point of contact, defined response time SLAs, monthly check-ins, issue tracking, and escalation protocols. Specific inclusions are scoped per engagement.",
      },
      {
        question: "Do you offer SLAs?",
        answer: "Yes. SLA terms are defined in our service agreement and vary by tier — ranging from next-business-day response to 4-hour critical response windows. We match SLAs to your actual operational needs.",
      },
      {
        question: "Can you embed with our team?",
        answer: "Yes. Embedded team augmentation means our people work in your communication channels (Slack, etc.), attend your standups if needed, and operate as part of your org — not as an external vendor.",
      },
      {
        question: "What's the onboarding process?",
        answer: "We start with a discovery call to understand your team structure, existing documentation, and the gaps you need to fill. From there we scope an engagement — typically starting with a 2-week onboarding audit and documentation sprint.",
      },
    ],
  },

  infrastructure: {
    dbCategory: "Infrastructure",
    headline: "Infrastructure You Actually Control",
    subheadline: "Hosting, domain management, and cloud infrastructure built for developers and businesses that want performance without the complexity.",
    keywords: "web hosting services, domain management, cloud infrastructure, VPS hosting, managed hosting",
    seoDescription: "SEVCO Infrastructure services — hosting, domain management, and cloud infrastructure for developers and businesses that want performance without the complexity.",
    valueProps: [
      {
        icon: "Server",
        title: "Hosting That Performs",
        body: "From managed VPS to distributed deployments, we configure and maintain hosting environments optimized for your specific workload — not one-size-fits-all shared plans.",
      },
      {
        icon: "Globe",
        title: "Domain & DNS Expertise",
        body: "We handle domain registration, transfer, DNS configuration, and email routing. Complex multi-domain setups, subdomain structures, and DMARC/SPF configs are all in scope.",
      },
      {
        icon: "Lock",
        title: "Managed & Monitored",
        body: "We don't just set it up and disappear. Managed infrastructure includes monitoring, alerts, backups, and regular maintenance so you're not surprised by downtime.",
      },
    ],
    useCases: [
      { label: "Developers & Technical Teams", description: "You want control over your infrastructure without spending engineering time managing servers. We handle the ops so you can focus on product." },
      { label: "Growing Businesses", description: "Your traffic and data are growing and your current hosting is starting to show the strain. We architect and migrate you to infrastructure that scales." },
      { label: "Agencies Managing Client Sites", description: "You manage multiple client sites and need a reliable, organized hosting setup — with proper isolation, backups, and monitoring per client." },
    ],
    faqs: [
      {
        question: "What hosting plans are available?",
        answer: "We offer managed VPS, shared hosting setups, and custom cloud deployments on AWS, DigitalOcean, Hetzner, and others. Plans are scoped to your needs — reach out and we'll recommend what fits.",
      },
      {
        question: "Do you manage DNS and domains?",
        answer: "Yes. We handle domain registration, transfer to your registrar of choice, DNS record management, subdomain configuration, and SSL certificate provisioning and renewal.",
      },
      {
        question: "What's your uptime SLA?",
        answer: "Managed hosting agreements include a 99.9% uptime SLA with defined incident response times. Downtime credits apply per our service agreement terms.",
      },
      {
        question: "Can I migrate an existing site?",
        answer: "Yes. We handle migrations from shared hosts, other VPS providers, and platform services. We do a pre-migration audit, execute with zero-downtime where possible, and verify everything post-move.",
      },
    ],
  },

  security: {
    dbCategory: "Security",
    headline: "Security Built for Modern Products",
    subheadline: "Security audits, compliance consulting, and protection services for products and businesses that take trust seriously.",
    keywords: "security audit services, compliance consulting, SOC 2, GDPR compliance, application security, penetration testing",
    seoDescription: "SEVCO Security services — security audits, compliance consulting, and protection services for products and businesses that take trust seriously.",
    valueProps: [
      {
        icon: "Shield",
        title: "Audit-Driven Assurance",
        body: "Our security audits go beyond automated scans — we do manual code review, threat modeling, and dependency analysis to surface real vulnerabilities before attackers do.",
      },
      {
        icon: "CheckCircle",
        title: "Compliance Without the Headache",
        body: "SOC 2, GDPR, HIPAA — we guide you through what actually matters for your specific product and help you build the controls and documentation needed to pass.",
      },
      {
        icon: "Lock",
        title: "Ongoing Protection",
        body: "Security isn't a one-time event. We offer ongoing monitoring, quarterly reviews, and rapid response to emerging vulnerabilities — keeping your posture current.",
      },
    ],
    useCases: [
      { label: "SaaS Products Handling Sensitive Data", description: "You store customer data and need confidence that your application is hardened against common attack vectors before you scale." },
      { label: "Companies Pursuing Compliance", description: "You're going through SOC 2, ISO 27001, or GDPR and need a partner who knows the technical controls required — not just the paperwork." },
      { label: "Organizations After an Incident", description: "Something happened. You need an independent review of what went wrong, what data was affected, and what needs to change to prevent recurrence." },
    ],
    faqs: [
      {
        question: "What does a security audit cover?",
        answer: "Our standard audit covers application-layer security (OWASP Top 10), authentication and session management, dependency vulnerability scanning, secrets management review, and infrastructure configuration review. Scope can be expanded to include penetration testing.",
      },
      {
        question: "Do you help with compliance (SOC 2, GDPR)?",
        answer: "Yes. We help you understand which controls apply to your product, build the documentation and processes required, and prepare for auditor reviews. We're a consulting partner, not a certifying body — but we know what auditors look for.",
      },
      {
        question: "How long does an audit take?",
        answer: "A standard application security audit takes 1–3 weeks depending on codebase size and scope. Compliance consulting engagements are longer — typically 6–12 weeks to get audit-ready from scratch.",
      },
      {
        question: "What happens after the audit?",
        answer: "You receive a detailed findings report with severity ratings and remediation guidance. We offer a follow-up engagement to verify fixes and re-test critical findings. Nothing goes unresolved without a clear owner.",
      },
    ],
  },
};

function getLucideIcon(name: string | null | undefined): React.ElementType {
  if (!name) return Briefcase;
  const Icon = (LucideIcons as Record<string, unknown>)[name] as React.ElementType | undefined;
  return Icon || Briefcase;
}

const DEFAULT_SOCIAL_PROOF_ITEMS = [
  "Enterprise Teams", "Startups", "Indie Creators", "Agencies", "Open-Source Projects",
];

function SocialProofStrip({ platformSettings }: { platformSettings?: Record<string, string> }) {
  let items = DEFAULT_SOCIAL_PROOF_ITEMS;
  if (platformSettings?.["services.socialProof.items"]) {
    try {
      const parsed = JSON.parse(platformSettings["services.socialProof.items"]);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((v: unknown) => typeof v === "string")) items = parsed;
    } catch {}
  }
  return (
    <div className="py-6 border-y border-border/40" data-testid="section-social-proof">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {platformSettings?.["services.socialProof.heading"] || "Trusted by teams and creators"}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {items.map((item: string) => (
            <span
              key={item}
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground opacity-60"
              data-testid={`social-proof-badge-${item.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ServiceCategoryPage() {
  const [location] = useLocation();
  const slug = location.split("/").filter(Boolean).pop() ?? "";
  const pageCfg = CATEGORY_PAGE_CONFIG[slug as CategorySlug];
  const meta = SERVICE_CATEGORY_MAP[slug];
  const config = pageCfg && meta ? { ...meta, ...pageCfg, slug: slug as CategorySlug } : null;

  const { data: allServices, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: platformSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Category not found</h1>
          <Link href="/services">
            <Button variant="outline">Back to Services</Button>
          </Link>
        </div>
      </div>
    );
  }

  const Icon = config.icon;
  const services = (allServices ?? []).filter((s) => s.category === config.dbCategory);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "name": `SEVCO ${config.label} Services`,
        "description": config.seoDescription,
        "provider": {
          "@type": "Organization",
          "name": "SEVCO",
          "url": "https://sevco.us",
        },
        "url": `https://sevco.us/services/${config.slug}`,
        "serviceType": config.label,
        "areaServed": "Worldwide",
      },
      ...(services.length > 0
        ? [{
            "@type": "ItemList",
            "name": `${config.label} Services`,
            "itemListElement": services.map((s, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "name": s.name,
              "url": `https://sevco.us/services/${s.slug}`,
              "description": s.tagline ?? undefined,
            })),
          }]
        : []),
      {
        "@type": "FAQPage",
        "mainEntity": config.faqs.map((faq) => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background" data-page={`services-${config.slug}`}>
      <PageHead
        slug={`services-${config.slug}`}
        title={`${config.label} Services — ${config.tagline} | SEVCO`}
        description={config.seoDescription}
        keywords={config.keywords}
        ogUrl={`https://sevco.us/services/${config.slug}`}
        jsonLd={jsonLd}
      />

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16">

        {/* Hero */}
        <div className={`rounded-2xl p-8 md:p-12 mb-10 ${config.accentBg} border ${config.accentBorder}`} data-testid="section-hero">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 ${config.accentBg} border ${config.accentBorder}`}>
            <Icon className={`h-7 w-7 ${config.accentText}`} />
          </div>
          <Badge variant="outline" className={`mb-4 text-xs ${config.accentText} border-current`}>
            {config.label} Services
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            {config.headline}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-8">
            {config.subheadline}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact">
              <Button size="lg" className="font-semibold gap-2" data-testid="button-hero-cta-primary">
                Work With Us
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/services">
              <Button variant="outline" size="lg" className="font-semibold gap-2" data-testid="button-hero-cta-secondary">
                See All Services
              </Button>
            </Link>
          </div>
        </div>

        {/* Social Proof */}
        <SocialProofStrip platformSettings={platformSettings} />

        {/* Services Grid */}
        <div className="mt-12 mb-12" data-testid="section-services-grid">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">What We Offer</p>
          <h2 className="text-2xl font-bold mb-6">{config.label} Services</h2>
          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border rounded-xl p-5 space-y-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className={`rounded-2xl border ${config.accentBorder} ${config.accentBg} p-10 text-center`} data-testid="services-coming-soon">
              <Icon className={`h-10 w-10 mx-auto mb-4 ${config.accentText} opacity-60`} />
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                We're building out our {config.label.toLowerCase()} service offerings. In the meantime, get in touch and let's talk about what you need.
              </p>
              <Link href="/contact">
                <Button data-testid="button-coming-soon-enquire">Enquire Now</Button>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {services.map((service) => {
                const SvcIcon = getLucideIcon(service.iconName);
                const href = service.linkUrl || `/services/${service.slug}`;
                const isExternal = service.linkUrl?.startsWith("http");
                const cardContent = (
                  <div
                    data-testid={`card-service-${service.id}`}
                    className={`group border rounded-xl p-5 hover:border-foreground/20 hover:shadow-sm transition-all cursor-pointer bg-background h-full`}
                  >
                    <div className={`mb-3 ${config.accentText}`}>
                      <SvcIcon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-foreground transition-colors">
                      {service.name}
                    </h3>
                    {service.tagline && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{service.tagline}</p>
                    )}
                    <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${config.accentText} opacity-0 group-hover:opacity-100 transition-opacity`}>
                      Learn more <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                );
                return isExternal ? (
                  <a href={href} key={service.id} target="_blank" rel="noopener noreferrer">
                    {cardContent}
                  </a>
                ) : (
                  <Link href={href} key={service.id}>
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Why SEVCO for [Category] */}
        <div className="mb-12" data-testid="section-value-props">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Why SEVCO</p>
          <h2 className="text-2xl font-bold mb-6">Why SEVCO for {config.label}</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {config.valueProps.map((vp, i) => {
              const VpIcon = ICON_MAP[vp.icon] ?? CheckCircle;
              return (
                <div
                  key={i}
                  className="border rounded-xl p-6 bg-background"
                  data-testid={`card-value-prop-${i}`}
                >
                  <div className={`mb-4 ${config.accentText}`}>
                    <VpIcon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{vp.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{vp.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-12" data-testid="section-use-cases">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Who This Is For</p>
          <h2 className="text-2xl font-bold mb-6">Use Cases</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {config.useCases.map((uc, i) => (
              <div
                key={i}
                className={`rounded-xl border ${config.accentBorder} ${config.accentBg} p-6`}
                data-testid={`card-use-case-${i}`}
              >
                <h3 className={`font-semibold text-sm mb-2 ${config.accentText}`}>{uc.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-12" data-testid="section-faq">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">FAQ</p>
          <h2 className="text-2xl font-bold mb-6">Common Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {config.faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border rounded-xl px-4"
                data-testid={`accordion-faq-${i}`}
              >
                <AccordionTrigger className="text-sm font-semibold py-4 text-left hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA Banner */}
        <div className="rounded-2xl border p-8 md:p-10 bg-muted/30 text-center" data-testid="section-cta-banner">
          <h2 className="text-2xl font-bold mb-3">
            Ready to get started with {config.label} services?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Reach out and let's talk about what SEVCO can do for you.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/contact">
              <Button size="lg" className="font-semibold gap-2" data-testid="button-cta-contact">
                Contact Us
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/services">
              <Button variant="outline" size="lg" className="gap-2 font-semibold" data-testid="button-cta-all-services">
                <ArrowLeft className="h-4 w-4" />
                Back to All Services
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
