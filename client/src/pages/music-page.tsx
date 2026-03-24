import { Music } from "lucide-react";

export default function MusicPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
        <Music className="h-8 w-8 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">SEVCO RECORDS</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Music releases, artist profiles, and the SEVCO catalog — coming soon.
        </p>
      </div>
    </div>
  );
}
