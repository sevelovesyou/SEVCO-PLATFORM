import { Folder } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
        <Folder className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">SEVCO Ventures</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Ongoing projects and SEVCO initiatives — coming soon.
        </p>
      </div>
    </div>
  );
}
