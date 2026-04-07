import { Link } from "wouter";
import { PageHead } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  Database,
  Eye,
  Key,
  ArrowRight,
  ChevronDown,
  Globe,
  Users,
  CreditCard,
  Bot,
  Music,
  ShoppingCart,
  Briefcase,
  FileText,
  Link2,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Search,
  Headphones,
  Layers,
  Cpu,
} from "lucide-react";

const stats = [
  { label: "230+ Security Rules", icon: Search },
  { label: "99.999% Uptime", icon: Activity },
  { label: "Zero Breaches", icon: ShieldCheck },
  { label: "24/7 Monitoring", icon: Eye },
];

const coreSecurity = [
  {
    icon: Key,
    title: "Enterprise Auth & RBAC",
    description:
      "Multi-tier role-based access control with fine-grained permissions across all platform features. Admin, executive, staff, partner, client, and member tiers — each scoped precisely. Session tokens, secure password hashing, and email verification baked in.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Database,
    title: "Supabase Postgres Fortress",
    description:
      "Your data lives in an isolated, encrypted Supabase Postgres instance with row-level security, automated daily backups, and point-in-time recovery. No shared tenancy. No data leakage. Every query goes through an authenticated API layer.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Search,
    title: "Automated Audit Intelligence",
    description:
      "Powered by squirrelscan with 230+ security rules, we run continuous automated audits across every deployed property — checking for broken links, meta issues, performance regressions, and security misconfigurations before they reach users.",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
  },
  {
    icon: Eye,
    title: "Continuous Secret Scanning",
    description:
      "All environment variables, API keys, and credentials are managed through hardened secret stores — never committed to source control. We run automated secret-scanning checks on every deploy to detect and block accidental exposure.",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
];

const protectedAssets = [
  { icon: Globe, label: "Websites & Web Apps" },
  { icon: Users, label: "User Data & PII" },
  { icon: CreditCard, label: "Financial Records" },
  { icon: Bot, label: "AI Agents & Workflows" },
  { icon: Music, label: "Music Catalog" },
  { icon: ShoppingCart, label: "E-Commerce Orders" },
  { icon: Briefcase, label: "Job Applications" },
  { icon: FileText, label: "Private Notes" },
  { icon: Link2, label: "API Integrations" },
];

const compliance = [
  {
    icon: ShieldCheck,
    title: "SOC 2 Type II Readiness",
    description:
      "Our security practices, access controls, and audit trails are structured to align with SOC 2 Type II requirements — covering security, availability, and confidentiality trust service criteria.",
  },
  {
    icon: Layers,
    title: "ISO 27001 Readiness",
    description:
      "Information security management policies, risk assessments, and incident response procedures are maintained in alignment with ISO 27001 best practices — systematically reducing organizational risk.",
  },
  {
    icon: CheckCircle2,
    title: "GDPR Alignment",
    description:
      "Data minimization, consent management, right-to-erasure workflows, and data processing agreements are all in place — keeping user data rights at the center of how we operate.",
  },
];

const services = [
  {
    icon: Search,
    title: "Free & Paid Security Audits",
    description:
      "We scan your web properties with our 230+ rule audit engine and deliver a structured, prioritized report — broken links, SEO vulnerabilities, missing headers, and more. Free tier available, detailed reports for paid clients.",
    price: "Free — or from $49",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: AlertTriangle,
    title: "Penetration Testing & Red Teaming",
    description:
      "SEVCO engineers simulate real-world attack scenarios against your apps, APIs, and infrastructure. We identify exploitable weaknesses before adversaries do — and provide a full remediation playbook.",
    price: "Custom pricing",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Activity,
    title: "24/7 Monitoring & Incident Response",
    description:
      "Round-the-clock uptime monitoring, anomaly detection, and a dedicated incident response team. When something goes wrong, we're already on it — with structured runbooks and rapid escalation paths.",
    price: "From $99/mo",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
  },
  {
    icon: Headphones,
    title: "Security-as-a-Service",
    description:
      "Embedded security expertise on retainer — regular audits, architectural reviews, compliance advisory, and direct access to SEVCO's security team. The CTO-level security partner you can't yet hire full-time.",
    price: "From $299/mo",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
];

const differentiators = [
  {
    icon: Lock,
    title: "Security is Native",
    description:
      "We didn't bolt security onto an existing product — we designed the entire SEVCO platform around it. Every feature, every API endpoint, every data flow was built with defense-in-depth as the default posture.",
  },
  {
    icon: Cpu,
    title: "AI in a Hardened Environment",
    description:
      "Our AI agents and automation pipelines run inside isolated, permission-scoped environments. No agent has broader access than it needs — and every action is logged and auditable.",
  },
  {
    icon: ShieldCheck,
    title: "One Platform, One Standard",
    description:
      "Whether you're a startup or a scaling enterprise, you get the same hardened security baseline. No tiers that compromise on fundamentals — the floor is high across every SEVCO product.",
  },
];

export default function SecurityPage() {
  const scrollToServices = () => {
    document.getElementById("security-services")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col min-h-full">
      <PageHead
        slug="security"
        title="SEVCO Security — Enterprise Cybersecurity & Security-as-a-Service"
        description="SEVCO's security-first platform delivers enterprise auth, automated audits, 24/7 monitoring, penetration testing, and Security-as-a-Service for modern businesses."
        ogUrl="https://sevco.us/security"
      />

      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-4 py-28 sm:py-36 overflow-hidden bg-[#020d0a]"
        data-testid="section-hero"
      >
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -left-32 w-[600px] h-[600px] rounded-full bg-emerald-600/20 blur-[120px] motion-safe:animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-24 -right-32 w-[500px] h-[500px] rounded-full bg-cyan-700/20 blur-[120px] motion-safe:animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-teal-600/10 blur-[100px] motion-safe:animate-[pulse_12s_ease-in-out_infinite_4s]" />
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
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-6">
            <ShieldCheck className="h-3.5 w-3.5" />
            SEVCO Security
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Security is Our{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Foundation, Not a Feature
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/60 max-w-2xl mx-auto">
            Every layer of SEVCO is designed with defense-in-depth from day one. Enterprise-grade protection
            for your data, your users, and your business — backed by a team that lives and breathes security.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 h-11 text-sm rounded-lg"
                data-testid="button-hero-get-audit"
              >
                Get an Audit
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

      {/* Trust-signal stat bar */}
      <section
        className="bg-[#041009] border-y border-white/5 px-4 py-5"
        data-testid="section-stat-bar"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="flex items-center gap-3"
              data-testid={`stat-pill-${s.label.toLowerCase().replace(/[\s+%]/g, "-")}`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600/15 motion-safe:animate-[pulse_3s_ease-in-out_infinite]">
                <s.icon className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-white">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Platform Security */}
      <section
        className="bg-[#020d0a] px-4 py-20"
        data-testid="section-core-security"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Core Platform Security</h2>
            <p className="mt-3 text-sm text-white/50 max-w-xl mx-auto">
              The hardened foundation that every SEVCO product is built on — no configuration required.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {coreSecurity.map((item) => (
              <div
                key={item.title}
                className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-6 hover:bg-white/[0.06] transition-colors"
                data-testid={`card-core-${item.title.toLowerCase().replace(/[\s&]/g, "-")}`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${item.bg} mb-4`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Protect */}
      <section
        className="bg-[#041009] border-t border-white/5 px-4 py-20"
        data-testid="section-what-we-protect"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">What We Protect</h2>
            <p className="mt-3 text-sm text-white/50 max-w-xl mx-auto">
              From personal data to financial records, every asset on the SEVCO platform is guarded with the same rigor.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
            {protectedAssets.map((asset) => (
              <div
                key={asset.label}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition-colors"
                data-testid={`asset-${asset.label.toLowerCase().replace(/[\s&]/g, "-")}`}
              >
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                  <asset.icon className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-white/80">{asset.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance & Trust */}
      <section
        className="bg-[#020d0a] border-t border-white/5 px-4 py-20"
        data-testid="section-compliance"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Compliance & Trust</h2>
            <p className="mt-3 text-sm text-white/50 max-w-xl mx-auto">
              We build to internationally recognized frameworks so your stakeholders can trust what we've built.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {compliance.map((badge) => (
              <div
                key={badge.title}
                className="flex flex-col items-center text-center rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-7 hover:bg-emerald-500/10 transition-colors"
                data-testid={`badge-compliance-${badge.title.toLowerCase().replace(/[\s&]/g, "-")}`}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-4">
                  <badge.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{badge.title}</h3>
                <p className="text-xs text-white/55 leading-relaxed">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cybersecurity Services */}
      <section
        id="security-services"
        className="bg-[#041009] border-t border-white/5 px-4 py-20"
        data-testid="section-services"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Cybersecurity Services</h2>
            <p className="mt-3 text-sm text-white/50 max-w-xl mx-auto">
              Extend our internal security posture to your business — on demand, on retainer, or on-call.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {services.map((svc) => (
              <div
                key={svc.title}
                className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-6 hover:bg-white/[0.06] transition-colors"
                data-testid={`card-service-${svc.title.toLowerCase().replace(/[\s&]/g, "-")}`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${svc.bg} mb-4`}>
                  <svc.icon className={`h-5 w-5 ${svc.color}`} />
                </div>
                <h3 className="text-base font-semibold text-white">{svc.title}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{svc.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                    {svc.price}
                  </div>
                  <Link href="/contact">
                    <button
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
                      data-testid={`button-service-cta-${svc.title.toLowerCase().replace(/[\s&]/g, "-")}`}
                    >
                      Get started <ArrowRight className="h-3 w-3" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why SEVCO */}
      <section
        className="bg-[#020d0a] border-t border-white/5 px-4 py-20"
        data-testid="section-why-sevco"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Why SEVCO?</h2>
            <p className="mt-3 text-sm text-white/50 max-w-xl mx-auto">
              Security isn't a checkbox for us — it's the philosophy behind every decision we make.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {differentiators.map((d) => (
              <div
                key={d.title}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 hover:bg-white/[0.06] transition-colors"
                data-testid={`card-differentiator-${d.title.toLowerCase().replace(/[\s,]/g, "-")}`}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 mb-4">
                  <d.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold text-white">{d.title}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="bg-gradient-to-br from-emerald-900/40 via-[#020d0a] to-cyan-900/30 border-t border-white/5 px-4 py-24 text-center"
        data-testid="section-cta"
      >
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 mb-6">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to harden your stack?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-white/55">
            Get a free security audit from the SEVCO team. No commitment required — just a clear picture of where you stand.
          </p>
          <div className="mt-8">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 h-12 text-sm rounded-xl"
                data-testid="button-cta-free-audit"
              >
                Get a Free Audit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
