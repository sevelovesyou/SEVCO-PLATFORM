import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Briefcase, MapPin, Clock, Wifi, DollarSign,
  ArrowLeft, CheckCircle, AlertCircle, Send,
} from "lucide-react";
import { Link } from "wouter";
import type { Job, JobApplication } from "@shared/schema";

const applySchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  resumeUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  coverLetter: z.string().min(50, "Cover letter must be at least 50 characters").max(3000),
});
type ApplyForm = z.infer<typeof applySchema>;

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function renderMarkdown(text: string) {
  return text
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} className="text-base font-bold mt-5 mb-2">{line.slice(3)}</h2>;
      if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold mt-5 mb-2">{line.slice(2)}</h1>;
      if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm text-muted-foreground list-disc">{line.slice(2)}</li>;
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
    });
}

export default function JobsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [justSubmitted, setJustSubmitted] = useState(false);

  const { data: job, isLoading, error } = useQuery<Job>({
    queryKey: ["/api/jobs", slug],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${slug}`);
      if (!res.ok) throw new Error("Job not found");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: myApplication } = useQuery<JobApplication | null>({
    queryKey: ["/api/jobs", slug, "my-application"],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${slug}/my-application`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!slug && !!user,
  });

  const submitted = justSubmitted || !!myApplication;

  const form = useForm<ApplyForm>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      resumeUrl: "",
      coverLetter: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ApplyForm) =>
      apiRequest("POST", `/api/jobs/${slug}/apply`, data),
    onSuccess: () => {
      setJustSubmitted(true);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", slug, "my-application"] });
    },
    onError: (e: Error) => {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <h2 className="text-lg font-bold mb-1">Job not found</h2>
        <p className="text-sm text-muted-foreground mb-4">This position may have been filled or removed.</p>
        <Link href="/jobs">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> View all openings
          </Button>
        </Link>
      </div>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Back link */}
      <Link href="/jobs">
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6" data-testid="link-back-jobs">
          <ArrowLeft className="h-3.5 w-3.5" />
          All openings
        </button>
      </Link>

      {/* Job header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
          {job.department}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3" data-testid="text-job-title">
          {job.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
          )}
          {job.remote && (
            <span className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5" />
              Remote
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {job.type.replace("-", " ")}
          </span>
          {salary && (
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              {salary}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <Card className="p-6 overflow-visible mb-6">
        <h2 className="text-sm font-semibold mb-3">About this role</h2>
        <div>{renderMarkdown(job.description)}</div>
      </Card>

      {/* Requirements */}
      {job.requirements && (
        <Card className="p-6 overflow-visible mb-8">
          <h2 className="text-sm font-semibold mb-3">Requirements</h2>
          <div>{renderMarkdown(job.requirements)}</div>
        </Card>
      )}

      {/* Application form */}
      <div className="border-t pt-8">
        <h2 className="text-lg font-bold mb-1">Apply for this role</h2>
        <p className="text-sm text-muted-foreground mb-6">
          We review every application personally. We'll be in touch within a week.
        </p>

        {!user ? (
          <Card className="p-8 overflow-visible text-center" data-testid="apply-sign-in-prompt">
            <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Sign in to apply</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You need a SEVCO account to submit an application.
            </p>
            <Button size="sm" onClick={() => setLocation("/auth")} data-testid="button-sign-in-to-apply">
              Sign in / Create account
            </Button>
          </Card>
        ) : submitted ? (
          <Card className="p-8 overflow-visible text-center" data-testid="application-success">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">Application received!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Thanks for applying for <strong>{job.title}</strong>. We'll review your application and be in touch soon.
            </p>
            <Link href="/jobs">
              <Button variant="outline" size="sm">View other openings</Button>
            </Link>
          </Card>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="space-y-5"
              data-testid="form-apply"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="+1 555 000 0000" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resumeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resume / Portfolio URL <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="https://linkedin.com/in/yourname" {...field} data-testid="input-resume-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverLetter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Letter</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us why you want to work at SEVCO and what makes you a great fit for this role..."
                        rows={6}
                        className="resize-none"
                        {...field}
                        data-testid="input-cover-letter"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">{field.value.length}/3000</p>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={mutation.isPending}
                data-testid="button-submit-application"
              >
                {mutation.isPending ? "Submitting..." : (
                  <><Send className="h-4 w-4" /> Submit Application</>
                )}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
