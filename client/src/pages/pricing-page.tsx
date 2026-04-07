import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Zap } from "lucide-react";

interface SparkPack {
  id: number;
  name: string;
  sparks: number;
  price: number;
  description?: string;
  popular?: boolean;
}

interface SparkBalance {
  balance: number;
  freeMonthlyAllocation: number;
}

function SparkPackCard({ pack, isLoggedIn }: { pack: SparkPack; isLoggedIn: boolean }) {
  const [recurring, setRecurring] = useState(false);
  const { toast } = useToast();

  const checkoutMutation = useMutation({
    mutationFn: ({ packId, recurring }: { packId: number; recurring: boolean }) =>
      apiRequest("POST", "/api/sparks/checkout", { packId, recurring }).then((r) => r.json()),
    onSuccess: (data: { url: string }) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: Error) => {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    },
  });

  const priceDisplay = `$${(pack.price / 100).toFixed(2)}`;

  return (
    <Card
      className={`relative flex flex-col ${pack.popular ? "border-yellow-400/60 shadow-yellow-400/10 shadow-lg" : ""}`}
      data-testid={`card-spark-pack-${pack.id}`}
    >
      {pack.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="text-base font-bold" data-testid={`text-pack-name-${pack.id}`}>
          {pack.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-yellow-400" data-testid={`text-pack-sparks-${pack.id}`}>
            ⚡️ {pack.sparks.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">sparks</span>
        </div>

        {pack.description && (
          <p className="text-xs text-muted-foreground">{pack.description}</p>
        )}

        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between gap-2 text-sm">
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
            <span className="text-lg font-bold" data-testid={`text-pack-price-${pack.id}`}>
              {priceDisplay}
            </span>
            {recurring && (
              <span className="text-xs text-muted-foreground ml-1" data-testid={`text-pack-recurring-${pack.id}`}>
                then {priceDisplay}/mo
              </span>
            )}
          </div>

          <Button
            className="w-full"
            disabled={!isLoggedIn || checkoutMutation.isPending}
            onClick={() => isLoggedIn && checkoutMutation.mutate({ packId: pack.id, recurring })}
            data-testid={`button-buy-pack-${pack.id}`}
          >
            {checkoutMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 motion-safe:animate-spin" />
                Loading…
              </>
            ) : !isLoggedIn ? (
              "Sign in to purchase"
            ) : (
              "Buy Now"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SparkPackSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PricingPage() {
  const { user } = useAuth();

  const { data: packs, isLoading: packsLoading } = useQuery<SparkPack[]>({
    queryKey: ["/api/sparks/packs"],
  });

  const { data: balanceData } = useQuery<SparkBalance>({
    queryKey: ["/api/sparks/balance"],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const balance = balanceData?.balance;
  const freeMonthlyAllocation = balanceData?.freeMonthlyAllocation ?? 100;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10" data-testid="pricing-page">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-black tracking-tight" data-testid="text-pricing-title">
          ⚡️ Sparks
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto" data-testid="text-pricing-subtitle">
          Buy exactly the creative power you need. Unused Sparks roll over indefinitely.
        </p>

        {user && balance !== undefined && (
          <div
            className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-4 py-1.5 text-sm font-semibold text-yellow-500 dark:text-yellow-400"
            data-testid="chip-balance"
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            Your balance: ⚡️ {balance.toLocaleString()}
          </div>
        )}

        <div>
          <Link href="/">
            <span
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1"
              data-testid="link-spend-sparks"
            >
              Already have Sparks? Spend them in the platform
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </div>

      {/* Pack grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {packsLoading ? (
          <>
            <SparkPackSkeleton />
            <SparkPackSkeleton />
            <SparkPackSkeleton />
            <SparkPackSkeleton />
          </>
        ) : !packs || packs.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground" data-testid="text-no-packs">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Spark packs coming soon</p>
            <p className="text-sm mt-1">Check back later for purchasing options.</p>
          </div>
        ) : (
          packs.map((pack) => (
            <SparkPackCard key={pack.id} pack={pack} isLoggedIn={!!user} />
          ))
        )}
      </div>

      {/* Footer note */}
      <p className="text-center text-sm text-muted-foreground" data-testid="text-free-allocation">
        Free accounts receive{" "}
        <span className="font-semibold text-foreground">⚡️ {freeMonthlyAllocation}</span> free
        Sparks every month automatically.
      </p>
    </div>
  );
}
