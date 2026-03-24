import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { X, ShoppingCart, Plus, Minus, Trash2, Package, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function CartDrawer() {
  const { items, removeItem, updateQuantity, clearCart, total, itemCount, isOpen, closeCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/checkout", { items });
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        clearCart();
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    },
  });

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={closeCart}
        data-testid="cart-overlay"
      />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-background border-l border-border shadow-2xl z-50 flex flex-col"
        data-testid="cart-drawer"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-orange-500" />
            <h2 className="font-bold text-base">Your Cart</h2>
            {itemCount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center" data-testid="cart-item-count">
                {itemCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeCart}
            className="h-8 w-8"
            data-testid="button-close-cart"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <div>
              <p className="font-semibold text-sm">Your cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Add items from the store to get started</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={closeCart}
              data-testid="button-continue-shopping"
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-3 items-start"
                  data-testid={`cart-item-${item.productId}`}
                >
                  <div className="h-16 w-16 rounded-lg bg-muted/50 border border-border overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight line-clamp-2" data-testid={`cart-item-name-${item.productId}`}>
                      {item.name}
                    </p>
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400 mt-0.5" data-testid={`cart-item-price-${item.productId}`}>
                      ${item.price.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        data-testid={`button-decrease-${item.productId}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-semibold w-6 text-center" data-testid={`cart-item-qty-${item.productId}`}>
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        data-testid={`button-increase-${item.productId}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => removeItem(item.productId)}
                    data-testid={`button-remove-${item.productId}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-bold text-base" data-testid="cart-total">${total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout</p>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                data-testid="button-checkout"
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    Checkout
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
