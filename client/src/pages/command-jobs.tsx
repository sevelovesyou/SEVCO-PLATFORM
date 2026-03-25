import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ExternalLink, Mail, FileText } from "lucide-react";
import { Link } from "wouter";
import type { Job, JobApplication } from "@shared/schema";

const DEPARTMENTS = ["Engineering", "Design", "Operations", "SEVCO Records", "Marketing", "Sales"];
const JOB_TYPES = ["full-time", "part-time", "contract", "internship"];
const JOB_STATUSES = ["open", "closed", "draft"];

const jobFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  department: z.string().min(1, "Department is required"),
  type: z.enum(["full-time", "part-time", "contract", "internship"]),
  location: z.string().optional(),
  remote: z.boolean(),
  description: z.string().min(1, "Description is required"),
  requirements: z.string().optional(),
  salaryMin: z.coerce.number().int().min(0).optional().nullable(),
  salaryMax: z.coerce.number().int().min(0).optional().nullable(),
  status: z.enum(["open", "closed", "draft"]),
  featured: z.boolean(),
});
type JobFormValues = z.infer<typeof jobFormSchema>;

function toSlug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

const STATUS_BADGE: Record<string, string> = {
  open:   "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  closed: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  draft:  "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20",
};
const APP_STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  reviewing: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  accepted:  "bg-green-500/10 text-green-700 border-green-500/20",
  rejected:  "bg-red-500/10 text-red-700 border-red-500/20",
};

