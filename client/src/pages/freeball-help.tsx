import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { PageHead } from "@/components/page-head";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  MousePointer2,
  Package,
  Sparkles,
  Globe,
  Box,
  ChevronRight,
  Keyboard,
  Eye,
  Users,
} from "lucide-react";

interface ControlRow {
  keys: string[];
  description: string;
}

interface ControlSection {
  id: string;
  title: string;
  icon: typeof Keyboard;
  iconColor: string;
  iconBg: string;
  controls: ControlRow[];
}

const CONTROL_SECTIONS: ControlSection[] = [
  {
    id: "movement",
    title: "Movement",
    icon: Gamepad2,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    controls: [
      { keys: ["W", "A", "S", "D"], description: "Walk forward / strafe left / walk back / strafe right" },
      { keys: ["Space"], description: "Jump (on foot) · Thrust upward (in SEVCO Sphere)" },
      { keys: ["Shift"], description: "Sprint (on foot) · Boost thrust (in SEVCO Sphere)" },
      { keys: ["Mouse Look"], description: "Rotate camera / aim direction" },
    ],
  },
  {
    id: "interaction",
    title: "Interaction",
    icon: MousePointer2,
    iconColor: "text-green-400",
    iconBg: "bg-green-500/10",
    controls: [
      { keys: ["LMB"], description: "Break / mine a block you are looking at" },
      { keys: ["RMB"], description: "Place the selected block from your hotbar" },
      { keys: ["E"], description: "Enter or exit the SEVCO Sphere when near it" },
      { keys: ["Esc"], description: "Pause game · Release mouse pointer lock" },
    ],
  },
  {
    id: "inventory",
    title: "Inventory & Hotbar",
    icon: Package,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
    controls: [
      { keys: ["I"], description: "Toggle inventory open / closed" },
      { keys: ["B"], description: "Toggle inventory open / closed (alternative)" },
      { keys: ["1–9"], description: "Select hotbar slot 1 through 9" },
      { keys: ["Click"], description: "Click a hotbar slot to select that block type" },
    ],
  },
  {
    id: "camera-social",
    title: "Camera & Social",
    icon: Eye,
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/10",
    controls: [
      { keys: ["T"], description: "Toggle third-person camera view" },
      { keys: ["Tab"], description: "Show / hide the player list for the current planet" },
    ],
  },
];

interface BlockEntry {
  name: string;
  color: string;
  behavior: string;
}

const BLOCK_REFERENCE: BlockEntry[] = [
  { name: "Grass",           color: "bg-green-500",   behavior: "Common surface block — plentiful on Verdania planets" },
  { name: "Stone",           color: "bg-gray-400",    behavior: "Solid foundation block found beneath the surface" },
  { name: "Crystal",         color: "bg-cyan-400",    behavior: "Rare crafting resource — 20 needed to craft the SEVCO Sphere" },
  { name: "SEVCO-Blue Metal",color: "bg-blue-700",    behavior: "Structural block with a metallic finish; used in advanced builds" },
  { name: "Music Node",      color: "bg-orange-500",  behavior: "Emits audio tones — builders can create in-world soundscapes" },
  { name: "Project Tile",    color: "bg-purple-700",  behavior: "Decorative platform block featuring SEVCO branding" },
  { name: "Void Block",      color: "bg-neutral-900", behavior: "Solid black block — ideal for dark structures or hiding wiring" },
  { name: "Leaves / Flowers",color: "bg-emerald-400", behavior: "Foliage generated on tree tops and meadows; 50 % drop on break" },
  { name: "Alien Surface",   color: "bg-violet-600",  behavior: "Found on alien biome planets — breaks may yield artifact drops" },
  { name: "Alien Rock",      color: "bg-indigo-700",  behavior: "Sub-surface alien block with artifact drop chance" },
  { name: "Sand",            color: "bg-yellow-300",  behavior: "Desert biome surface material — infinite desert worlds" },
  { name: "Snow / Ice",      color: "bg-sky-100",     behavior: "Ice biome surface; Ice blocks have a glassy crystalline look" },
];

