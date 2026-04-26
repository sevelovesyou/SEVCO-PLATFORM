import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  Globe,
  Music,
  Layers,
  Zap,
  Users,
  Palette,
  MapPin,
  ExternalLink,
  Lightbulb,
  Eye,
  Heart,
  Mail,
} from "lucide-react";
import { PageHead } from "@/components/page-head";
import { SiInstagram, SiX, SiYoutube, SiDiscord, SiGithub } from "react-icons/si";
import sevePortrait from "@assets/IMG_0590_1776372154559.jpg";
import { Button } from "@/components/ui/button";

const SOCIAL_LINKS = [
  { icon: SiX,         label: "X / Twitter",  href: "https://x.com/sevelovesu",          handle: "@sevelovesu" },
  { icon: SiInstagram, label: "Instagram",     href: "https://instagram.com/sevelovesyou", handle: "@sevelovesyou" },
  { icon: SiDiscord,   label: "Discord",       href: "https://discord.gg/sevco",           handle: "SEVCO Discord" },
  { icon: SiYoutube,   label: "YouTube",       href: "https://youtube.com/@sevco",         handle: "SEVCO" },
  { icon: SiGithub,    label: "GitHub",        href: "https://github.com/sevco",           handle: "sevco" },
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
    title: "SEVCO Projects",
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

const VALUES = [
  {
    icon: Lightbulb,
    title: "Inspiration",
    description: "Build things that inspire. Every product, release, and feature starts with the question: does this make someone's life better or more interesting?",
  },
  {
    icon: Eye,
    title: "Transparency",
    description: "We ship in public, share what we learn, and use the same tools we sell.",
  },
  {
    icon: Heart,
    title: "Community",
    description: "The best ideas come from the community. SEVCO is a platform for creators, not a gate between them.",
  },
];

const SPECIFIC_PROJECTS = [
  { label: "SPHERE", href: "/projects" },
  { label: "SEVCO Architecture", href: "/projects" },
  { label: "Freeball", href: "/projects" },
  { label: "Minecraft Community", href: "/projects" },
];

const FAQS: { question: string; answer: string }[] = [
  {
    question: "What is SEVCO?",
    answer:
      "SEVCO is a creative technology organization operating across music, digital products, and services. It was founded in Kalispell, Montana by Severin Fredrik Gislason (Seve) and operates the SEVCO Platform, SEVCO Records, and a portfolio of projects including SPHERE, SEVCO Architecture, and Freeball.",
  },
  {
    question: "Who founded SEVCO?",
    answer:
      "SEVCO was founded by Severin Fredrik Gislason, also known as Seve. He is a musician and entrepreneur based in Kalispell, Montana, and serves as the organization's founder and creative director.",
  },
  {
    question: "What is the SEVCO Platform?",
    answer:
      "The SEVCO Platform is the operational backbone of the organization — a wiki, tools system, community features, and internal infrastructure that powers everything from project management to the Sparks community currency.",
  },
  {
    question: "What is SEVCO Records?",
    answer:
      "SEVCO Records is an independent music label operating under the SEVCO umbrella. It discovers, signs, and promotes emerging artists, handling everything from submission through release and distribution.",
  },
  {
    question: "Where is SEVCO based?",
    answer:
      "SEVCO was founded in Kalispell, Montana. The organization operates primarily online and is active across digital platforms globally.",
  },
  {
    question: "How do I contact SEVCO?",
    answer:
      "You can reach SEVCO by email at seve@sevco.us, through the contact page at sevco.us/contact, or on social media @sevelovesu on X (formerly Twitter).",
  },
];

const ABOUT_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://sevco.us/#organization",
      name: "SEVCO",
      alternateName: ["SEVCO Platform", "The Inspiration Company"],
      url: "https://sevco.us",
      logo: "https://sevco.us/favicon.jpg",
      description:
        "SEVCO is a creative technology organization building at the intersection of music, digital platforms, and visionary projects. Founded in Montana by Severin Fredrik Gislason.",
      sameAs: [
        "https://x.com/sevelovesu",
        "https://instagram.com/sevelovesyou",
        "https://github.com/sevco",
        "https://youtube.com/@sevco",
        "https://discord.gg/sevco",
      ],
      founder: { "@id": "https://sevco.us/#founder" },
      foundingLocation: {
        "@type": "Place",
        name: "Kalispell, Montana, USA",
      },
    },
    {
      "@type": "Person",
      "@id": "https://sevco.us/#founder",
      name: "Severin Fredrik Gislason",
      alternateName: ["Seve", "Seve Gislason"],
      jobTitle: "Founder",
      worksFor: { "@id": "https://sevco.us/#organization" },
      url: "https://severingislason.com",
      sameAs: ["https://severingislason.com", "https://x.com/sevelovesu"],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    },
  ],
};

