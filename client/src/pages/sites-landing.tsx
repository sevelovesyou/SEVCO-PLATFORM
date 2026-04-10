import { Link } from "wouter";
import { Globe, Layers, Paintbrush, Shield, Link2, Zap, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const gridBg = {
  backgroundImage: `
    linear-gradient(rgba(59,130,246,.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59,130,246,.08) 1px, transparent 1px)
  `,
  backgroundSize: "48px 48px",
};

const features = [
  {
    icon: Globe,
    title: "Your domain, instantly",
    description: "Get yourbrand.sev.cx the moment you publish. No setup, no DNS headaches.",
    accent: "#3b82f6",
  },
  {
    icon: Layers,
    title: "Drag-and-drop blocks",
    description: "Hero sections, galleries, contact forms, embeds. Your page, your way.",
    accent: "#8b5cf6",
  },
  {
    icon: Paintbrush,
    title: "Theme in seconds",
    description: "Colors, fonts, feel. One panel, endless combinations.",
    accent: "#06b6d4",
  },
  {
    icon: Shield,
    title: "Built-in security",
    description: "Every site gets CSP headers, XSS protection, and HTTPS by default.",
    accent: "#10b981",
  },
  {
    icon: Link2,
    title: "Custom domains soon",
    description: "Bring your own domain — CNAME support is coming.",
    accent: "#f59e0b",
  },
  {
    icon: Zap,
    title: "Free forever",
    description: "Your first site on sev.cx is always free.",
    accent: "#3b82f6",
  },
];

const steps = [
  {
    num: "01",
    title: "Sign in",
    description: "Create your SEVCO account — free in 30 seconds.",
  },
  {
    num: "02",
    title: "Choose your address",
    description: "Pick your slug.sev.cx domain.",
  },
  {
    num: "03",
    title: "Build your page",
    description: "Drag blocks, customize theme, write content.",
  },
  {
    num: "04",
    title: "Publish",
    description: "One click to go live on your sev.cx address.",
  },
];

export default function SitesLandingPage() {
  return (
    <div className="min-h-screen text-[#f5f5f5]" style={{ backgroundColor: "#080808", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes typewriter {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .hero-headline {
          animation: fade-in-up 0.7s ease forwards;
        }
        .hero-domain {
          animation: typewriter 1s ease 0.4s both;
        }
        .hero-sub {
          animation: fade-in-up 0.7s ease 0.6s both;
          opacity: 0;
        }
        .hero-buttons {
          animation: fade-in-up 0.7s ease 0.8s both;
          opacity: 0;
        }
        .cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: #3b82f6;
          margin-left: 2px;
          vertical-align: middle;
          animation: cursor-blink 1s ease infinite;
        }
        .feature-card {
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .feature-card:hover {
          transform: translateY(-2px);
        }
        .gradient-border-card {
          background: linear-gradient(#111, #111) padding-box,
                      linear-gradient(135deg, #3b82f6, #8b5cf6) border-box;
          border: 1px solid transparent;
        }
        .headline-gradient {
          background: linear-gradient(135deg, #f5f5f5 0%, #a5b4fc 50%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Navbar */}
      <nav
        className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] sticky top-0 z-50"
        style={{ backgroundColor: "rgba(8,8,8,0.85)", backdropFilter: "blur(16px)" }}
      >
        <Link href="/" data-testid="link-nav-logo">
          <span className="text-sm font-bold tracking-widest uppercase text-[#f5f5f5]/70 hover:text-[#f5f5f5] transition-colors">
            SEVCO
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/auth" data-testid="link-nav-signin">
            <Button variant="ghost" size="sm" className="text-[#6b7280] hover:text-[#f5f5f5] text-xs">
              Sign in
            </Button>
          </Link>
          <Link href="/auth" data-testid="link-nav-start">
            <Button size="sm" className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold px-4" data-testid="button-nav-cta">
              Start free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 py-32 md:py-44 overflow-hidden"
        style={gridBg}
      >
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="hero-headline">
            <span
              className="inline-block text-xs font-semibold tracking-[0.25em] uppercase text-[#3b82f6] mb-6 px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
              data-testid="badge-hero-label"
            >
              Introducing SEVCO Sites
            </span>
            <h1
              className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4 headline-gradient"
              data-testid="heading-hero-title"
            >
              Build your world.
            </h1>
            <h2
              className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-8"
              style={{ color: "#f5f5f5" }}
              data-testid="heading-hero-subtitle"
            >
              Ship it in minutes.
            </h2>
          </div>

          <div className="hero-domain mb-3">
            <p
              className="font-mono text-xl md:text-2xl text-[#6b7280]"
              data-testid="text-hero-domain"
            >
              Live at{" "}
              <span className="text-[#f5f5f5] font-semibold">
                yourbrand
              </span>
              <span className="text-[#3b82f6] font-bold">.sev.cx</span>
              <span className="cursor" />
            </p>
          </div>

          <div className="hero-sub">
            <p className="text-[#6b7280] text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed" data-testid="text-hero-description">
              No servers. No DNS nightmares. Just your brand, your content, and a domain you own the moment you hit publish.
            </p>
          </div>

          <div className="hero-buttons flex flex-col sm:flex-row gap-3 justify-center" data-testid="group-hero-buttons">
            <Link href="/auth" data-testid="link-hero-start">
              <Button
                size="lg"
                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold px-8 py-3 text-base rounded-lg w-full sm:w-auto transition-all duration-200"
                data-testid="button-hero-start"
              >
                Start building free
              </Button>
            </Link>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center justify-center border border-white/10 text-[#f5f5f5] hover:bg-white/5 px-8 py-3 text-base rounded-lg w-full sm:w-auto transition-colors duration-200"
              data-testid="button-hero-examples"
            >
              See examples <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 inset-x-0 h-24 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #080808)" }}
        />
      </section>

      {/* Feature grid */}
      <section id="features" className="px-6 py-20 max-w-6xl mx-auto" data-testid="section-features">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#f5f5f5] mb-3" data-testid="heading-features">
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-[#6b7280] text-base max-w-lg mx-auto" data-testid="text-features-sub">
            SEVCO Sites was built for people who want to publish fast without compromising on quality.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="feature-card rounded-xl p-6"
              style={{
                backgroundColor: "#111",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              data-testid={`card-feature-${f.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: `${f.accent}18` }}
              >
                <f.icon className="h-5 w-5" style={{ color: f.accent }} />
              </div>
              <h3 className="font-bold text-[#f5f5f5] text-base mb-1" data-testid={`text-feature-title-${f.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                {f.title}
              </h3>
              <p className="text-[#6b7280] text-sm leading-relaxed" data-testid={`text-feature-desc-${f.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20" style={{ backgroundColor: "#0d0d0d" }} data-testid="section-how-it-works">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#f5f5f5] mb-3" data-testid="heading-how-it-works">
              Four steps to live.
            </h2>
            <p className="text-[#6b7280] text-base max-w-md mx-auto" data-testid="text-how-it-works-sub">
              From zero to published in under five minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Connector line (desktop only) */}
            <div
              className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)" }}
            />

            {steps.map((step, i) => (
              <div
                key={step.num}
                className="relative flex flex-col items-center text-center"
                data-testid={`card-step-${i + 1}`}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative z-10"
                  style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(59,130,246,0.2)",
                    boxShadow: "0 0 0 1px rgba(59,130,246,0.05)",
                  }}
                >
                  <span
                    className="font-black text-lg tracking-tighter"
                    style={{ color: "#3b82f6" }}
                    data-testid={`text-step-num-${i + 1}`}
                  >
                    {step.num}
                  </span>
                </div>
                <h3 className="font-bold text-[#f5f5f5] text-base mb-1" data-testid={`text-step-title-${i + 1}`}>
                  {step.title}
                </h3>
                <p className="text-[#6b7280] text-sm leading-relaxed" data-testid={`text-step-desc-${i + 1}`}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-6 py-20 max-w-4xl mx-auto" data-testid="section-cta">
        <div
          className="gradient-border-card rounded-2xl p-10 md:p-14 text-center"
          data-testid="card-cta"
        >
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-6"
            style={{ color: "#3b82f6", backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            <Check className="h-3 w-3" />
            Free forever plan included
          </div>
          <h2
            className="text-3xl md:text-5xl font-black tracking-tighter text-[#f5f5f5] mb-3"
            data-testid="heading-cta"
          >
            Ready to build?
          </h2>
          <p className="text-[#6b7280] text-base md:text-lg mb-8 max-w-md mx-auto" data-testid="text-cta-description">
            Your site lives at{" "}
            <span className="font-mono text-[#f5f5f5]">yourbrand</span>
            <span className="font-mono text-[#3b82f6]">.sev.cx</span>
            {" "}— claim it now.
          </p>
          <Link href="/auth" data-testid="link-cta-button">
            <Button
              size="lg"
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold px-10 py-3 text-base rounded-lg transition-all duration-200"
              data-testid="button-cta-create"
            >
              Create your free site <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer note */}
      <footer
        className="px-6 py-10 border-t text-center"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
        data-testid="section-footer"
      >
        <p className="text-[#6b7280] text-sm mb-1" data-testid="text-footer-platform">
          SEVCO Sites is part of the{" "}
          <a
            href="https://sevco.us"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#f5f5f5] transition-colors underline underline-offset-2"
            data-testid="link-footer-sevco"
          >
            SEVCO platform
          </a>{" "}
          •{" "}
          <a
            href="https://sevco.us"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#f5f5f5] transition-colors"
            data-testid="link-footer-domain"
          >
            sevco.us
          </a>
        </p>
        <p className="text-[#6b7280]/50 text-xs" data-testid="text-footer-powered">
          Powered by sev.cx
        </p>
      </footer>
    </div>
  );
}
