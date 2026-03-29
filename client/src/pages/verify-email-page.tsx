import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { SevcoLogo } from "@/components/sevco-logo";
import { queryClient } from "@/lib/queryClient";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setState("error");
      setErrorMessage("No verification token provided.");
      return;
    }

    fetch(`/api/verify-email?token=${encodeURIComponent(token)}`, { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const user = await res.json();
          queryClient.setQueryData(["/api/user"], user);
          setState("success");
          setTimeout(() => setLocation("/"), 2000);
        } else {
          const data = await res.json().catch(() => ({}));
          setState("error");
          setErrorMessage(data.message || "This link has expired or is invalid.");
        }
      })
      .catch(() => {
        setState("error");
        setErrorMessage("Something went wrong. Please try again.");
      });
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <Card className="w-full max-w-sm" data-testid="card-verify-email">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center mb-2">
            <SevcoLogo size={48} />
          </div>

          {state === "loading" && (
            <div className="space-y-3" data-testid="verify-loading">
              <Loader2 className="h-10 w-10 motion-safe:animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Verifying your email…</p>
            </div>
          )}

          {state === "success" && (
            <div className="space-y-3" data-testid="verify-success">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="font-medium">Email verified! You're now signed in.</p>
              <p className="text-sm text-muted-foreground">Redirecting…</p>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-3" data-testid="verify-error">
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="font-medium">{errorMessage}</p>
              <a
                href="/auth"
                className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
                data-testid="link-back-to-auth"
              >
                Back to sign in
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
