import { createContext, useContext, useState, useCallback } from "react";
import type { Product } from "@shared/schema";

export interface CartVariantSelection {
  groupName: string;
  optionLabel: string;
}

export interface CartItem {
  cartKey: string;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  stripePriceId: string | null;
  imageUrl: string | null;
  slug: string;
  selectedVariants?: Record<string, string>;
  variantSelections?: CartVariantSelection[];
}

interface CartContextValue {
  items: CartItem[];
  addItem: (
    product: Product,
    selectedVariants?: Record<string, string>,
    variantSelections?: CartVariantSelection[],
  ) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((
    product: Product,
    selectedVariants?: Record<string, string>,
    variantSelections?: CartVariantSelection[],
  ) => {
    const hasVariants = selectedVariants && Object.keys(selectedVariants).length > 0;
    const cartKey = hasVariants
      ? `${product.id}::${JSON.stringify(Object.fromEntries(Object.keys(selectedVariants).sort().map(k => [k, selectedVariants[k]])))}`
      : `${product.id}`;

    setItems((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          cartKey,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          stripePriceId: product.stripePriceId ?? null,
          imageUrl: product.imageUrl ?? null,
          slug: product.slug,
          selectedVariants: hasVariants ? selectedVariants : undefined,
          variantSelections: hasVariants && variantSelections && variantSelections.length > 0 ? variantSelections : undefined,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((cartKey: string) => {
    setItems((prev) => prev.filter((i) => i.cartKey !== cartKey));
  }, []);

  const updateQuantity = useCallback((cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.cartKey !== cartKey));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.cartKey === cartKey ? { ...i, quantity } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount, isOpen, openCart, closeCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
