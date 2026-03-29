import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useCart } from "@/hooks/use-cart";

export default function StoreSuccessPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [orderId, setOrderId] = useState<number | null>(null);
  const { clearCart } = useCart();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setStatus("error");
      return;
    }

    apiRequest("GET", `/api/checkout/session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.paid) {
          setOrderId(data.order?.id ?? null);
          setStatus("success");
          clearCart();
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 motion-safe:animate-spin text-red-600" />
          <p className="text-muted-foreground text-sm">Confirming your order…</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2" data-testid="text-order-success">
              Order Confirmed!
            </h1>
            <p className="text-muted-foreground text-sm">
              Thank you for your purchase. You'll receive a confirmation email shortly.
            </p>
            {orderId && (
              <p className="text-xs text-muted-foreground mt-2" data-testid="text-order-id">
                Order #{orderId}
              </p>
            )}
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link href="/store">
              <Button
                variant="outline"
                className="gap-2"
                data-testid="button-back-to-store"
              >
                <ShoppingBag className="h-4 w-4" />
                Back to Store
              </Button>
            </Link>
            <Link href="/">
              <Button
                className="bg-red-700 hover:bg-red-800 text-white gap-2"
                data-testid="button-go-home"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-40" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              We couldn't confirm your order. If you were charged, please contact support.
            </p>
          </div>
          <Link href="/store">
            <Button
              variant="outline"
              data-testid="button-back-to-store"
            >
              Back to Store
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