const DEFAULTS = {
  heroH1: "SEVCO | The Inspiration Company",
  heroSubtitle: "Founded by Severin Fredrik Gislason (Seve)",
  heroIntro: "SEVCO is a creative technology organization building at the intersection of music, digital platforms, projects, and visionary ideas. Founded in Montana by entrepreneur and musician Severin Fredrik Gislason, SEVCO incubates bold ideas that inspire and empower creators.",
  overviewTagline: "Building the future, one project at a time.",
  overviewP1: "SEVCO started with music. SEVCO Records is an independent label that finds and backs artists who have something real to say — managing everything from submission through release, distribution, and promotion. The label sits at the heart of what SEVCO is: a belief that creative work deserves serious infrastructure.",
  overviewP2: "From there, SEVCO expanded into digital products and platforms. SPHERE, SEVCO Architecture, Freeball, and a Minecraft community are just a few of the projects incubated under the SEVCO umbrella — each one an experiment in what happens when bold ideas get proper engineering and design attention.",
  overviewP3: "SEVCO Services brings that same capability to partners: engineering, design, marketing, domain infrastructure, and consulting. The team builds for clients the same way they build for themselves — with high craft and a long-term mindset. And Sparks, SEVCO's in-platform currency, keeps the community engaged, rewarding participation and connecting users to products and experiences.",
  overviewP4: "Together these pillars form a single creative technology organization — one that moves fluidly between being a label, a studio, a consultancy, and a community platform.",
  founderName: "Severin Fredrik Gislason (Seve)",
  founderLocation: "Kalispell, Montana",
  founderSiteUrl: "https://severingislason.com",
  founderSiteLabel: "severingislason.com",
  founderSiteDesc: "Personal site of Seve — music, writing, and more.",
  founderP1: "Severin Fredrik Gislason — known as Seve — began his journey as a musician, spending years developing his craft and understanding the landscape that artists navigate. That experience on the creative side revealed a gap: brilliant artists were underserved by the infrastructure around them, and builders rarely understood what artists actually needed.",
  founderP2: "From Kalispell, Montana, Seve built SEVCO as his answer to that gap. What started as a music label became something larger: a full creative technology organization where music, software, services, and community could coexist under one roof. Every product SEVCO ships is, in some sense, an extension of his vision — that inspiration should be the starting point for everything.",
  founderP3: "As Founder, Musician, and Visionary, Seve continues to drive SEVCO's direction — from the platforms and tools built in-house to the artists signed to the label. His background in both music and entrepreneurship gives SEVCO its distinctive character: creative enough to take real risks, structured enough to deliver on them.",
  founderP4: "SEVCO's creations are extensions of Seve's own creative process — built not just to serve a market, but to express a way of thinking about what technology and culture can achieve together.",
  connectEmail: "seve@sevco.us",
};

function renderHeroH1(value: string) {
  // Render text containing a single "|" with the second half styled as muted
  const idx = value.indexOf("|");
  if (idx === -1) return value;
  const left = value.slice(0, idx).trim();
  const right = value.slice(idx + 1).trim();
  return (
    <>
      {left} |{" "}
      <span className="text-muted-foreground">{right}</span>
    </>
  );
}

