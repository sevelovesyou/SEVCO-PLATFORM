import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  StickyNote,
  CheckSquare,
  Images,
  Mail,
  Wand2,
  ChevronDown,
  Lock,
  Wrench,
} from "lucide-react";

interface Tool {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
  features: string[];
  accessLabel: string;
  accessVariant: "free" | "client" | "partner";
  requiredRoles: string[];
  accentColor: string;
  glowColor: string;
}

const TOOLS: Tool[] = [
  {
    name: "Notes",
    href: "/notes",
    icon: StickyNote,
    description: "Capture ideas, jot down thoughts, and collaborate with your team — all in one place.",
    features: [
      "Personal & shared notes",
      "Markdown support",
      "Pin important notes",
      "Full-text search",
    ],
    accessLabel: "Free with account",
    accessVariant: "free",
    requiredRoles: ["user", "client", "partner", "staff", "executive", "admin"],
    accentColor: "hover:shadow-amber-500/20",
    glowColor: "group-hover:border-amber-500/40",
  },
  {
    name: "Tasks",
    href: "/tools/tasks",
    icon: CheckSquare,
    description: "Stay on top of your work with personal to-do lists and a staff task board.",
    features: [
      "To-do lists & checklists",
      "Priority labels",
      "Staff task board view",
      "Due dates & reminders",
    ],
    accessLabel: "Free with account",
    accessVariant: "free",
    requiredRoles: ["user", "client", "partner", "staff", "executive", "admin"],
    accentColor: "hover:shadow-blue-500/20",
    glowColor: "group-hover:border-blue-500/40",
  },
  {
    name: "Gallery",
    href: "/gallery",
    icon: Images,
    description: "Browse and copy platform media instantly. Your visual library, always at hand.",
    features: [
      "Platform media library",
      "One-click image copy",
      "Organize by album",
      "Quick profile assets",
    ],
    accessLabel: "Free with account",
    accessVariant: "free",
    requiredRoles: ["user", "client", "partner", "staff", "executive", "admin"],
    accentColor: "hover:shadow-purple-500/20",
    glowColor: "group-hover:border-purple-500/40",
  },
  {
    name: "Email",
    href: "/messages",
    icon: Mail,
    description: "Your own @sevco.us inbox — compose, reply, and manage folders directly in the platform.",
    features: [
      "Personal @sevco.us address",
      "Compose & reply",
      "Folder organization",
      "Unread notifications",
    ],
    accessLabel: "Client+",
    accessVariant: "client",
    requiredRoles: ["client", "partner", "staff", "executive", "admin"],
    accentColor: "hover:shadow-green-500/20",
    glowColor: "group-hover:border-green-500/40",
  },
  {
    name: "Wikify",
    href: "/wikify",
    icon: Wand2,
    description: "AI-powered bulk article generator optimized for SEO and AEO. Submit directly to the review queue.",
    features: [
      "Bulk AI article generation",
      "SEO & AEO optimization",
      "Submit to review queue",
      "Export as ZIP archive",
    ],
    accessLabel: "Partner+",
    accessVariant: "partner",
    requiredRoles: ["partner", "staff", "executive", "admin"],
    accentColor: "hover:shadow-red-500/20",
    glowColor: "group-hover:border-red-500/40",
  },
];

const ACCESS_BADGE_CLASSES: Record<Tool["accessVariant"], string> = {
  free:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  client:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  partner: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export default function ToolsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleToolOpen = (tool: Tool) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!tool.requiredRoles.includes(user.role)) {
      toast({
        title: "Access required",
        description: "Your account tier doesn't include this tool.",
        variant: "destructive",
      });
      return;
    }
    navigate(tool.href);
  };

  const userCanAccess = (tool: Tool) => {
    if (!user) return false;
    return tool.requiredRoles.includes(user.role);
  };

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[50vh] flex items-center" data-testid="section-tools-hero">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-red-700/20 blur-[140px] motion-safe:animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-20 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[140px] motion-safe:animate-[pulse_10s_ease-in-out_infinite_2s]" />
        </div>
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-28 w-full text-center">
          <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/60 mb-6">
            <Wrench className="h-3.5 w-3.5" />
            SEVCO Tools
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4" data-testid="text-tools-hero-headline">
            Your Creative Toolkit
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-8" data-testid="text-tools-hero-subheadline">
            Powerful tools built into your SEVCO workspace — notes, tasks, media, communication, and AI content creation.
          </p>
          <a href="#tools" aria-label="Scroll to tools" data-testid="link-scroll-to-tools">
            <ChevronDown className="h-6 w-6 text-white/30 mx-auto motion-safe:animate-bounce" />
          </a>
        </div>
      </section>

      {/* Tool Cards Grid */}
      <section id="tools" className="max-w-6xl mx-auto px-6 py-16 md:py-20" data-testid="section-tool-cards">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const canAccess = userCanAccess(tool);
            const locked = !!user && !canAccess;
            return (
              <div
                key={tool.name}
                className={`group relative bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-300 ${tool.accentColor} hover:shadow-xl ${tool.glowColor} hover:bg-white/[0.06] flex flex-col`}
                data-testid={`card-tool-${tool.name.toLowerCase()}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.08] border border-white/10">
                      <Icon className="h-5 w-5 text-white/80" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white" data-testid={`text-tool-name-${tool.name.toLowerCase()}`}>{tool.name}</h2>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium border ${ACCESS_BADGE_CLASSES[tool.accessVariant]}`}
                    data-testid={`badge-access-${tool.name.toLowerCase()}`}
                  >
                    {tool.accessLabel}
                  </Badge>
                </div>

                <p className="text-sm text-white/60 mb-4 leading-relaxed">{tool.description}</p>

                <ul className="space-y-1.5 mb-6 flex-1">
                  {tool.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-white/50">
                      <span className="h-1 w-1 rounded-full bg-white/30 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  size="sm"
                  variant={canAccess ? "default" : "outline"}
                  className={
                    canAccess
                      ? "w-full"
                      : "w-full border-white/20 text-white/60 hover:text-white hover:border-white/40 bg-transparent"
                  }
                  onClick={() => handleToolOpen(tool)}
                  data-testid={`button-open-tool-${tool.name.toLowerCase()}`}
                >
                  {locked ? (
                    <>
                      <Lock className="h-3.5 w-3.5 mr-1.5" />
                      Upgrade to Access
                    </>
                  ) : !user ? (
                    "Sign in to Access"
                  ) : (
                    "Open Tool"
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* More tools coming soon */}
        <div className="mt-16 text-center" data-testid="section-tools-coming-soon">
          <div className="inline-block bg-white/[0.04] border border-white/10 rounded-2xl px-8 py-6 backdrop-blur-md">
            <p className="text-sm text-white/40 mb-1">We're always building</p>
            <p className="text-base font-medium text-white/70">More tools coming soon</p>
          </div>
        </div>
      </section>
    </div>
  );
}
