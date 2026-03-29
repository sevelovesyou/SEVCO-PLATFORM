import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHead } from "@/components/page-head";
import { Link, useSearch } from "wouter";
import {
  ShoppingBag, Plus, Package, ArrowUpDown, SlidersHorizontal,
  AlertCircle, Eye, ShoppingCart, ShieldCheck, Truck, Star, ArrowRight,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from "@/hooks/use-permission";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@shared/schema";

const CAN_MANAGE_STORE_PRODUCTS = ["admin", "executive"];

type SortKey = "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc";
const SORT_LABELS: Record<SortKey, string> = {
  "featured":   "Featured",
  "price-asc":  "Price: Low to High",
  "price-desc": "Price: High to Low",
  "name-asc":   "Name: A–Z",
  "name-desc":  "Name: Z–A",
};

const STORE_PILLS = [
  { icon: ShieldCheck, label: "Secure Checkout" },
  { icon: Truck, label: "Fast Shipping" },
  { icon: Star, label: "Quality Gear" },
  { icon: ShoppingBag, label: "Exclusive Drops" },
];

const CATEGORY_PALETTES: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  apparel:      { bg: "bg-indigo-500/10",  text: "text-indigo-700 dark:text-indigo-300",  border: "border-indigo-500/20",  gradient: "from-indigo-400 to-indigo-600" },
  music:        { bg: "bg-blue-600/10",  text: "text-blue-700 dark:text-blue-300",  border: "border-blue-600/20",  gradient: "from-blue-500 to-blue-700" },
  accessories:  { bg: "bg-rose-500/10",    text: "text-rose-700 dark:text-rose-300",      border: "border-rose-500/20",    gradient: "from-rose-400 to-rose-600" },
  vinyl:        { bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400",    border: "border-amber-500/20",   gradient: "from-amber-400 to-amber-600" },
  electronics:  { bg: "bg-blue-500/10",    text: "text-blue-700 dark:text-blue-300",      border: "border-blue-500/20",    gradient: "from-blue-400 to-blue-600" },
  posters:      { bg: "bg-pink-500/10",    text: "text-pink-700 dark:text-pink-300",      border: "border-pink-500/20",    gradient: "from-pink-400 to-pink-600" },
  collectibles: { bg: "bg-teal-500/10",    text: "text-teal-700 dark:text-teal-300",      border: "border-teal-500/20",    gradient: "from-teal-400 to-teal-600" },
  art:          { bg: "bg-fuchsia-500/10", text: "text-fuchsia-700 dark:text-fuchsia-300",border: "border-fuchsia-500/20", gradient: "from-fuchsia-400 to-fuchsia-600" },
  digital:      { bg: "bg-sky-500/10",     text: "text-sky-700 dark:text-sky-300",        border: "border-sky-500/20",     gradient: "from-sky-400 to-sky-600" },
};
const DEFAULT_PALETTE = { bg: "bg-red-700/10", text: "text-red-800 dark:text-red-300", border: "border-red-700/20", gradient: "from-red-600 to-red-700" };

function getCategoryPalette(cat: string) {
  return CATEGORY_PALETTES[cat.toLowerCase()] ?? DEFAULT_PALETTE;
}

function ProductImageArea({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  const [imgError, setImgError] = useState(false);
  const soldOut = product.stockStatus === "sold_out";
  const palette = getCategoryPalette(product.categoryName);
  const initial = product.name.charAt(0).toUpperCase();

  const lowStock = product.stockStatus === "low_stock";

  return (
    <div className="relative aspect-square overflow-hidden rounded-t-xl">
      <div className="w-full h-full bg-muted/50 rounded-lg p-4">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover rounded-md transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center gap-2 rounded-md ${palette.bg}`}>
            <span className={`text-5xl font-black tracking-tight ${palette.text} opacity-40`}>{initial}</span>
            <Package className={`h-6 w-6 ${palette.text} opacity-20`} />
          </div>
        )}
      </div>

      {soldOut && (
        <div className="absolute top-3 left-3">
          <span
            data-testid={`badge-sold-out-${product.id}`}
            className="bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm"
          >
            Sold Out
          </span>
        </div>
      )}

      {lowStock && !soldOut && (
        <div className="absolute top-3 left-3">
          <span
            data-testid={`badge-low-stock-${product.id}`}
            className="bg-amber-500 text-black text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm"
          >
            Low Stock
          </span>
        </div>
      )}

      {!soldOut && !lowStock && (
        <div className="absolute top-3 left-3">
          <span
            data-testid={`badge-in-stock-${product.id}`}
            className="bg-green-600 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm"
          >
            In Stock
          </span>
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
        <div className="flex gap-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
          <Link href={`/store/products/${product.slug}`}>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white text-black hover:bg-white/90 shadow-md text-xs font-semibold px-3"
              data-testid={`button-view-${product.id}`}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </Link>
          {!soldOut && (
            <Button
              size="sm"
              className="bg-red-700 hover:bg-red-800 text-white shadow-md text-xs font-semibold px-3"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart(); }}
              data-testid={`button-add-to-cart-${product.id}`}
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onAddToCart, accentHsl }: { product: Product; onAddToCart: () => void; accentHsl?: string }) {
  const soldOut = product.stockStatus === "sold_out";
  const accentColor = accentHsl ? `hsl(${accentHsl})` : undefined;
  return (
    <div
      data-testid={`card-product-${product.id}`}
      className="group cursor-pointer flex flex-col"
    >
      <ProductImageArea product={product} onAddToCart={onAddToCart} />
      <div className="pt-3 pb-1 px-0.5 flex flex-col gap-0.5">
        <h3
          className={`text-sm font-semibold leading-snug line-clamp-2 transition-colors ${accentColor ? "" : "group-hover:text-red-700 dark:group-hover:text-red-500"}`}
          style={accentColor ? { "--product-accent": accentColor } as React.CSSProperties : undefined}
          data-testid={`text-name-${product.id}`}
        >
          {product.name}
        </h3>
        <p
          className="text-sm font-bold mt-0.5"
          data-testid={`text-price-${product.id}`}
        >
          {soldOut ? (
            <span className="text-muted-foreground line-through">${product.price.toFixed(2)}</span>
          ) : (
            <span
              className={accentColor ? "" : "text-red-700 dark:text-red-500"}
              style={accentColor ? { color: accentColor } : undefined}
            >
              ${product.price.toFixed(2)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="pt-3 flex flex-col gap-1.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

function CategoryBanner({ name, count, active, onClick, accentHsl }: {
  name: string; count: number; active: boolean; onClick: () => void; accentHsl?: string;
}) {
  const palette = getCategoryPalette(name);
  const accentBg = accentHsl ? `hsl(${accentHsl} / 0.1)` : undefined;
  const accentBorder = accentHsl ? `hsl(${accentHsl} / 0.3)` : undefined;
  const accentText = accentHsl ? `hsl(${accentHsl})` : undefined;
  return (
    <button
      onClick={onClick}
      data-testid={`banner-category-${name.toLowerCase().replace(/\s+/g, "-")}`}
      className={`group relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer text-left shrink-0 w-36 md:w-auto ${
        active
          ? accentHsl ? "border-2 shadow-sm" : `${palette.bg} ${palette.border} border-2 shadow-sm`
          : "border-border bg-white/[0.03] hover:bg-white/[0.06] hover:border-red-400 dark:hover:border-red-800"
      }`}
      style={active && accentHsl ? { backgroundColor: accentBg, borderColor: accentBorder } : undefined}
    >
      <div
        className={`h-20 w-full flex items-end p-3 ${active ? (accentHsl ? "" : palette.bg) : "bg-muted/30 group-hover:bg-muted/60 transition-colors"}`}
        style={active && accentHsl ? { backgroundColor: accentBg } : undefined}
      >
        <div>
          <p
            className={`text-xs font-bold leading-tight ${active ? (accentHsl ? "" : palette.text) : "text-foreground"}`}
            style={active && accentHsl ? { color: accentText } : undefined}
          >
            {name}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{count} item{count !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </button>
  );
}

function AllCategoryBanner({ active, count, onClick, accentHsl }: { active: boolean; count: number; onClick: () => void; accentHsl?: string }) {
  const accentBg = accentHsl ? `hsl(${accentHsl} / 0.1)` : undefined;
  const accentBorder = accentHsl ? `hsl(${accentHsl} / 0.3)` : undefined;
  const accentText = accentHsl ? `hsl(${accentHsl})` : undefined;
  return (
    <button
      onClick={onClick}
      data-testid="banner-category-all"
      className={`group relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer text-left shrink-0 w-36 md:w-auto ${
        active
          ? accentHsl ? "border-2 shadow-sm" : "bg-red-700/10 border-red-700/30 border-2 shadow-sm"
          : "border-border bg-white/[0.03] hover:bg-white/[0.06] hover:border-red-400 dark:hover:border-red-800"
      }`}
      style={active && accentHsl ? { backgroundColor: accentBg, borderColor: accentBorder } : undefined}
    >
      <div
        className={`h-20 w-full flex items-end p-3 ${active ? (accentHsl ? "" : "bg-red-700/10") : "bg-muted/30 group-hover:bg-muted/60 transition-colors"}`}
        style={active && accentHsl ? { backgroundColor: accentBg } : undefined}
      >
        <div>
          <p
            className={`text-xs font-bold leading-tight ${active ? (accentHsl ? "" : "text-red-800 dark:text-red-300") : "text-foreground"}`}
            style={active && accentHsl ? { color: accentText } : undefined}
          >
            All Products
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{count} item{count !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </button>
  );
}

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "price-asc":  return sorted.sort((a, b) => a.price - b.price);
    case "price-desc": return sorted.sort((a, b) => b.price - a.price);
    case "name-asc":   return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":  return sorted.sort((a, b) => b.name.localeCompare(a.name));
    default:           return sorted.sort((a, b) => b.id - a.id);
  }
}

export default function StorePage() {
  const { role } = usePermission();
  const canManage = role && CAN_MANAGE_STORE_PRODUCTS.includes(role);
  const search = useSearch();
  const urlCategory = new URLSearchParams(search).get("category") ?? "all";
  const [activeCategory, setActiveCategory] = useState(urlCategory);
  const [sort, setSort] = useState<SortKey>("featured");
  const { addItem, itemCount, openCart } = useCart();

  useEffect(() => {
    setActiveCategory(urlCategory);
  }, [urlCategory]);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  const { data: platformSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const storeAccentHsl = platformSettings["store.accentColor"];

  const categoryMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => map.set(p.categoryName, (map.get(p.categoryName) ?? 0) + 1));
    return map;
  }, [products]);

  const categories = useMemo(() => Array.from(categoryMap.keys()).sort(), [categoryMap]);

  const filtered = useMemo(() => {
    const base = activeCategory === "all" ? products : products.filter((p) => p.categoryName === activeCategory);
    return sortProducts(base, sort);
  }, [products, activeCategory, sort]);

  return (
    <div className="min-h-screen bg-background" data-page="store">
      <PageHead
        slug="store"
        title="SEVCO Store — Merchandise & Exclusive Drops"
        description="Shop merchandise, exclusive drops, and products from the SEVCO universe. Apparel, accessories, music, and more."
        ogUrl="https://sevco.us/store"
      />
      {/* ── HERO ── */}
      <div
        className="relative overflow-hidden bg-[#0a0a12] px-6 py-20 md:py-28"
        data-testid="section-store-hero"
      >
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-20 -left-28 w-[500px] h-[500px] rounded-full bg-red-800/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-20 -right-28 w-[400px] h-[400px] rounded-full bg-amber-500/15 blur-[100px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-red-500 uppercase tracking-wider mb-5">
              <ShoppingBag className="h-3.5 w-3.5" />
              SEVCO Store
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
              <span className="bg-gradient-to-r from-red-600 via-red-400 to-yellow-300 bg-clip-text text-transparent">
                SEVCO Store
              </span>
            </h1>
            <p className="text-white/60 mt-3 max-w-md text-sm">
              Merchandise, exclusive drops, and products from the SEVCO universe.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={openCart}
              variant="secondary"
              className="relative bg-white/10 hover:bg-white/20 text-white border border-white/15 font-semibold"
              data-testid="button-open-cart"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cart
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-700 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center" data-testid="cart-badge-count">
                  {itemCount}
                </span>
              )}
            </Button>
            {canManage && (
              <Link href="/store/products/new">
                <Button
                  data-testid="button-add-product"
                  className="bg-red-700 hover:bg-red-600 text-white font-semibold shadow-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── FEATURE PILLS ── */}
      <section
        className="bg-[#0f0f1a] border-y border-white/5 px-4 py-5"
        data-testid="section-store-pills"
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {STORE_PILLS.map((pill) => (
            <div
              key={pill.label}
              className="flex items-center gap-2.5"
              data-testid={`store-pill-${pill.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-red-700/15">
                <pill.icon className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-xs font-semibold text-white/80">{pill.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
        {(isLoading || categories.length > 0) && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3 w-3" />
              Browse by Category
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 lg:grid-cols-6 md:overflow-visible scrollbar-none">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-36 md:w-auto rounded-xl shrink-0" />
                ))
              ) : (
                <>
                  <AllCategoryBanner
                    active={activeCategory === "all"}
                    count={products.length}
                    onClick={() => setActiveCategory("all")}
                    accentHsl={storeAccentHsl}
                  />
                  {categories.map((cat) => (
                    <CategoryBanner
                      key={cat}
                      name={cat}
                      count={categoryMap.get(cat) ?? 0}
                      active={activeCategory === cat}
                      onClick={() => setActiveCategory(cat)}
                      accentHsl={storeAccentHsl}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger
                className="w-[170px] h-8 text-xs border-border/60"
                data-testid="select-sort"
              >
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <SelectItem key={key} value={key} data-testid={`sort-option-${key}`}>
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description={activeCategory !== "all"
              ? `No items in "${activeCategory}" yet.`
              : "The store is empty. Check back soon."}
            action={canManage && activeCategory === "all" ? (
              <Link href="/store/products/new">
                <Button variant="outline" size="sm" data-testid="button-add-first-product">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Product
                </Button>
              </Link>
            ) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={() => addItem(product)} accentHsl={storeAccentHsl} />
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM CLOSER CTA ── */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-red-900/40 via-background to-red-900/20 border-t border-white/5 px-6 py-20 md:py-24 text-center mt-8"
        data-testid="section-store-cta"
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/3 w-[400px] h-[300px] rounded-full bg-red-800/10 blur-[100px] animate-[pulse_9s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 right-1/3 w-[300px] h-[200px] rounded-full bg-amber-500/10 blur-[80px] animate-[pulse_11s_ease-in-out_infinite_2s]" />
        </div>
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3 text-foreground">
            Can't find what you're looking for?
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            New drops land regularly. Follow us on Discord to get notified about exclusive releases and limited-edition gear.
          </p>
          <Link href="/contact">
            <Button
              size="lg"
              variant="destructive"
              className="font-semibold gap-2"
              data-testid="button-store-contact"
            >
              Get in Touch
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
