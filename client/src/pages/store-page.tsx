import { ShoppingBag } from "lucide-react";

export default function StorePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <div className="h-16 w-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
        <ShoppingBag className="h-8 w-8 text-orange-600 dark:text-orange-400" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">SEVCO Store</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Merchandise, exclusive drops, and products — coming soon.
        </p>
      </div>
    </div>
  );
}
