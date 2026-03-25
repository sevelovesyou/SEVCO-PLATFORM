import { Link } from "wouter";
import { ArrowRight, Building2, Globe, Music, Layers, Zap, Users } from "lucide-react";
import { SiInstagram, SiX, SiYoutube, SiDiscord, SiGithub } from "react-icons/si";
import { Button } from "@/components/ui/button";

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

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
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
