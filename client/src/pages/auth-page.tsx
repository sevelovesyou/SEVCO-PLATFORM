import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import planetBlack from "@assets/SEVCO_planet_icon_black_1774331331137.png";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";

const authSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { login, register, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: AuthFormData) => {
    try {
      if (mode === "login") {
        await login(data);
      } else {
        await register(data);
      }
    } catch (err: any) {
      toast({
        title: mode === "login" ? "Login failed" : "Registration failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <img src={planetBlack} alt="SEVCO" className="h-12 w-12 object-contain dark:invert" />
            </div>
            <div className="flex justify-center mb-2">
              <img src={wordmarkBlack} alt="SEVCO" className="h-6 w-auto object-contain dark:invert" />
            </div>
            <CardTitle className="text-2xl">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to access the SEVCO Wiki"
                : "Register to start contributing to the wiki"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-username"
                          placeholder="Enter your username"
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-password"
                          type="password"
                          placeholder="Enter your password"
                          autoComplete={mode === "login" ? "current-password" : "new-password"}
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
                  disabled={isSubmitting}
                  data-testid="button-auth-submit"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "login" ? "Sign In" : "Create Account"}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                    onClick={() => {
                      setMode("register");
                      form.reset();
                    }}
                    data-testid="link-switch-to-register"
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                    onClick={() => {
                      setMode("login");
                      form.reset();
                    }}
                    data-testid="link-switch-to-login"
                  >
                    Sign in
                  </button>
                </>
              )}
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
