import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <div className="h-16 w-16 rounded-2xl bg-sky-500/10 flex items-center justify-center">
        <LayoutDashboard className="h-8 w-8 text-sky-600 dark:text-sky-400" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Platform overview, analytics, and admin tools — coming soon.
        </p>
      </div>
    </div>
  );
}
