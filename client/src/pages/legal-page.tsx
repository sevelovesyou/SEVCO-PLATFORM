import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageHead } from "@/components/page-head";
import {
  FileText,
  Scale,
  Shield,
  Lock,
  Users,
  BookOpen,
  Mail,
  ExternalLink,
  Handshake,
} from "lucide-react";
import sealImage from "@assets/SEVCO_App_Icon_-_Artboard_35_(2)_1775364380486.png";

const PRACTICE_AREAS = [
  {
    icon: FileText,
    title: "Contracts & Agreements",
    description:
      "Drafting, reviewing, and enforcing all commercial, creator, and vendor agreements that govern SEVCO's relationships across the platform.",
  },
  {
    icon: Scale,
    title: "Intellectual Property & Copyright",
    description:
      "Protecting SEVCO's trademarks, creative works, and proprietary technology while helping creators understand their rights and responsibilities.",
  },
  {
    icon: Shield,
    title: "Compliance & Regulation",
    description:
      "Ensuring the platform operates within applicable laws and regulations, from consumer protection to digital media standards.",
  },
  {
    icon: Lock,
    title: "Privacy & Data Protection",
    description:
      "Upholding user privacy rights and maintaining compliance with data protection frameworks including GDPR, CCPA, and similar regulations. We record anonymous page views (path, referring site, coarse country, device class) using a daily-rotating salted hash. We do not store IP addresses, do not set cookies for analytics, and do not share this data with third parties. Honors Do-Not-Track; opt out anytime by setting localStorage 'sevco-analytics-opt-out' to '1'.",
  },
  {
    icon: Users,
    title: "Employment & Creator Relations",
    description:
      "Handling matters related to staff, independent contractors, and creator agreements — supporting fair, transparent relationships at every level.",
  },
];

const DEFAULT_LEGAL_DOCUMENTS = [
  { label: "Terms of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Creator Agreement", href: "#" },
  { label: "Cookie Policy", href: "#" },
  { label: "Acceptable Use Policy", href: "#" },
  { label: "DMCA / Copyright Policy", href: "#" },
];

export default function LegalPage() {
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  let legalDocuments = DEFAULT_LEGAL_DOCUMENTS;
  if (settings?.["legal.documents"]) {
    try {
      const parsed = JSON.parse(settings["legal.documents"]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        legalDocuments = parsed;
      }
    } catch {}
  }

  return (
    <>
      <PageHead
        title="Legal Department | SEVCO"
        description="The SEVCO Legal Department — protecting the platform, creators, and partners through rigorous legal practice and principled advocacy."
      />

      <div
        className="min-h-screen text-white"
        style={{ backgroundColor: "#07070f" }}
        data-testid="page-legal"
      >
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center px-4 pt-24 pb-20 text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,255,255,0.07) 0%, transparent 70%)",
              }}
            />
          </div>

          <div className="relative mb-8" data-testid="img-legal-seal-wrapper">
            <div
              className="rounded-full"
              style={{
                boxShadow:
                  "0 0 60px 20px rgba(255,255,255,0.12), 0 0 120px 40px rgba(255,255,255,0.05)",
                display: "inline-block",
              }}
            >
              <img
                src={sealImage}
                alt="SEVCO Legal Department Seal"
                data-testid="img-legal-seal"
                className="rounded-full object-contain"
                style={{
                  width: 220,
                  height: 220,
                  mixBlendMode: "lighten",
                  display: "block",
                }}
              />
            </div>
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-widest uppercase font-serif mb-3"
            data-testid="text-legal-heading"
          >
            SEVCO Legal Department
          </h1>
          <p
            className="text-lg sm:text-xl tracking-widest uppercase text-white/50 mb-8"
            style={{ letterSpacing: "0.25em" }}
            data-testid="text-legal-tagline"
          >
            Veritas Vincit — Truth Conquers
          </p>

          <p
            className="max-w-2xl text-base sm:text-lg text-white/70 leading-relaxed"
            data-testid="text-legal-mission"
          >
            The SEVCO Legal Department exists to protect the platform, its creators, and
            its partners. We uphold the integrity of every agreement, defend intellectual
            property, and ensure that SEVCO operates with transparency, accountability, and
            full compliance in all that we do.
          </p>
        </section>

        {/* Divider */}
        <div className="w-full h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

        {/* Areas of Practice */}
        <section className="max-w-6xl mx-auto px-4 py-20" data-testid="section-practice-areas">
          <h2 className="text-xs tracking-[0.3em] uppercase text-white/40 mb-2 text-center">
            Areas of Practice
          </h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-12 tracking-tight">
            What We Cover
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRACTICE_AREAS.map((area) => (
              <div
                key={area.title}
                className="rounded-xl border p-6 flex flex-col gap-3 transition-colors hover:border-white/20"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
                data-testid={`card-practice-${area.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(220,38,38,0.12)", color: "#dc2626" }}
                >
                  <area.icon className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-white text-base">{area.title}</h4>
                <p className="text-sm text-white/55 leading-relaxed">{area.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="w-full h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

        {/* Legal Documents */}
        <section className="max-w-6xl mx-auto px-4 py-20" data-testid="section-legal-documents">
          <h2 className="text-xs tracking-[0.3em] uppercase text-white/40 mb-2 text-center">
            Documentation
          </h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-12 tracking-tight">
            Legal Documents
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {legalDocuments.map((doc) => (
              <a
                key={doc.label}
                href={doc.href}
                className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-white/70 hover:text-white hover:border-white/20 transition-colors group"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
                data-testid={`link-legal-doc-${doc.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              >
                <BookOpen className="h-4 w-4 shrink-0 text-white/30 group-hover:text-white/60 transition-colors" />
                <span className="flex-1">{doc.label}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
              </a>
            ))}
          </div>
          <p className="text-center text-xs text-white/30 mt-6">
            Document links will be updated as policies are published. Contact Legal for the most current versions.
          </p>
        </section>

        {/* Divider */}
        <div className="w-full h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

        {/* Contact */}
        <section className="max-w-2xl mx-auto px-4 py-20 text-center" data-testid="section-contact-legal">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(220,38,38,0.12)", color: "#dc2626" }}
          >
            <Handshake className="h-6 w-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight">Contact Legal</h2>
          <p className="text-white/60 leading-relaxed mb-8">
            For legal inquiries, contract matters, intellectual property concerns, or compliance
            questions, reach out to the SEVCO Legal team directly. All communications are treated
            with strict confidentiality.
          </p>
          <a
            href="mailto:legal@sevco.us"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors text-white"
            style={{ background: "#dc2626" }}
            data-testid="link-contact-legal-email"
          >
            <Mail className="h-4 w-4" />
            legal@sevco.us
          </a>
        </section>
      </div>
    </>
  );
}
