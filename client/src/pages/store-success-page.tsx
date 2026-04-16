import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useCart } from "@/hooks/use-cart";
import type { Order } from "@shared/schema";

interface OrderItemSnapshot {
  productId?: number;
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  selectedVariants?: Record<string, string>;
  variantSelections?: Array<{ groupName: string; optionLabel: string }>;
}

function formatVariantSummary(item: OrderItemSnapshot): string | null {
  if (item.variantSelections && item.variantSelections.length > 0) {
    return item.variantSelections.map(v => `${v.groupName}: ${v.optionLabel}`).join(" / ");
  }
  if (item.selectedVariants && Object.keys(item.selectedVariants).length > 0) {
    return Object.entries(item.selectedVariants)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" / ");
  }
  return null;
}

export default function StoreSuccessPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [order, setOrder] = useState<Order | null>(null);
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
          setOrder(data.order ?? null);
          setStatus("success");
          clearCart();
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  const items: OrderItemSnapshot[] = Array.isArray(order?.items) ? (order!.items as OrderItemSnapshot[]) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 motion-safe:animate-spin text-red-600" />
          <p className="text-muted-foreground text-sm">Confirming your order…</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-6 text-center max-w-lg w-full">
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
            {order && (
              <p className="text-xs text-muted-foreground mt-2" data-testid="text-order-id">
                Order #{order.id}
              </p>
            )}
          </div>

          {items.length > 0 && (
            <Card className="w-full p-4 text-left" data-testid="card-order-summary">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Order Summary
              </h2>
              <ul className="flex flex-col gap-3">
                {items.map((item, idx) => {
                  const variantSummary = formatVariantSummary(item);
                  const lineTotal = typeof item.price === "number"
                    ? item.price * (item.quantity ?? 1)
                    : null;
                  return (
                    <li
                      key={idx}
                      className="flex items-start justify-between gap-3 text-sm"
                      data-testid={`order-item-${idx}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-tight">
                          {item.name ?? item.description ?? "Item"}
                        </p>
                        {variantSummary && (
                          <p
                            className="text-xs text-muted-foreground mt-0.5"
                            data-testid={`order-item-${idx}-variants`}
                          >
                            {variantSummary}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Qty {item.quantity ?? 1}
                        </p>
                      </div>
                      {lineTotal !== null && (
                        <div className="text-sm font-semibold whitespace-nowrap">
                          ${lineTotal.toFixed(2)}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {order && (
                <div className="border-t border-border mt-3 pt-3 flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span data-testid="text-order-total">${(order.total / 100).toFixed(2)}</span>
                </div>
              )}
            </Card>
          )}

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