function Kbd({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center justify-center px-2 py-0.5 rounded-md border border-white/20 bg-white/[0.07] text-[11px] font-mono font-semibold text-white/90 leading-tight shadow-sm"
      data-testid={`kbd-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {label}
    </span>
  );
}

function ControlCard({ section }: { section: ControlSection }) {
  const Icon = section.icon;
  return (
    <div
      className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
      data-testid={`control-section-${section.id}`}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${section.iconBg}`}>
          <Icon className={`h-4 w-4 ${section.iconColor}`} />
        </div>
        <h3 className="text-base font-semibold text-white">{section.title}</h3>
      </div>
      <div className="space-y-3">
        {section.controls.map((row, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
            data-testid={`control-row-${section.id}-${i}`}
          >
            <div className="flex flex-wrap gap-1.5 shrink-0 sm:w-48">
              {row.keys.map((k) => (
                <Kbd key={k} label={k} />
              ))}
            </div>
            <p className="text-sm text-white/55 leading-snug">{row.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FreeBallHelpPage() {
  const { user } = useAuth();
  const playHref = user ? "/freeball/play" : "/auth?redirect=/freeball/play";

  return (
    <div className="flex flex-col min-h-full text-white">
      <PageHead
        slug="freeball-help"
        title="Freeball — Controls & Help"
        description="Complete controls reference and how-to-play guide for Freeball, the browser-based voxel space exploration game on the SEVCO platform."
        ogUrl="https://sevco.us/freeball/help"
      />

      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-4 py-20 sm:py-28 overflow-hidden bg-[#0a0a12]"
        data-testid="help-hero"
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] motion-safe:animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-24 -right-32 w-[400px] h-[400px] rounded-full bg-purple-700/15 blur-[120px] motion-safe:animate-[pulse_10s_ease-in-out_infinite_2s]" />
        </div>
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-6">
            <Keyboard className="h-3 w-3" />
            Controls &amp; Help
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-none select-none"
            style={{
              background: "linear-gradient(135deg, #7dd3fc 0%, #3b82f6 40%, #a855f7 80%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 40px rgba(59,130,246,0.35))",
            }}
            data-testid="help-title"
          >
            FREEBALL HELP
          </h1>

          <p className="mt-4 text-base md:text-lg text-white/60 max-w-xl mx-auto font-light leading-relaxed">
            Everything you need to explore alien worlds, build in voxel space, and master the SEVCO Sphere.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3" data-testid="help-hero-ctas">
            <Link href="/freeball">
              <Button
                variant="ghost"
                size="lg"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 px-6 h-10 text-sm rounded-lg"
                data-testid="btn-back-freeball-top"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Freeball
              </Button>
            </Link>
            <Link href={playHref}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-8 h-10 text-sm rounded-lg shadow-lg shadow-blue-500/20"
                data-testid="btn-play-now-top"
              >
                Play Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How to Play */}
      <section className="bg-[#0f0f1a] border-t border-white/5 px-4 py-16" data-testid="section-how-to-play">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-pink-500/10">
              <Globe className="h-5 w-5 text-pink-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">How to Play</h2>
          </div>

          <p className="text-sm sm:text-base text-white/55 leading-relaxed mb-8">
            Freeball drops you onto a procedurally generated alien world with nothing but your wits and an empty
            inventory. Here's the core game loop from first spawn to interplanetary travel.
          </p>

          <ol className="space-y-5" data-testid="how-to-play-steps">
            {[
              {
                step: 1,
                title: "Spawn on a Planet",
                body: "You land on one of four planet types — Verdania (lush), Desert (arid), Ice (frozen), or Alien (otherworldly). Look around with your mouse to take in the terrain.",
              },
              {
                step: 2,
                title: "Break Blocks to Collect Resources",
                body: "Aim at any block and hold Left Mouse Button (LMB) to mine it. Broken blocks are added to your inventory automatically. Common blocks like Grass and Stone are everywhere; rare Crystal blocks glow cyan deep underground.",
              },
              {
                step: 3,
                title: "Open Your Inventory",
                body: "Press I or B to open the inventory panel. Here you can see everything you've collected and drag blocks into your hotbar slots so you can place them quickly.",
              },
              {
                step: 4,
                title: "Select a Block & Build",
                body: "Use keys 1–9 to select a hotbar slot, or click a slot directly. Then right-click (RMB) on any surface to place that block. Build freely — your creations auto-save to the cloud.",
              },
              {
                step: 5,
                title: "Gather Crystals & Unlock the SEVCO Sphere",
                body: "Collect 20 Crystal blocks from deep underground to craft the SEVCO Sphere, or spend 500 Sparks in the shop. The Sphere is your key to flying high above the terrain at speed.",
              },
              {
                step: 6,
                title: "Fly the SEVCO Sphere",
                body: "Walk near the Sphere and press E to board it. Use W/A/S/D to steer, Space to ascend, and Shift for a speed boost. Press E again to exit when you've landed somewhere new.",
              },
              {
                step: 7,
                title: "Explore Other Planets",
                body: "Fly high enough and you'll see the other planets glowing in the sky. Navigate toward one and descend to enter a completely different biome with unique blocks, terrain, and resources.",
              },
              {
                step: 8,
                title: "Play with Others",
                body: "Other players exploring the same planet appear in real time. Chat with them in-game, collaborate on builds, or just race to find the best Crystal deposits first.",
              },
            ].map(({ step, title, body }) => (
              <li
                key={step}
                className="flex gap-5 p-5 rounded-xl border border-white/8 bg-white/[0.02]"
                data-testid={`how-to-play-step-${step}`}
              >
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-bold">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-1">{title}</p>
                  <p className="text-sm text-white/55 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Controls Reference */}
      <section className="bg-[#0a0a12] border-t border-white/5 px-4 py-16" data-testid="section-controls">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Controls Reference</h2>
            <p className="mt-3 text-sm text-white/45 max-w-lg mx-auto">
              All keyboard and mouse bindings. The game captures your mouse pointer — press Esc at any time to release it.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {CONTROL_SECTIONS.map((section) => (
              <ControlCard key={section.id} section={section} />
            ))}
          </div>
        </div>
      </section>

      {/* SEVCO Sphere Deep-Dive */}
      <section className="bg-[#0d0d18] border-t border-white/5 px-4 py-16" data-testid="section-sphere">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-8 overflow-hidden">
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-purple-600/15 blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">The SEVCO Sphere</h2>
              </div>

              <div className="space-y-4 text-sm text-white/55 leading-relaxed">
                <p>
                  The SEVCO Sphere is Freeball's signature vehicle — a luminous hovering orb that lets you soar above
                  the terrain, skim over mountains, and reach distant areas of the planet in seconds.
                </p>

                <div>
                  <p className="text-white/80 font-semibold mb-2">How to Unlock</p>
                  <ul className="space-y-1.5 ml-4">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
                      Spend <span className="text-yellow-400 font-semibold mx-1">500 Sparks</span> — the SEVCO platform currency earned across the whole platform.
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      Or craft it from <span className="text-cyan-400 font-semibold mx-1">20 Crystal blocks</span> collected from deep underground.
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="text-white/80 font-semibold mb-2">Flying Controls</p>
                  <div className="space-y-2">
                    {[
                      { keys: ["W", "A", "S", "D"], desc: "Steer the Sphere in any horizontal direction" },
                      { keys: ["Space"], desc: "Thrust upward" },
                      { keys: ["Shift"], desc: "Engage boost for higher speed" },
                      { keys: ["E"], desc: "Exit the Sphere and land on foot" },
                    ].map((row, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <div className="flex gap-1">
                          {row.keys.map((k) => <Kbd key={k} label={k} />)}
                        </div>
                        <span className="text-white/50 text-sm">{row.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-white/80 font-semibold mb-2">Planet Travel</p>
                  <p>
                    Fly the Sphere to a high altitude and you will see other planets glowing in the distance. Navigate
                    toward any planet and descend into its atmosphere to land. Your inventory and Sphere carry over
                    between worlds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Block Types Reference */}
      <section className="bg-[#0f0f1a] border-t border-white/5 px-4 py-16" data-testid="section-blocks">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10">
              <Box className="h-5 w-5 text-indigo-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Block Types</h2>
          </div>

          <p className="text-sm text-white/50 mb-6 max-w-2xl">
            A quick reference for every block type in Freeball and any special behaviours they have.
          </p>

          <div className="overflow-x-auto rounded-xl border border-white/8" data-testid="block-reference-table">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.04]">
                  <th className="text-left px-5 py-3 text-white/70 font-semibold w-6">Color</th>
                  <th className="text-left px-5 py-3 text-white/70 font-semibold">Block</th>
                  <th className="text-left px-5 py-3 text-white/70 font-semibold">Behavior &amp; Notes</th>
                </tr>
              </thead>
              <tbody>
                {BLOCK_REFERENCE.map((block, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                    data-testid={`block-row-${i}`}
                  >
                    <td className="px-5 py-3">
                      <span className={`inline-block w-4 h-4 rounded ${block.color} border border-white/10`} />
                    </td>
                    <td className="px-5 py-3 font-medium text-white/90">{block.name}</td>
                    <td className="px-5 py-3 text-white/50 leading-snug">{block.behavior}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Multiplayer Tips */}
      <section className="bg-[#0a0a12] border-t border-white/5 px-4 py-16" data-testid="section-multiplayer">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-8 overflow-hidden">
            <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-green-600/10 blur-[60px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/10">
                  <Users className="h-5 w-5 text-green-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Multiplayer Tips</h2>
              </div>
              <ul className="space-y-3 text-sm text-white/55 leading-relaxed">
                {[
                  "Press Tab to see all players currently on your planet.",
                  "Use the in-game chat (type and press Enter) to coordinate builds or say hello.",
                  "Block placements are shared — any player can add to or modify structures on a planet.",
                  "Crystal-rich spots get depleted quickly on busy planets — explore further out for the good veins.",
                  "The SEVCO Sphere can be used by anyone on any planet; owning one just means you can summon yours.",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-3" data-testid={`multiplayer-tip-${i}`}>
                    <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="bg-gradient-to-br from-purple-900/30 via-[#0a0a12] to-blue-900/30 border-t border-white/5 px-4 py-20 text-center"
        data-testid="section-bottom-cta"
      >
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Ready to play?</h2>
          <p className="mt-3 text-sm text-white/50">
            You've got the knowledge. Now go explore.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3" data-testid="bottom-ctas">
            <Link href="/freeball">
              <Button
                variant="ghost"
                size="lg"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 px-6 h-10 text-sm rounded-lg"
                data-testid="btn-back-freeball-bottom"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Freeball
              </Button>
            </Link>
            <Link href={playHref}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-10 h-11 text-sm rounded-xl shadow-lg shadow-blue-500/20"
                data-testid="btn-play-now-bottom"
              >
                Play Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