export default function AboutPage() {
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
    staleTime: 5 * 60 * 1000,
  });

  const s = (key: string, fallback: string) => settings[key] || fallback;

  const heroH1 = s("about.hero.h1", DEFAULTS.heroH1);
  const heroSubtitle = s("about.hero.subtitle", DEFAULTS.heroSubtitle);
  const heroIntro = s("about.hero.intro", DEFAULTS.heroIntro);
  const overviewTagline = s("about.overview.tagline", DEFAULTS.overviewTagline);
  const overviewP1 = s("about.overview.p1", DEFAULTS.overviewP1);
  const overviewP2 = s("about.overview.p2", DEFAULTS.overviewP2);
  const overviewP3 = s("about.overview.p3", DEFAULTS.overviewP3);
  const overviewP4 = s("about.overview.p4", DEFAULTS.overviewP4);
  const founderName = s("about.founder.name", DEFAULTS.founderName);
  const founderLocation = s("about.founder.location", DEFAULTS.founderLocation);
  const founderSiteUrl = s("about.founder.siteUrl", DEFAULTS.founderSiteUrl);
  const founderSiteLabel = s("about.founder.siteLabel", DEFAULTS.founderSiteLabel);
  const founderSiteDesc = s("about.founder.siteDesc", DEFAULTS.founderSiteDesc);
  const founderP1 = s("about.founder.p1", DEFAULTS.founderP1);
  const founderP2 = s("about.founder.p2", DEFAULTS.founderP2);
  const founderP3 = s("about.founder.p3", DEFAULTS.founderP3);
  const founderP4 = s("about.founder.p4", DEFAULTS.founderP4);
  const connectEmail = s("about.connect.email", DEFAULTS.connectEmail);

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        slug="about"
        title="About SEVCO — The Inspiration Company"
        description="SEVCO is a creative technology organization building at the intersection of music, digital platforms, projects, and visionary ideas. Founded in Montana by Severin Fredrik Gislason."
        ogUrl="https://sevco.us/about"
        keywords="SEVCO, Severin Fredrik Gislason, Seve Gislason, SEVCO Records, SEVCO Platform, The Inspiration Company, Kalispell Montana, music tech startup, creative technology organization"
        jsonLd={ABOUT_JSON_LD}
      />

      {/* Section 1 — Hero */}
      <section
        className="relative overflow-hidden border-b border-border bg-gradient-to-br from-background via-background to-muted/20"
        data-testid="section-about-hero"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] left-[-80px] h-[400px] w-[400px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-[-60px] right-[-60px] h-[300px] w-[300px] rounded-full bg-primary/6 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28 space-y-6">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide"
            data-testid="badge-hero-label"
          >
            <Building2 className="h-3.5 w-3.5" />
            The Inspiration Company
          </div>
          <h1
            className="text-5xl md:text-6xl font-black tracking-tight leading-none"
            data-testid="text-about-heading"
          >
            {renderHeroH1(heroH1)}
          </h1>
          <p className="text-base text-muted-foreground font-medium" data-testid="text-about-founder-line">
            {heroSubtitle}
          </p>
          <p
            className="text-lg text-muted-foreground leading-relaxed max-w-2xl"
            data-testid="text-about-intro"
          >
            {heroIntro}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/projects">
              <Button className="gap-2" data-testid="link-hero-projects">
                Our Projects
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="gap-2" data-testid="link-hero-contact">
                Get in Touch
              </Button>
            </Link>
            <Link href="/wiki">
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground" data-testid="link-hero-wiki">
                View the Wiki
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-20">

        {/* Section 2 — Company Overview / Mission */}
        <section className="space-y-8" data-testid="section-about-overview">
          <h2 className="text-3xl font-bold tracking-tight">What is SEVCO?</h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed max-w-3xl">
            <p data-testid="text-overview-1">{overviewP1}</p>
            <p data-testid="text-overview-2">{overviewP2}</p>
            <p data-testid="text-overview-3">{overviewP3}</p>
            <p data-testid="text-overview-4">{overviewP4}</p>
          </div>
          <blockquote
            className="border-l-4 border-primary pl-6 py-2 text-xl md:text-2xl font-semibold text-foreground italic"
            data-testid="text-about-tagline"
          >
            "{overviewTagline}"
          </blockquote>
        </section>

        {/* Section 3 — Founder Story */}
        <section className="space-y-8" data-testid="section-about-founder">
          <h2 className="text-3xl font-bold tracking-tight">
            Our Founder — {founderName}
          </h2>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div className="md:col-span-2 space-y-5 text-muted-foreground leading-relaxed">
              <p data-testid="text-founder-1">{founderP1}</p>
              <p data-testid="text-founder-2">{founderP2}</p>
              <p data-testid="text-founder-3">{founderP3}</p>
              <p data-testid="text-founder-4">{founderP4}</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-center md:justify-start" data-testid="img-founder-portrait-wrapper">
                <img
                  src={sevePortrait}
                  alt={`${founderName} — Founder of SEVCO`}
                  data-testid="img-founder-portrait"
                  className="w-48 h-48 rounded-full object-cover object-top border-2 border-border shadow-md"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <a
                href={founderSiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-founder-site"
                className="block group border border-border rounded-2xl p-5 hover:bg-muted/30 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {founderSiteLabel}
                  </p>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground">{founderSiteDesc}</p>
              </a>
              <div
                className="border border-border rounded-2xl p-5 space-y-2"
                data-testid="card-founder-location"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  {founderLocation}
                </div>
                <p className="text-xs text-muted-foreground">SEVCO's founding home, in the heart of the Northwest.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 — Key Projects & Areas */}
        <section className="space-y-8" data-testid="section-about-projects">
          <h2 className="text-3xl font-bold tracking-tight">What we build</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {PILLARS.map((pillar) => (
              <Link key={pillar.title} href={pillar.href}>
                <div
                  className="group border border-border rounded-2xl p-6 hover:bg-muted/30 transition-colors cursor-pointer space-y-3"
                  data-testid={`card-pillar-${pillar.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
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
          <div className="flex flex-wrap gap-2 pt-2" data-testid="row-specific-projects">
            {SPECIFIC_PROJECTS.map((p) => (
              <Link key={p.label} href={p.href}>
                <span
                  className="inline-flex items-center px-4 py-1.5 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
                  data-testid={`pill-project-${p.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {p.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 5 — Values & Community */}
        <section className="space-y-8" data-testid="section-about-values">
          <h2 className="text-3xl font-bold tracking-tight">Our Values</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="border border-border rounded-2xl p-6 space-y-3"
                data-testid={`card-value-${v.title.toLowerCase()}`}
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
          <div className="pt-2">
            <a
              href="https://discord.gg/sevco"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-values-discord"
            >
              <Button variant="outline" className="gap-2">
                <SiDiscord className="h-4 w-4" />
                Join the Community on Discord
              </Button>
            </a>
          </div>
        </section>

        {/* Section 6 — Connect & Verify */}
        <section className="space-y-6" data-testid="section-about-connect">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-muted-foreground" />
              Find us everywhere
            </h2>
            <p className="text-muted-foreground">
              Official profiles, verified sources, and ways to reach the team.
            </p>
          </div>
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
          <div className="flex flex-wrap gap-3">
            <a
              href={founderSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-connect-founder-site"
            >
              <Button variant="outline" className="gap-2 h-10">
                <ExternalLink className="h-4 w-4" />
                {founderSiteLabel}
              </Button>
            </a>
            <a
              href={`mailto:${connectEmail}`}
              data-testid="link-connect-email"
            >
              <Button variant="outline" className="gap-2 h-10">
                <Mail className="h-4 w-4" />
                {connectEmail}
              </Button>
            </a>
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

        {/* Section 7 — Brand Guidelines teaser */}
        <section
          className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-muted/30 p-8 md:p-10"
          data-testid="section-brand-teaser"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wide">
                <Palette className="h-3 w-3" />
                Design system
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">SEVCO Brand Guidelines</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
                Logos, color, typography, motion, components, and official downloadable assets. Built for partners,
                press, and contributors who need a direct reference to the SEVCO visual identity.
              </p>
              <div className="pt-2">
                <Link href="/brand">
                  <Button className="gap-2" data-testid="link-about-brand">
                    View Brand Guidelines
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden md:flex shrink-0 h-28 w-28 rounded-2xl bg-gradient-to-br from-primary/80 to-primary/30 items-center justify-center shadow-lg">
              <Palette className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
        </section>

        {/* Section 8 — Frequently Asked Questions (GEO) */}
        <section className="space-y-6" data-testid="section-about-faq">
          <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <dl className="divide-y divide-border border border-border rounded-2xl overflow-hidden">
            {FAQS.map((faq, i) => (
              <div
                key={faq.question}
                className="p-6 space-y-2"
                data-testid={`faq-item-${i}`}
              >
                <dt
                  className="text-base md:text-lg font-bold text-foreground"
                  data-testid={`faq-question-${i}`}
                >
                  {faq.question}
                </dt>
                <dd
                  className="text-sm md:text-base text-muted-foreground leading-relaxed"
                  data-testid={`faq-answer-${i}`}
                >
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Section 9 — Quick links footer */}
        <section className="border-t border-border pt-10 space-y-4" data-testid="section-about-quicklinks">
          <h2 className="text-lg font-bold">Quick links</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/brand"><span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-about-brand-quick">Brand Guidelines</span></Link>
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
