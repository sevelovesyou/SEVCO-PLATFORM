import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import planetBlack from "@assets/SEVCO_planet_icon_black_1774331331137.png";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const { login, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", username: "", password: "" },
  });

  const onLogin = async (data: LoginFormData) => {
    try {
      setEmailNotVerified(false);
      await login(data);
    } catch (err: any) {
      const errText = err.message || "";
      try {
        const parsed = JSON.parse(errText.replace(/^\d+:\s*/, ""));
        if (parsed.code === "EMAIL_NOT_VERIFIED") {
          setEmailNotVerified(true);
          return;
        }
      } catch {}
      toast({
        title: "Login failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    try {
      const res = await apiRequest("POST", "/api/register", data);
      const result = await res.json();
      if (result.status === "pending_verification") {
        setPendingVerification(true);
        setPendingEmail(data.email);
      }
    } catch (err: any) {
      const errText = err.message || "Something went wrong";
      let description = "Something went wrong. Please try again.";
      try {
        const parsed = JSON.parse(errText.replace(/^\d+:\s*/, ""));
        if (parsed.message) description = parsed.message;
      } catch {}
      toast({
        title: "Registration failed",
        description,
        variant: "destructive",
      });
    }
  };

  const handleResendVerification = async (email: string) => {
    setResendingEmail(true);
    try {
      await apiRequest("POST", "/api/resend-verification", { email });
      toast({
        title: "Verification email sent",
        description: "Please check your inbox.",
      });
    } catch (err: any) {
      const errText = err.message || "";
      let description = "Could not resend. Please try again later.";
      try {
        const parsed = JSON.parse(errText.replace(/^\d+:\s*/, ""));
        if (parsed.message) description = parsed.message;
      } catch {}
      toast({
        title: "Resend failed",
        description,
        variant: "destructive",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-sm" data-testid="card-pending-verification">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <Mail className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a verification link to <strong>{pendingEmail}</strong>.
                Click the link to verify your account and sign in.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
                  onClick={() => handleResendVerification(pendingEmail)}
                  disabled={resendingEmail}
                  data-testid="button-resend-verification"
                >
                  {resendingEmail ? "Sending…" : "Resend verification email"}
                </button>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary/80"
                  onClick={() => {
                    setPendingVerification(false);
                    setMode("login");
                    loginForm.reset();
                  }}
                  data-testid="link-back-to-login"
                >
                  Back to sign in
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="hidden lg:flex flex-1 items-center justify-center bg-muted p-8">
          <div className="max-w-md text-center space-y-6">
            <img src={planetBlack} alt="SEVCO" className="h-24 w-24 object-contain mx-auto dark:invert" />
            <img src={wordmarkBlack} alt="SEVCO" className="h-10 w-auto object-contain mx-auto dark:invert" />
            <p className="text-muted-foreground text-lg">
              A collaborative knowledge base for your organization. Create, edit, and review articles
              with your team.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isLoginSubmitting = loginForm.formState.isSubmitting;
  const isRegisterSubmitting = registerForm.formState.isSubmitting;

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-sm relative z-10 pointer-events-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <img src={planetBlack} alt="SEVCO" className="h-12 w-12 object-contain dark:invert" />
            </div>
            <div className="flex justify-center mb-2">
              <img src={wordmarkBlack} alt="SEVCO" className="h-6 w-auto object-contain dark:invert" />
            </div>
            <CardDescription>
              Sign in or register for access
            </CardDescription>
          </CardHeader>
          <CardContent key={mode}>
            {mode === "login" ? (
              <>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-username"
                              placeholder="Enter your username"
                              autoComplete="username"
                              autoFocus
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-password"
                              type="password"
                              placeholder="Enter your password"
                              autoComplete="current-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {emailNotVerified && (
                      <div className="text-sm text-destructive space-y-1" data-testid="text-email-not-verified">
                        <p>Please verify your email before signing in.</p>
                        <button
                          type="button"
                          className="text-primary underline underline-offset-4 hover:text-primary/80"
                          onClick={() => {
                            const email = prompt("Enter your email to resend verification:");
                            if (email) {
                              handleResendVerification(email);
                            }
                          }}
                          disabled={resendingEmail}
                          data-testid="button-resend-from-login"
                        >
                          {resendingEmail ? "Sending…" : "Resend verification email"}
                        </button>
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoginSubmitting}
                      data-testid="button-auth-submit"
                    >
                      {isLoginSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </form>
                </Form>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                    onClick={() => {
                      setMode("register");
                      setEmailNotVerified(false);
                      registerForm.reset();
                    }}
                    data-testid="link-switch-to-register"
                  >
                    Register
                  </button>
                </div>
              </>
            ) : (
              <>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-email"
                              type="email"
                              placeholder="Enter your email"
                              autoComplete="email"
                              autoFocus
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-username"
                              placeholder="Choose a username"
                              autoComplete="username"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-password"
                              type="password"
                              placeholder="Choose a password"
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isRegisterSubmitting}
                      data-testid="button-auth-submit"
                    >
                      {isRegisterSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                </Form>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                    onClick={() => {
                      setMode("login");
                      loginForm.reset();
                    }}
                    data-testid="link-switch-to-login"
                  >
                    Sign in
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="hidden lg:flex flex-1 items-center justify-center bg-muted p-8">
        <div className="max-w-md text-center space-y-6">
          <img src={planetBlack} alt="SEVCO" className="h-24 w-24 object-contain mx-auto dark:invert" />
          <img src={wordmarkBlack} alt="SEVCO" className="h-10 w-auto object-contain mx-auto dark:invert" />
          <p className="text-muted-foreground text-lg">
            A collaborative knowledge base for your organization. Create, edit, and review articles
            with your team.
          </p>
        </div>
      </div>
    </div>
  );
}
