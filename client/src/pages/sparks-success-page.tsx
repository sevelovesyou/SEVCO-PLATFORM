import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SparkIcon } from "@/components/spark-icon";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SparksSuccessData {
  paid: boolean;
  sparksAwarded?: number;
  newBalance?: number;
}

export default function SparksSuccessPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [sparksAwarded, setSparksAwarded] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setStatus("error");
      return;
    }

    apiRequest("GET", `/api/sparks/success?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data: SparksSuccessData) => {
        if (data.paid) {
          setSparksAwarded(data.sparksAwarded ?? null);
          setNewBalance(data.newBalance ?? null);
          setStatus("success");
          queryClient.invalidateQueries({ queryKey: ["/api/sparks/balance"] });
          queryClient.invalidateQueries({ queryKey: ["/api/sparks/transactions"] });
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => {
      window.location.href = "/";
    }, 5000);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6" data-testid="sparks-success-page">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 motion-safe:animate-spin text-yellow-400" />
          <p className="text-muted-foreground text-sm" data-testid="text-loading">
            Confirming your purchase…
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <div className="h-24 w-24 rounded-full bg-yellow-400/10 flex items-center justify-center">
            <span className="text-5xl animate-bounce inline-block" data-testid="icon-success">
              <SparkIcon size="xl" className="text-5xl" decorative />
            </span>
          </div>
          <div>
            <h1
              className="text-3xl font-black tracking-tight mb-2"
              data-testid="text-purchase-complete"
            >
              Purchase complete!
            </h1>
            {sparksAwarded !== null && (
              <p className="text-lg font-semibold text-yellow-400 dark:text-yellow-400" data-testid="text-sparks-awarded">
                <SparkIcon size="md" decorative /> {sparksAwarded.toLocaleString()} Sparks credited
              </p>
            )}
            {newBalance !== null && (
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-new-balance">
                New balance: <SparkIcon size="sm" decorative /> {newBalance.toLocaleString()}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting to the platform in 5 seconds…
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link href="/">
              <Button
                className="gap-2"
                data-testid="button-back-to-platform"
              >
                <CheckCircle className="h-4 w-4" />
                Back to platform
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                className="gap-2"
                data-testid="button-buy-more"
              >
                <SparkIcon size="md" decorative />
                Buy more Sparks
              </Button>
            </Link>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <SparkIcon size="xl" className="text-4xl opacity-40" decorative />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2" data-testid="text-error-title">
              Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm">
              We couldn't confirm your purchase. If you were charged, please contact support.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/pricing">
              <Button variant="outline" data-testid="button-back-to-pricing">
                Back to Pricing
              </Button>
            </Link>
            <Link href="/">
              <Button data-testid="button-go-home">Go Home</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