function JobForm({
  initialData,
  onSuccess,
  onCancel,
}: {
  initialData?: Job;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initialData;

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      department: initialData?.department ?? "Engineering",
      type: (initialData?.type as JobFormValues["type"]) ?? "full-time",
      location: initialData?.location ?? "Remote",
      remote: initialData?.remote ?? true,
      description: initialData?.description ?? "",
      requirements: initialData?.requirements ?? "",
      salaryMin: initialData?.salaryMin ?? null,
      salaryMax: initialData?.salaryMax ?? null,
      status: (initialData?.status as JobFormValues["status"]) ?? "open",
      featured: initialData?.featured ?? false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: JobFormValues) => {
      if (isEdit) {
        return apiRequest("PATCH", `/api/jobs/${initialData!.id}`, values);
      }
      return apiRequest("POST", "/api/jobs", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", "all"] });
      toast({ title: isEdit ? "Job updated" : "Job created" });
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  data-testid="input-job-title"
                  onChange={(e) => {
                    field.onChange(e);
                    if (!isEdit) form.setValue("slug", toSlug(e.target.value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="slug" render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-job-slug" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField control={form.control} name="department" render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-job-department">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-job-type">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-job-status">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Remote, New York, etc." data-testid="input-job-location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="remote" render={({ field }) => (
            <FormItem className="flex items-center gap-3 space-y-0 pt-7">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-job-remote" />
              </FormControl>
              <FormLabel className="cursor-pointer">Remote</FormLabel>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="salaryMin" render={({ field }) => (
            <FormItem>
              <FormLabel>Salary Min ($/yr)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="80000"
                  data-testid="input-job-salary-min"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="salaryMax" render={({ field }) => (
            <FormItem>
              <FormLabel>Salary Max ($/yr)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="120000"
                  data-testid="input-job-salary-max"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} rows={6} placeholder="Markdown supported: ## Heading, - bullet, **bold**" data-testid="textarea-job-description" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="requirements" render={({ field }) => (
          <FormItem>
            <FormLabel>Requirements</FormLabel>
            <FormControl>
              <Textarea {...field} rows={4} placeholder="- Must have X\n- Experience with Y" data-testid="textarea-job-requirements" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="featured" render={({ field }) => (
          <FormItem className="flex items-center gap-3 space-y-0">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-job-featured" />
            </FormControl>
            <div>
              <FormLabel className="cursor-pointer">Featured</FormLabel>
              <FormDescription className="text-xs">Highlight this position on the jobs board</FormDescription>
            </div>
          </FormItem>
        )} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-job">
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-job">
            {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Job"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ApplicationsPanel({ job, onClose }: { job: Job; onClose: () => void }) {
  const { toast } = useToast();

  const { data: applications, isLoading } = useQuery<JobApplication[]>({
    queryKey: ["/api/job-applications", job.id],
    queryFn: () => fetch(`/api/job-applications?jobId=${job.id}`).then((r) => r.json()),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/job-applications/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications", job.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", "all"] });
      toast({ title: "Application status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{job.title}</h3>
          <p className="text-sm text-muted-foreground">{applications?.length ?? 0} application{applications?.length !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose} data-testid="button-close-applications">
          Close
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : !applications?.length ? (
        <div className="text-center py-10 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No applications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <div
              key={app.id}
              className="border border-border rounded-xl p-4 space-y-2"
              data-testid={`application-row-${app.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{app.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${APP_STATUS_BADGE[app.status] ?? ""}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Mail className="h-3 w-3" />
                    <a href={`mailto:${app.email}`} className="hover:underline">{app.email}</a>
                  </div>
                  {app.phone && <p className="text-xs text-muted-foreground">📞 {app.phone}</p>}
                  {app.resumeUrl && (
                    <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                      <ExternalLink className="h-3 w-3" />
                      Portfolio / Resume
                    </a>
                  )}
                </div>
                <Select
                  value={app.status}
                  onValueChange={(status) => statusMutation.mutate({ id: app.id, status })}
                >
                  <SelectTrigger className="w-28 h-7 text-xs" data-testid={`select-app-status-${app.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {app.coverLetter && (
                <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs text-muted-foreground line-clamp-3">
                  {app.coverLetter}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                Applied {new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommandJobs() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [deleteJob, setDeleteJob] = useState<Job | null>(null);
  const [viewApplicationsFor, setViewApplicationsFor] = useState<Job | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs", "all"],
    queryFn: () => fetch("/api/jobs?all=true").then((r) => r.json()),
  });

  const { data: allApplications } = useQuery<JobApplication[]>({
    queryKey: ["/api/job-applications"],
    queryFn: () => fetch("/api/job-applications").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/jobs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", "all"] });
      toast({ title: "Job deleted" });
      setDeleteJob(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/jobs/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", "all"] });
      toast({ title: "Status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function appCountFor(jobId: number) {
    return (allApplications ?? []).filter((a) => a.jobId === jobId).length;
  }

  const filtered = (jobs ?? []).filter((j) => statusFilter === "all" || j.status === statusFilter);
  const total = jobs?.length ?? 0;
  const open = jobs?.filter((j) => j.status === "open").length ?? 0;
  const totalApps = allApplications?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{total} total · {open} open · {totalApps} applications</span>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-jobs-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => { setEditJob(null); setFormOpen(true); }}
            data-testid="button-add-job"
          >
            <Plus className="h-4 w-4" />
            Add Job
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-medium">No jobs {statusFilter !== "all" ? `with status "${statusFilter}"` : "yet"}</p>
          <p className="text-sm mt-1">Add your first job posting to get started</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
          {filtered.map((job) => {
            const appCount = appCountFor(job.id);
            return (
              <div
                key={job.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                data-testid={`job-row-${job.slug}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{job.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_BADGE[job.status] ?? ""}`}>
                      {job.status}
                    </span>
                    {job.featured && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {job.department} · {job.type} · {job.location || "Remote"}
                    {appCount > 0 && (
                      <span className="ml-2 text-primary font-medium">{appCount} application{appCount !== 1 ? "s" : ""}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {appCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setViewApplicationsFor(job)}
                      data-testid={`button-view-applications-${job.slug}`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {appCount}
                    </Button>
                  )}
                  <Select
                    value={job.status}
                    onValueChange={(status) => statusMutation.mutate({ id: job.id, status })}
                  >
                    <SelectTrigger className="w-24 h-7 text-xs" data-testid={`select-job-status-${job.slug}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <Link href={`/jobs/${job.slug}`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-view-job-${job.slug}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setEditJob(job); setFormOpen(true); }}
                    data-testid={`button-edit-job-${job.slug}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteJob(job)}
                    data-testid={`button-delete-job-${job.slug}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditJob(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editJob ? "Edit Job" : "Add Job"}</DialogTitle>
          </DialogHeader>
          <JobForm
            initialData={editJob ?? undefined}
            onSuccess={() => { setFormOpen(false); setEditJob(null); }}
            onCancel={() => { setFormOpen(false); setEditJob(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewApplicationsFor} onOpenChange={(o) => { if (!o) setViewApplicationsFor(null); }}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Applications</DialogTitle>
          </DialogHeader>
          {viewApplicationsFor && (
            <ApplicationsPanel
              job={viewApplicationsFor}
              onClose={() => setViewApplicationsFor(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteJob} onOpenChange={(o) => { if (!o) setDeleteJob(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteJob?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This job posting will be permanently removed. Existing applications will also be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteJob && deleteMutation.mutate(deleteJob.id)}
              data-testid="button-confirm-delete-job"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
