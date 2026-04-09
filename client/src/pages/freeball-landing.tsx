import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useEffect, useRef } from "react";

function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const stars: { x: number; y: number; r: number; speed: number; opacity: number }[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initStars() {
      if (!canvas) return;
      stars.length = 0;
      for (let i = 0; i < 220; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.5 + 0.2,
          speed: Math.random() * 0.15 + 0.03,
          opacity: Math.random() * 0.7 + 0.3,
        });
      }
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 200, 255, ${star.opacity})`;
        ctx.fill();
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      }
      animationId = requestAnimationFrame(draw);
    }

    resize();
    initStars();
    draw();

    window.addEventListener("resize", () => { resize(); initStars(); });
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", () => { resize(); initStars(); });
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
}

export default function FreeBallLandingPage() {
  const { user } = useAuth();

  const playHref = user ? "/freeball/play" : "/auth?redirect=/freeball/play";

  return (
    <div className="relative min-h-screen bg-[#060a14] text-white overflow-x-hidden">
      <StarCanvas />

      <div className="relative z-10">
        {/* Hero */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-4">
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-blue-400 font-semibold px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 mb-6">
              SEVCO Platform &mdash; Browser Game
            </span>
          </div>
          <h1
            className="text-7xl md:text-9xl font-black tracking-tighter mb-4 select-none"
            style={{
              background: "linear-gradient(135deg, #7dd3fc 0%, #3b82f6 40%, #a855f7 80%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 40px rgba(59,130,246,0.4))",
            }}
            data-testid="hero-title"
          >
            FREEBALL
          </h1>
          <p className="text-xl md:text-2xl text-blue-200/80 max-w-2xl mb-3 font-light leading-relaxed" data-testid="hero-tagline">
            Explore alien worlds. Build anything. Leave your mark on shared planets.
          </p>
          <p className="text-sm text-slate-400 max-w-xl mb-10">
            A browser-based voxel space exploration game built on the SEVCO platform — part game, part creative sandbox, part social world.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center" data-testid="hero-ctas">
            <Link href={playHref}>
              <button
                className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95"
                data-testid="cta-play-now"
              >
                Play Now
              </button>
            </Link>
            {!user && (
              <Link href="/auth">
                <button
                  className="px-8 py-4 rounded-xl font-bold text-lg border border-blue-500/50 text-blue-300 hover:bg-blue-500/10 hover:border-blue-400 hover:text-blue-200 transition-all duration-200 hover:scale-105 active:scale-95"
                  data-testid="cta-sign-up"
                >
                  Sign Up / Sign In
                </button>
              </Link>
            )}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            {user ? "Welcome back — dive straight in." : "Free to explore. No download needed."}
          </p>

          {/* Scroll hint */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 text-xs animate-bounce">
            <span>Scroll to explore</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </section>

        {/* What Is Freeball? */}
        <section className="max-w-4xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="section-what-is">
              What Is <span className="text-blue-400">Freeball</span>?
            </h2>
            <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-6" />
          </div>
          <p className="text-lg text-slate-300 leading-relaxed text-center max-w-3xl mx-auto">
            Freeball is a fully browser-based voxel space exploration game woven into the fabric of the SEVCO platform. There's nothing to install, nothing to configure — just open your browser and step onto an alien world. Break terrain, place blocks, gather rare resources, unlock vehicles, and encounter other players building alongside you in real time. It's part game, part creative sandbox, part social world — and it lives right here.
          </p>
        </section>

        {/* The World — feature cards */}
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="section-the-world">The World</h2>
            <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon="🌍"
              title="Procedural Planets"
              testId="feature-procedural"
              description="Every world is unique — generated from a seed that shapes real terrain: towering mountains, impact craters, oceans of sand, and snow-capped peaks. No two planets are the same, and every session lands you somewhere new."
            />
            <FeatureCard
              icon="🧱"
              title="Voxel Building"
              testId="feature-voxel"
              description="A full block palette is at your fingertips — Grass, Stone, Crystal, SEVCO-Blue Metal, Music Nodes, Project Tiles, and Void Blocks. Build freely: your creations auto-save to the cloud so you never lose your work."
            />
            <FeatureCard
              icon="🧑‍🚀"
              title="Multiplayer"
              testId="feature-multiplayer"
              description="See other players exploring the same planet in real time. Chat globally in-game and leave your mark on shared worlds. Communities form around planets — some explorers, some builders, some just passing through."
            />
          </div>
        </section>

        {/* SEVCO Sphere */}
        <section className="max-w-4xl mx-auto px-6 py-24">
          <div
            className="rounded-2xl p-10 md:p-14 border border-purple-500/30 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(88,28,135,0.3) 0%, rgba(30,10,60,0.6) 100%)",
            }}
          >
            <div
              className="absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-20 blur-3xl"
              style={{ background: "radial-gradient(circle, #a855f7, transparent 70%)" }}
            />
            <div className="relative z-10">
              <span className="text-5xl mb-6 block">🔮</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-purple-300" data-testid="section-sphere">
                The SEVCO Sphere
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed mb-6">
                The SEVCO Sphere is Freeball's signature vehicle — a luminous hovering orb that lets you soar high above the terrain, skimming over mountains and swooping through valleys at speed. It's the ultimate explorer's tool and a status symbol on any planet.
              </p>
              <p className="text-slate-400">
                Unlock it by spending <span className="text-yellow-400 font-semibold">500 Sparks</span> (the SEVCO platform currency), or craft it yourself from <span className="text-cyan-400 font-semibold">20 Crystal blocks</span> gathered from the planet surface. Either way, once you have it, the world is yours.
              </p>
            </div>
          </div>
        </section>

        {/* Sparks Economy */}
        <section className="max-w-4xl mx-auto px-6 py-12">
          <div
            className="rounded-2xl p-10 border border-yellow-500/20 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(78,63,0,0.3) 0%, rgba(20,15,0,0.6) 100%)",
            }}
          >
            <div className="flex items-start gap-6">
              <span className="text-4xl flex-shrink-0">⚡</span>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-yellow-300" data-testid="section-sparks">
                  The Sparks Economy
                </h2>
                <p className="text-slate-300 leading-relaxed">
                  Sparks are the shared currency of the SEVCO platform. Earn them by sparking content across the platform, contributing to the community wiki, and participating in events. Every Spark you earn anywhere on SEVCO can be spent inside Freeball — on the SEVCO Sphere, rare blocks, and future unlockables. The game and the wider creative community are one ecosystem.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What's Coming */}
        <section className="max-w-4xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="section-roadmap">
              What's <span className="text-blue-400">Coming</span>
            </h2>
            <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-6" />
            <p className="text-slate-400">Freeball is actively growing. Here's a glimpse of what's on the horizon.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "🚀", text: "Interplanetary travel — jump between worlds without leaving your session" },
              { icon: "🧩", text: "More block types — weather-responsive materials, animated tiles, and community-designed blocks" },
              { icon: "📜", text: "Quests — planet-specific missions with Spark rewards for completion" },
              { icon: "🏆", text: "Leaderboards — most Crystals gathered, biggest structures built, most planets visited" },
              { icon: "🌐", text: "SEVCO Community Build Contests — platform-wide events where the community votes on the best creations" },
              { icon: "🎵", text: "Music Nodes — blocks that play sound, letting builders compose ambient soundscapes in-world" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-5 rounded-xl border border-slate-700/50 bg-slate-900/40 hover:border-blue-500/30 hover:bg-slate-800/40 transition-colors duration-200"
                data-testid={`roadmap-item-${i}`}
              >
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <p className="text-slate-300 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-24 px-6 text-center">
          <div
            className="max-w-3xl mx-auto rounded-2xl p-12 border border-blue-500/20 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(10,10,30,0.95) 100%)",
            }}
          >
            <div
              className="absolute inset-0 opacity-10 rounded-2xl"
              style={{
                background: "radial-gradient(ellipse at 50% 0%, #3b82f6 0%, transparent 70%)",
              }}
            />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Ready to explore?</h2>
              <p className="text-slate-400 mb-8 text-lg">Your planet is waiting. No download. No setup. Just play.</p>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Link href={playHref}>
                  <button
                    className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95"
                    data-testid="bottom-cta-play-now"
                  >
                    Play Now
                  </button>
                </Link>
                {!user && (
                  <Link href="/auth">
                    <button
                      className="px-8 py-4 rounded-xl font-bold text-lg border border-blue-500/50 text-blue-300 hover:bg-blue-500/10 hover:border-blue-400 hover:text-blue-200 transition-all duration-200 hover:scale-105 active:scale-95"
                      data-testid="bottom-cta-sign-up"
                    >
                      Sign Up / Sign In
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  testId,
}: {
  icon: string;
  title: string;
  description: string;
  testId: string;
}) {
  return (
    <div
      className="rounded-2xl p-8 border border-slate-700/60 bg-slate-900/50 hover:border-blue-500/40 hover:bg-slate-800/50 transition-all duration-300 group"
      data-testid={testId}
    >
      <span className="text-4xl mb-5 block group-hover:scale-110 transition-transform duration-200">{icon}</span>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
