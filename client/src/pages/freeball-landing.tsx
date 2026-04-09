import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { PageHead } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Globe,
  Box,
  Users,
  Sparkles,
  Zap,
  Download,
  Monitor,
  Star,
  Rocket,
  Layers,
  ScrollText,
  Trophy,
  Globe2,
  Music,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURE_PILLS = [
  { icon: Download, label: "No Download", desc: "Runs in your browser" },
  { icon: Monitor, label: "Browser-Based", desc: "No install needed" },
  { icon: Users, label: "Multiplayer", desc: "Play with others live" },
  { icon: Star, label: "Free to Play", desc: "Just create an account" },
];

const FEATURE_CARDS = [
  {
    icon: Globe,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    title: "Procedural Planets",
    testId: "feature-procedural",
    description:
      "Every world is unique — generated from a seed that shapes real terrain: towering mountains, impact craters, oceans of sand, and snow-capped peaks. No two planets are the same, and every session lands you somewhere new.",
  },
  {
    icon: Box,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
    title: "Voxel Building",
    testId: "feature-voxel",
    description:
      "A full block palette is at your fingertips — Grass, Stone, Crystal, SEVCO-Blue Metal, Music Nodes, Project Tiles, and Void Blocks. Build freely: your creations auto-save to the cloud so you never lose your work.",
  },
  {
    icon: Users,
    iconColor: "text-green-400",
    iconBg: "bg-green-500/10",
    title: "Multiplayer",
    testId: "feature-multiplayer",
    description:
      "See other players exploring the same planet in real time. Chat globally in-game and leave your mark on shared worlds. Communities form around planets — some explorers, some builders, some just passing through.",
  },
];

const ROADMAP_ITEMS = [
  { icon: Rocket, text: "Interplanetary travel — jump between worlds without leaving your session" },
  { icon: Layers, text: "More block types — weather-responsive materials, animated tiles, and community-designed blocks" },
  { icon: ScrollText, text: "Quests — planet-specific missions with Spark rewards for completion" },
  { icon: Trophy, text: "Leaderboards — most Crystals gathered, biggest structures built, most planets visited" },
  { icon: Globe2, text: "SEVCO Community Build Contests — platform-wide events where the community votes on the best creations" },
  { icon: Music, text: "Music Nodes — blocks that play sound, letting builders compose ambient soundscapes in-world" },
];

