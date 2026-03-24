import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Music,
  ShoppingBag,
  Folder,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";

const PLATFORM_SECTIONS = [
  {
    label: "Wiki",
    description: "Encyclopedic knowledge base for SEVCO",
    path: "/wiki",
    icon: BookOpen,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Music",
    description: "SEVCO RECORDS — releases, artists, and catalog",
    path: "/music",
    icon: Music,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    label: "Store",
    description: "Merchandise, products, and exclusive drops",
    path: "/store",
    icon: ShoppingBag,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    label: "Projects",
    description: "SEVCO Ventures — ongoing projects and initiatives",
    path: "/projects",
    icon: Folder,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
  },
  {
    label: "Dashboard",
    description: "Platform overview, analytics, and admin tools",
    path: "/dashboard",
    icon: LayoutDashboard,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-8">
      <div className="text-center space-y-3 pt-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Welcome to <span className="text-primary">SEVCO</span>
        </h1>
        <p className="text-muted-foreground text-base max-w-xl mx-auto">
          {user?.displayName ? `Hey, ${user.displayName}.` : `Hey, ${user?.username}.`}{" "}
          What would you like to explore today?
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORM_SECTIONS.map((section) => (
          <Link href={section.path} key={section.path}>
            <Card
              className="p-4 cursor-pointer hover-elevate active-elevate-2 overflow-visible group"
              data-testid={`card-section-${section.label.toLowerCase()}`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-lg ${section.bg} flex items-center justify-center shrink-0`}>
                  <section.icon className={`h-4.5 w-4.5 ${section.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">{section.label}</h2>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {section.description}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-center text-xs text-muted-foreground pb-4">
        sevelovesyou.com · SEVCO Platform
      </div>
    </div>
  );
}
