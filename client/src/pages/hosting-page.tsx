import { Link } from "wouter";
import { PageHead } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Server,
  Cpu,
  Package,
  ShieldCheck,
  Zap,
  Clock,
  Headphones,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

const services = [
  {
    icon: Globe,
    name: "Website Hosting",
    description:
      "Fast, reliable hosting for any website — static sites, WordPress, Node.js, and more. Powered by NVMe SSD storage and global CDN.",
    price: "From $3/mo",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Server,
    name: "Minecraft & Game Servers",
    description:
      "Lag-free game server hosting with one-click setup, automatic backups, and DDoS protection. Supports Minecraft, Rust, Valheim, and more.",
    price: "From $5/mo",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Cpu,
    name: "VPS",
    description:
      "Full root-access virtual private servers with dedicated resources. Scale your workload from hobby project to enterprise — on demand.",
    price: "From $6/mo",
    color: "text-blue-600",
    bg: "bg-blue-600/10",
  },
  {
    icon: Package,
    name: "Custom Hosting",
    description:
      "Databases, APIs, custom apps — if you can build it, we can host it. Tailored environments for your unique stack.",
    price: "From $10/mo",
    color: "text-red-600",
    bg: "bg-red-700/10",
  },
];

const features = [
  { icon: Zap, label: "Instant Provisioning", desc: "Servers online in seconds" },
  { icon: ShieldCheck, label: "DDoS Protection", desc: "Enterprise-grade security" },
  { icon: Clock, label: "99.9% Uptime SLA", desc: "Always-on reliability" },
  { icon: Headphones, label: "24/7 Support", desc: "Real humans, fast responses" },
];

export default function HostingPage() {
  const scrollToServices = () => {
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col min-h-full">
      <PageHead
        slug="hosting"
        title="SEVCO Hosting — Website, Game & VPS Hosting"
        description="SEVCO Hosting offers lightning-fast website hosting, Minecraft & game server hosting, VPS, and custom app hosting — all in one place."
        ogUrl="https://sevco.us/hosting"
      />
      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-4 py-28 sm:py-36 overflow-hidden bg-[#0a0a12]"
        data-testid="section-hero"
      >
        {/* Animated gradient blobs */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute -top-24 -left-32 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-24 -right-32 w-[500px] h-[500px] rounded-full bg-blue-700/20 blur-[120px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-indigo-600/10 blur-[100px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-6">
            SEVCO Hosting
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Lightning-Fast Hosting for{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500 bg-clip-text text-transparent">
              Websites, Minecraft Servers &amp; Everything In Between
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/60 max-w-2xl mx-auto">
            One platform. All your hosting needs — websites, game servers, VPS, and custom environments.
            Built for speed, reliability, and simplicity.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 h-11 text-sm rounded-lg"
                data-testid="button-hero-get-started"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="lg"
              className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 px-8 h-11 text-sm rounded-lg"
              onClick={scrollToServices}
              data-testid="button-hero-learn-more"
            >
              Learn More
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Feature pills */}
      <section
        className="bg-[#0f0f1a] border-y border-white/5 px-4 py-5"
        data-testid="section-feature-pills"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-3"
              data-testid={`feature-pill-${f.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/15">
                <f.icon className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{f.label}</p>
                <p className="text-[11px] text-white/50">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services grid */}
      <section
        id="services"
        className="bg-[#0a0a12] px-4 py-20"
        data-testid="section-services"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Everything You Need to Host</h2>
            <p className="mt-3 text-sm text-white/50 max-w-xl mx-auto">
              Whether you're launching a personal site or running a gaming community, SEVCO Hosting has a plan for you.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-6 hover:bg-white/[0.06] transition-colors group"
                data-testid={`card-service-${svc.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${svc.bg} mb-4`}>
                  <svc.icon className={`h-5 w-5 ${svc.color}`} />
                </div>
                <h3 className="text-base font-semibold text-white">{svc.name}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{svc.description}</p>
                <div className="mt-4 inline-flex items-center rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                  {svc.price}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why SEVCO Hosting */}
      <section
        className="bg-[#0d0d18] border-t border-white/5 px-4 py-20"
        data-testid="section-why"
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Why SEVCO Hosting?</h2>
          <p className="mt-5 text-sm sm:text-base text-white/55 leading-relaxed">
            At SEVCO, reliability and competitive pricing aren't afterthoughts — they're the foundation. We run our
            infrastructure on enterprise-grade hardware so your sites and servers stay fast and online, even under heavy
            load. Every plan includes DDoS mitigation, automated backups, and a 99.9% uptime SLA with no small print.
          </p>
          <p className="mt-4 text-sm sm:text-base text-white/55 leading-relaxed">
            SEVCO Hosting is part of the broader SEVCO ecosystem. Pair your hosting with a domain registered through
            SEVCO Domains and join our Discord community for real-time help, announcements, and exclusive early-access
            offers. One brand, everything you need.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/domains">
              <Button
                variant="outline"
                size="sm"
                className="border-white/15 text-white/70 hover:text-white hover:bg-white/10 text-xs"
                data-testid="button-why-domains"
              >
                <Globe className="mr-1.5 h-3.5 w-3.5" />
                Register a Domain
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="bg-gradient-to-br from-blue-900/40 via-[#0a0a12] to-blue-900/40 border-t border-white/5 px-4 py-24 text-center"
        data-testid="section-cta"
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ready to launch?</h2>
          <p className="mt-4 text-sm sm:text-base text-white/55">
            Get your site or server live in minutes. No lock-in, transparent pricing.
          </p>
          <div className="mt-8">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-10 h-12 text-sm rounded-xl"
                data-testid="button-cta-contact"
              >
                Contact Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
