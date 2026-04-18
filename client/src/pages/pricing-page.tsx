import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SparkIcon } from "@/components/spark-icon";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Check,
  X,
  ArrowDown,
  Palette,
  Music,
  FileText,
  Eye,
  Bot,
  Unlock,
  ChevronUp,
} from "lucide-react";

interface SparkPack {
  id: number;
  name: string;
  sparks: number;
  price: number;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  stripeRecurringPriceId?: string | null;
  active?: boolean;
  sortOrder?: number;
}

const BASE_RATE = 0.008;

function getDiscountPct(pack: SparkPack): number {
  return Math.round((1 - pack.price / 100 / (pack.sparks * BASE_RATE)) * 100);
}

function SparkPackCard({ pack, isLoggedIn, highlighted }: { pack: SparkPack; isLoggedIn: boolean; highlighted?: boolean }) {
  const [recurring, setRecurring] = useState(false);
  const { toast } = useToast();
  const discountPct = getDiscountPct(pack);

  const checkoutMutation = useMutation({
    mutationFn: ({ packId, recurring }: { packId: number; recurring: boolean }) =>
      apiRequest("POST", "/api/sparks/checkout", { packId, recurring }).then((r) => r.json()),
    onSuccess: (data: { url: string }) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: (err: Error) => {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    },
  });

  const priceDisplay = `$${(pack.price / 100).toFixed(2)}`;

  return (
    <Card
      className={`relative flex flex-col transition-all ${
        highlighted
          ? "border-yellow-400/70 shadow-lg shadow-yellow-400/10 ring-1 ring-yellow-400/40"
          : "border-border"
      }`}
      data-testid={`card-spark-pack-${pack.id}`}
    >
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {highlighted && (
          <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap">
            Best Value
          </span>
        )}
        {discountPct > 0 && (
          <span className="bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap">
            Save {discountPct}%
          </span>
        )}
      </div>

      <CardHeader className="pb-2 pt-7">
        <CardTitle className="text-lg font-bold" data-testid={`text-pack-name-${pack.id}`}>
          {pack.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1">
        <div className="flex flex-col gap-1">
          <span
            className={`${
              pack.sparks >= 100000 ? "text-2xl" : pack.sparks >= 10000 ? "text-3xl" : "text-4xl"
            } font-black text-yellow-400 whitespace-nowrap`}
            data-testid={`text-pack-sparks-${pack.id}`}
          >
            <SparkIcon size="xl" decorative /> {pack.sparks.toLocaleString()}
          </span>
          <p className="text-xs text-muted-foreground -mt-2" data-testid={`text-per-spark-${pack.id}`}>
            {(() => {
              const centsPerSpark = pack.price / pack.sparks;
              return centsPerSpark < 1
                ? `${centsPerSpark.toFixed(3).replace(/\.?0+$/, "")}¢ per spark`
                : `$${(centsPerSpark / 100).toFixed(4)} per spark`;
            })()}
          </p>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={`recurring-${pack.id}`}
              className="text-sm text-muted-foreground cursor-pointer select-none"
            >
              Recur monthly
            </label>
            <Switch
              id={`recurring-${pack.id}`}
              checked={recurring}
              onCheckedChange={setRecurring}
              data-testid={`toggle-recurring-${pack.id}`}
            />
          </div>

          <div className="text-right">
            <span className="text-2xl font-bold" data-testid={`text-pack-price-${pack.id}`}>
              {priceDisplay}
            </span>
            {recurring && (
              <span className="text-xs text-muted-foreground ml-1" data-testid={`text-pack-recurring-${pack.id}`}>
                /mo
              </span>
            )}
          </div>

          {isLoggedIn ? (
            <Button
              className={`w-full ${highlighted ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300" : ""}`}
              disabled={checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate({ packId: pack.id, recurring })}
              data-testid={`button-buy-pack-${pack.id}`}
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 motion-safe:animate-spin" />
                  Loading…
                </>
              ) : (
                "Buy Now"
              )}
            </Button>
          ) : (
            <Link href="/auth">
              <Button className="w-full" variant="outline" data-testid={`button-signin-pack-${pack.id}`}>
                Sign in to purchase
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SparkPackSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2 pt-7">
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-36" />
        <div className="space-y-2 mt-auto">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

const USE_CASES = [
  { icon: Palette, title: "AI Art Generation", description: "Generate images, album art, and visual concepts on demand." },
  { icon: Music, title: "Music Tools", description: "Access premium beat-making and mastering features." },
  { icon: FileText, title: "Content Creation", description: "AI writing, copywriting, and caption tools for creators." },
  { icon: Eye, title: "Visibility Boosts", description: "Pin posts, feature your profile, and amplify your reach." },
  { icon: Bot, title: "Advanced AI Chat", description: "Extended sessions with Grok, Claude, and GPT-4o." },
  { icon: Unlock, title: "Premium Features", description: "Unlock advanced platform capabilities as they launch." },
];

const COMPARISONS = [
  { sparks: "Pay for what you use", subs: "Pay monthly whether you use it or not" },
  { sparks: "Never expire", subs: "Reset every billing cycle" },
  { sparks: "Flexible — any feature", subs: "Locked to one plan tier" },
  { sparks: "Top up anytime", subs: "Wait for renewal" },
];

const FAQ_ITEMS = [
  {
    q: "What are Sparks?",
    a: "Sparks are the SEVCO platform currency. Use them to access AI features, creative tools, and visibility boosts across the platform.",
  },
  {
    q: "Do Sparks expire?",
    a: "No. Paid Sparks roll over indefinitely — they stay in your account until you use them.",
  },
  {
    q: "What's the recurring option?",
    a: "Recurring is a monthly auto-top-up. Your account gets recharged each month automatically. Cancel anytime from your account settings.",
  },
  {
    q: "How do I use Sparks?",
    a: "Sparks are automatically deducted when you use premium features. No manual redemption needed.",
  },
  {
    q: "Can I get a refund?",
    a: "Contact support within 7 days of purchase and we'll review your request.",
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const packsRef = useRef<HTMLDivElement>(null);

  const { data: packs, isLoading: packsLoading } = useQuery<SparkPack[]>({
    queryKey: ["/api/sparks/packs"],
  });

  const { data: balanceData } = useQuery<{ balance: number }>({
    queryKey: ["/api/sparks/balance"],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const balance = balanceData?.balance;

  function scrollToPacks() {
    packsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen" data-testid="pricing-page">

      {/* ── Section 1: Hero ── */}
      <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 30% 50%, rgba(250,204,21,0.3) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(250,204,21,0.15) 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-yellow-400 text-5xl font-black tracking-tight mb-2">
            <SparkIcon size="xl" className="text-5xl" decorative /> Sparks
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white/90 leading-tight" data-testid="text-pricing-title">
            Creative power, on demand.
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto" data-testid="text-pricing-subtitle">
            Buy exactly what you need. Use it whenever you want. Sparks never expire.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {user && balance !== undefined && (
              <div
                className="inline-flex items-center gap-2 bg-yellow-400/15 border border-yellow-400/40 rounded-full px-5 py-2 text-sm font-semibold text-yellow-300"
                data-testid="chip-balance"
              >
                <SparkIcon size="md" decorative /> {balance.toLocaleString()} — Your balance
              </div>
            )}
            <Button
              size="lg"
              className="bg-yellow-400 text-yellow-900 hover:bg-yellow-300 font-bold rounded-full px-8"
              onClick={scrollToPacks}
              data-testid="button-hero-cta"
            >
              Get Started
              <ArrowDown className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Section 2: Pack Grid ── */}
      <section ref={packsRef} className="max-w-5xl mx-auto px-4 py-16 scroll-mt-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black tracking-tight" data-testid="text-packs-heading">
            Choose your pack
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">One-time purchase. No subscription required unless you want it.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {packsLoading ? (
            <>
              <SparkPackSkeleton />
              <SparkPackSkeleton />
              <SparkPackSkeleton />
              <SparkPackSkeleton />
            </>
          ) : !packs || packs.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground" data-testid="text-no-packs">
              <SparkIcon size="xl" className="text-4xl block text-center mb-3 opacity-30" decorative />
              <p className="font-medium">Spark packs coming soon</p>
              <p className="text-sm mt-1">Check back later for purchasing options.</p>
            </div>
          ) : (
            packs.map((pack) => (
              <SparkPackCard
                key={pack.id}
                pack={pack}
                isLoggedIn={!!user}
                highlighted={pack.name === "Surge"}
              />
            ))
          )}
        </div>
      </section>

      {/* ── Section 3: Use Cases ── */}
      <section className="bg-muted/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black tracking-tight">What can you do with Sparks?</h2>
            <p className="text-muted-foreground mt-1 text-sm">Spend them across the entire SEVCO platform.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {USE_CASES.map((uc) => (
              <div
                key={uc.title}
                className="flex items-start gap-4 bg-background border border-border rounded-xl p-5"
                data-testid={`card-usecase-${uc.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="shrink-0 h-9 w-9 rounded-lg bg-yellow-400/10 flex items-center justify-center">
                  <uc.icon className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{uc.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{uc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Why Sparks ── */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black tracking-tight">Why Sparks instead of a subscription?</h2>
          <p className="text-muted-foreground mt-1 text-sm">True pay-as-you-go, built for the way creators actually work.</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-2 bg-muted/50">
            <div className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-yellow-500 flex items-center gap-1.5">
              <SparkIcon size="sm" decorative /> Sparks
            </div>
            <div className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground border-l border-border">
              vs. Subscriptions
            </div>
          </div>
          {COMPARISONS.map((row, i) => (
            <div key={i} className={`grid grid-cols-2 border-t border-border ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
              <div className="px-5 py-3.5 text-sm flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                {row.sparks}
              </div>
              <div className="px-5 py-3.5 text-sm text-muted-foreground flex items-center gap-2 border-l border-border">
                <X className="h-4 w-4 text-red-400/70 shrink-0" />
                {row.subs}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 5: FAQ ── */}
      <section className="bg-muted/40 border-y border-border">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black tracking-tight">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full space-y-2" data-testid="faq-accordion">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border rounded-xl px-4 bg-background"
                data-testid={`faq-item-${i}`}
              >
                <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Section 6: Footer CTA ── */}
      <section className="bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-5">
          <h2 className="text-3xl font-black tracking-tight">Ready to start?</h2>
          <p className="text-white/60 text-lg">
            <SparkIcon size="lg" decorative /> Buy your first Sparks pack and unlock the full SEVCO experience.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {user ? (
              <Button
                size="lg"
                className="bg-yellow-400 text-yellow-900 hover:bg-yellow-300 font-bold rounded-full px-8"
                onClick={scrollToPacks}
                data-testid="button-footer-browse"
              >
                Browse Packs
                <ChevronUp className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <>
                <Link href="/auth">
                  <Button
                    size="lg"
                    className="bg-yellow-400 text-yellow-900 hover:bg-yellow-300 font-bold rounded-full px-8"
                    data-testid="button-footer-signin"
                  >
                    Sign In & Buy
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 rounded-full px-8"
                  onClick={scrollToPacks}
                  data-testid="button-footer-browse"
                >
                  Browse Packs
                  <ChevronUp className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
          </div>
          <p className="text-xs text-white/30 pt-4">
            Sparks never expire. Cancel recurring plans anytime from your account.
          </p>
        </div>
      </section>
    </div>
  );
}
