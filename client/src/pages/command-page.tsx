import { useEffect } from "react";
import { useLocation } from "wouter";
import { usePermission } from "@/hooks/use-permission";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  admin:     "bg-primary/10 text-primary border-primary/20",
  executive: "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/20",
  staff:     "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  partner:   "bg-red-700/10 text-red-800 dark:text-red-500 border-red-700/20",
  client:    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20",
  user:      "bg-muted text-muted-foreground border-border",
};

interface CommandPageProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function CommandPageLayout({ children, title, subtitle }: CommandPageProps) {
  const { role } = usePermission();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (role === "partner" || role === "client" || role === "user") {
      setLocation("/");
    }
  }, [role, setLocation]);

  const defaultTitle = title ?? "Command";
  const defaultSubtitle = subtitle ?? (() => {
    if (role === "admin") return "Platform-wide management and analytics";
    if (role === "executive") return "Business overview and key metrics";
    if (role === "staff") return "Your activity and wiki overview";
    return "Platform overview and quick access";
  })();

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">{defaultTitle}</h1>
          {role && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded capitalize border ${ROLE_COLORS[role] ?? ""}`}>
              {role}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{defaultSubtitle}</p>
      </div>

      {children}
    </div>
  );
}
