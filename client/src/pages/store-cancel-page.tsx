import { Link } from "wouter";
import { XCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StoreCancelPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="h-20 w-20 rounded-full bg-red-700/10 flex items-center justify-center">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-cancel-heading">
            Payment Canceled
          </h1>
          <p className="text-muted-foreground text-sm">
            No worries — your cart items are still waiting for you.
          </p>
        </div>
        <Link href="/store">
          <Button
            className="bg-red-700 hover:bg-red-800 text-white gap-2"
            data-testid="button-back-to-store"
          >
            <ShoppingBag className="h-4 w-4" />
            Return to Store
          </Button>
        </Link>
      </div>
    </div>
  );
}