export default function FreeBallLandingPage() {
  const { user } = useAuth();
  const playHref = user ? "/freeball/play" : "/auth?redirect=/freeball/play";

  return (
    <div className="flex flex-col min-h-full text-white">
      <PageHead
        slug="freeball"
        title="Freeball — SEVCO Platform Game"
        description="Explore procedurally generated alien worlds, build voxel structures, unlock the SEVCO Sphere, and play with others — all in your browser. No download needed."
        ogUrl="https://sevco.us/freeball"
      />

      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-4 py-28 sm:py-36 overflow-hidden bg-[#0a0a12]"
        data-testid="section-hero"
      >
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -left-32 w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[120px] motion-safe:animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-24 -right-32 w-[500px] h-[500px] rounded-full bg-blue-700/20 blur-[120px] motion-safe:animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-indigo-600/10 blur-[100px] motion-safe:animate-[pulse_12s_ease-in-out_infinite_4s]" />
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
            SEVCO Platform &mdash; Browser Game
          </div>

          <h1
            className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-4 leading-none select-none"
            style={{
              background: "linear-gradient(135deg, #7dd3fc 0%, #3b82f6 40%, #a855f7 80%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 40px rgba(59,130,246,0.35))",
            }}
            data-testid="hero-title"
          >
            FREEBALL
          </h1>

          <p className="mt-4 text-xl md:text-2xl text-white/70 max-w-2xl mx-auto font-light leading-relaxed" data-testid="hero-tagline">
            Explore alien worlds. Build anything. Leave your mark on shared planets.
          </p>
          <p className="mt-2 text-sm text-white/40 max-w-xl mx-auto">
            A browser-based voxel space exploration game built on the SEVCO platform — part game, part creative sandbox, part social world.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3" data-testid="hero-ctas">
            <Link href={playHref}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-8 h-11 text-sm rounded-lg shadow-lg shadow-blue-500/20"
                data-testid="cta-play-now"
              >
                Play Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            {!user && (
              <Link href="/auth">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 px-8 h-11 text-sm rounded-lg"
                  data-testid="cta-sign-up"
                >
                  Sign Up / Sign In
                </Button>
              </Link>
            )}
          </div>

          <p className="mt-4 text-xs text-white/30">
            {user ? "Welcome back — dive straight in." : "Free to explore. No download needed."}
          </p>
        </div>
      </section>

      {/* Feature pills */}
      <section
        className="bg-[#0f0f1a] border-y border-white/5 px-4 py-5"
        data-testid="section-feature-pills"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {FEATURE_PILLS.map((f) => (
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

      {/* What Is Freeball? */}
      <section className="bg-[#0a0a12] px-4 py-20" data-testid="section-what-is">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            What Is <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Freeball</span>?
          </h2>
          <p className="mt-5 text-sm sm:text-base text-white/55 leading-relaxed">
            Freeball is a fully browser-based voxel space exploration game woven into the fabric of the SEVCO platform.
            There's nothing to install, nothing to configure — just open your browser and step onto an alien world.
            Break terrain, place blocks, gather rare resources, unlock vehicles, and encounter other players building
            alongside you in real time. It's part game, part creative sandbox, part social world — and it lives right here.
          </p>
        </div>
      </section>

      {/* The World — feature cards */}
      <section className="bg-[#0f0f1a] border-t border-white/5 px-4 py-20" data-testid="section-the-world">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">The World</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {FEATURE_CARDS.map((card) => (
              <FeatureCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      {/* SEVCO Sphere */}
      <section className="bg-[#0d0d18] border-t border-white/5 px-4 py-20" data-testid="section-sphere">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-8 md:p-12 overflow-hidden">
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-purple-600/15 blur-[80px] pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
              <div className="shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10">
                <Sparkles className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">The SEVCO Sphere</h2>
                <p className="text-sm sm:text-base text-white/55 leading-relaxed mb-3">
                  The SEVCO Sphere is Freeball's signature vehicle — a luminous hovering orb that lets you soar high
                  above the terrain, skimming over mountains and swooping through valleys at speed. It's the ultimate
                  explorer's tool and a status symbol on any planet.
                </p>
                <p className="text-sm text-white/40 leading-relaxed">
                  Unlock it by spending{" "}
                  <span className="text-yellow-400 font-semibold">500 Sparks</span>{" "}
                  (the SEVCO platform currency), or craft it yourself from{" "}
                  <span className="text-cyan-400 font-semibold">20 Crystal blocks</span>{" "}
                  gathered from the planet surface. Either way, once you have it, the world is yours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sparks Economy */}
      <section className="bg-[#0a0a12] border-t border-white/5 px-4 py-20" data-testid="section-sparks">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-8 md:p-12 overflow-hidden">
            <div className="absolute -left-16 -bottom-16 w-48 h-48 rounded-full bg-yellow-500/10 blur-[60px] pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
              <div className="shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-500/10">
                <Zap className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">The Sparks Economy</h2>
                <p className="text-sm sm:text-base text-white/55 leading-relaxed">
                  Sparks are the shared currency of the SEVCO platform. Earn them by sparking content across the
                  platform, contributing to the community wiki, and participating in events. Every Spark you earn
                  anywhere on SEVCO can be spent inside Freeball — on the SEVCO Sphere, rare blocks, and future
                  unlockables. The game and the wider creative community are one ecosystem.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's Coming */}
      <section className="bg-[#0d0d18] border-t border-white/5 px-4 py-20" data-testid="section-roadmap">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              What's{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Coming</span>
            </h2>
            <p className="mt-3 text-sm text-white/50 max-w-xl mx-auto">
              Freeball is actively growing. Here's a glimpse of what's on the horizon.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {ROADMAP_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-5 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] transition-colors duration-200"
                data-testid={`roadmap-item-${i}`}
              >
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/15 mt-0.5">
                  <item.icon className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="bg-gradient-to-br from-purple-900/30 via-[#0a0a12] to-blue-900/30 border-t border-white/5 px-4 py-24 text-center"
        data-testid="section-cta"
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ready to explore?</h2>
          <p className="mt-4 text-sm sm:text-base text-white/55">
            Your planet is waiting. No download. No setup. Just play.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={playHref}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-10 h-12 text-sm rounded-xl shadow-lg shadow-blue-500/20"
                data-testid="bottom-cta-play-now"
              >
                Play Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            {!user && (
              <Link href="/auth">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 px-8 h-12 text-sm rounded-xl"
                  data-testid="bottom-cta-sign-up"
                >
                  Sign Up / Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  testId,
}: {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  testId: string;
}) {
  return (
    <div
      className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-6 hover:bg-white/[0.06] transition-colors"
      data-testid={testId}
    >
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${iconBg} mb-4`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/55 leading-relaxed">{description}</p>
    </div>
  );
}
