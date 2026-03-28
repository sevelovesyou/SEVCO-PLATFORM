import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Plus,
  Trash2,
  Send,
  CheckCircle,
  Calculator,
  Folder,
  ArrowLeft,
  Pencil,
  ExternalLink,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import type { FinanceTransaction, FinanceProject, FinanceInvoice, Subscription } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const TRANSACTION_CATEGORIES = [
  "Server Costs",
  "Marketing",
  "Merch Sales",
  "Sponsorship",
  "Freelancer",
  "Software",
  "Equipment",
  "Revenue",
  "Consulting",
  "Operations",
  "Other",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMonthLabel(monthStr: string) {
  const [year, month] = monthStr.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

interface FinanceSummary {
  totalIncomeMonth: number;
  totalExpensesMonth: number;
  netBalance: number;
  outstandingInvoices: number;
  monthlyData: Array<{ month: string; income: number; expenses: number }>;
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  paid: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  overdue: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
};

function OverviewTab() {
  const { data: summary, isLoading } = useQuery<FinanceSummary>({
    queryKey: ["/api/finance/summary"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const chartData = (summary?.monthlyData || []).map(d => ({
    name: formatMonthLabel(d.month),
    Income: Math.round(d.income),
    Expenses: Math.round(d.expenses),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Income (Month)</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-income-month">{formatCurrency(summary?.totalIncomeMonth || 0)}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Expenses (Month)</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-expenses-month">{formatCurrency(summary?.totalExpensesMonth || 0)}</p>
              </div>
              <TrendingDown className="h-5 w-5 text-red-500 mt-0.5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Net Balance</p>
                <p className={`text-2xl font-bold mt-1 ${(summary?.netBalance || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-net-balance">
                  {formatCurrency(summary?.netBalance || 0)}
                </p>
              </div>
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Outstanding Invoices</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-outstanding-invoices">{formatCurrency(summary?.outstandingInvoices || 0)}</p>
              </div>
              <FileText className="h-5 w-5 text-yellow-500 mt-0.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Income vs Expenses (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transaction data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Category required"),
  description: z.string().min(1, "Description required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date required"),
  projectId: z.coerce.number().nullable().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

function TransactionForm({ onSuccess, projects }: { onSuccess: () => void; projects: FinanceProject[] }) {
  const { toast } = useToast();
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "income",
      category: "",
      description: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      projectId: null,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: TransactionFormValues) =>
      apiRequest("POST", "/api/finance/transactions", {
        ...data,
        projectId: data.projectId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      toast({ title: "Transaction added" });
      form.reset();
      onSuccess();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger data-testid="select-transaction-type"><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger data-testid="select-transaction-category"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
              <SelectContent>
                {TRANSACTION_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Input {...field} data-testid="input-transaction-description" placeholder="e.g. Monthly AWS bill" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount ($)</FormLabel>
              <FormControl><Input {...field} type="number" step="0.01" data-testid="input-transaction-amount" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl><Input {...field} type="date" data-testid="input-transaction-date" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        {projects.length > 0 && (
          <FormField control={form.control} name="projectId" render={({ field }) => (
            <FormItem>
              <FormLabel>Link to Project (optional)</FormLabel>
              <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} defaultValue="none">
                <FormControl><SelectTrigger data-testid="select-transaction-project"><SelectValue placeholder="No project" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}
        <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-transaction" className="w-full">
          {mutation.isPending ? "Adding..." : "Add Transaction"}
        </Button>
      </form>
    </Form>
  );
}

function TransactionsTab() {
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const { toast } = useToast();

  const { data: transactions = [], isLoading } = useQuery<FinanceTransaction[]>({
    queryKey: ["/api/finance/transactions"],
  });

  const { data: projects = [] } = useQuery<FinanceProject[]>({
    queryKey: ["/api/finance/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/finance/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      toast({ title: "Transaction deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filtered = transactions.filter(t => typeFilter === "all" || t.type === typeFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {["all", "income", "expense"].map(f => (
            <Button
              key={f}
              variant={typeFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(f)}
              data-testid={`button-filter-${f}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <div className="ml-auto">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="sm" data-testid="button-add-transaction">
                <Plus className="h-4 w-4 mr-1" /> Add Transaction
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Add Transaction</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <TransactionForm projects={projects} onSuccess={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No transactions found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(tx => (
                <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(tx.date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={tx.type === "income" ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"}>
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{tx.category}</TableCell>
                  <TableCell className="text-sm">{tx.description}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    <span className={tx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                            aria-label="Delete"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate(tx.id)}
                          data-testid={`button-delete-transaction-${tx.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().positive(),
});

const invoiceFormSchema = z.object({
  clientName: z.string().min(1, "Client name required"),
  clientEmail: z.string().email("Valid email required").or(z.literal("")).optional(),
  dueDate: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item required"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

function InvoiceForm({ invoice, onSuccess }: { invoice?: FinanceInvoice; onSuccess: () => void }) {
  const { toast } = useToast();
  const isEdit = !!invoice;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientName: invoice?.clientName || "",
      clientEmail: invoice?.clientEmail || "",
      dueDate: invoice?.dueDate || "",
      status: (invoice?.status as any) || "draft",
      lineItems: (invoice?.lineItems as any[]) || [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lineItems" });

  const lineItems = form.watch("lineItems");
  const total = lineItems.reduce((s, item) => s + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);

  const mutation = useMutation({
    mutationFn: (data: InvoiceFormValues) => {
      const body = {
        ...data,
        totalAmount: total,
        lineItems: data.lineItems,
        clientEmail: data.clientEmail || null,
        dueDate: data.dueDate || null,
      };
      return isEdit
        ? apiRequest("PATCH", `/api/finance/invoices/${invoice!.id}`, body)
        : apiRequest("POST", "/api/finance/invoices", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      toast({ title: isEdit ? "Invoice updated" : "Invoice created" });
      onSuccess();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="clientName" render={({ field }) => (
            <FormItem>
              <FormLabel>Client Name</FormLabel>
              <FormControl><Input {...field} data-testid="input-invoice-client-name" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="clientEmail" render={({ field }) => (
            <FormItem>
              <FormLabel>Client Email</FormLabel>
              <FormControl><Input {...field} type="email" data-testid="input-invoice-client-email" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date (optional)</FormLabel>
              <FormControl><Input {...field} type="date" data-testid="input-invoice-due-date" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger data-testid="select-invoice-status"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Line Items</p>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-start">
                <FormField control={form.control} name={`lineItems.${index}.description`} render={({ field }) => (
                  <FormItem>
                    <FormControl><Input {...field} placeholder="Description" data-testid={`input-line-desc-${index}`} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => (
                  <FormItem>
                    <FormControl><Input {...field} type="number" min="1" placeholder="Qty" data-testid={`input-line-qty-${index}`} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field }) => (
                  <FormItem>
                    <FormControl><Input {...field} type="number" step="0.01" placeholder="Unit $" data-testid={`input-line-price-${index}`} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-8 mt-0 text-muted-foreground hover:text-destructive" onClick={() => remove(index)} data-testid={`button-remove-line-${index}`} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove line</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })} data-testid="button-add-line-item">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Line Item
          </Button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-lg font-bold">{formatCurrency(total)}</span>
        </div>

        <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-invoice" className="w-full">
          {mutation.isPending ? "Saving..." : isEdit ? "Update Invoice" : "Create Invoice"}
        </Button>
      </form>
    </Form>
  );
}

function InvoicesTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<FinanceInvoice | null>(null);
  const { toast } = useToast();

  const { data: invoices = [], isLoading } = useQuery<FinanceInvoice[]>({
    queryKey: ["/api/finance/invoices"],
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/finance/invoices/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      toast({ title: "Invoice sent" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const paidMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/finance/invoices/${id}/mark-paid`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      toast({ title: "Invoice marked as paid" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/finance/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      toast({ title: "Invoice deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button size="sm" data-testid="button-create-invoice">
              <Plus className="h-4 w-4 mr-1" /> Create Invoice
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Create Invoice</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <InvoiceForm onSuccess={() => setCreateOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No invoices yet.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv => (
                <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                  <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{inv.clientName}</p>
                      {inv.clientEmail && <p className="text-xs text-muted-foreground">{inv.clientEmail}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={INVOICE_STATUS_COLORS[inv.status] || ""}>{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inv.dueDate ? formatDate(inv.dueDate) : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                              aria-label="Edit"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditInvoice(inv)}
                            data-testid={`button-edit-invoice-${inv.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      {inv.status !== "paid" && inv.clientEmail && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                                aria-label="Send"
                              className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                              onClick={() => sendMutation.mutate(inv.id)}
                              disabled={sendMutation.isPending}
                              data-testid={`button-send-invoice-${inv.id}`}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Send email</TooltipContent>
                        </Tooltip>
                      )}
                      {inv.status !== "paid" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                                aria-label="Action"
                              className="h-7 w-7 text-muted-foreground hover:text-green-600"
                              onClick={() => paidMutation.mutate(inv.id)}
                              disabled={paidMutation.isPending}
                              data-testid={`button-paid-invoice-${inv.id}`}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mark as paid</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                              aria-label="Delete"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMutation.mutate(inv.id)}
                            data-testid={`button-delete-invoice-${inv.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={!!editInvoice} onOpenChange={(open) => { if (!open) setEditInvoice(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Invoice</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {editInvoice && <InvoiceForm invoice={editInvoice} onSuccess={() => setEditInvoice(null)} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

const projectFormSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  budget: z.coerce.number().positive("Budget must be positive"),
  status: z.enum(["active", "completed", "on_hold"]),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

function ProjectForm({ project, onSuccess }: { project?: FinanceProject; onSuccess: () => void }) {
  const { toast } = useToast();
  const isEdit = !!project;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      budget: project?.budget || 0,
      status: (project?.status as any) || "active",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ProjectFormValues) =>
      isEdit
        ? apiRequest("PATCH", `/api/finance/projects/${project!.id}`, data)
        : apiRequest("POST", "/api/finance/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/projects"] });
      toast({ title: isEdit ? "Project updated" : "Project created" });
      onSuccess();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Project Name</FormLabel>
            <FormControl><Input {...field} data-testid="input-project-name" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description (optional)</FormLabel>
            <FormControl><Textarea {...field} data-testid="input-project-description" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="budget" render={({ field }) => (
            <FormItem>
              <FormLabel>Budget ($)</FormLabel>
              <FormControl><Input {...field} type="number" step="0.01" data-testid="input-project-budget" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger data-testid="select-project-status"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-project" className="w-full">
          {mutation.isPending ? "Saving..." : isEdit ? "Update Project" : "Create Project"}
        </Button>
      </form>
    </Form>
  );
}

function ProjectsTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<FinanceProject | null>(null);
  const [viewProject, setViewProject] = useState<FinanceProject | null>(null);
  const { toast } = useToast();

  const { data: projects = [], isLoading } = useQuery<FinanceProject[]>({
    queryKey: ["/api/finance/projects"],
  });

  const { data: allTransactions = [] } = useQuery<FinanceTransaction[]>({
    queryKey: ["/api/finance/transactions"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/finance/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      toast({ title: "Project deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function getSpent(projectId: number) {
    return allTransactions
      .filter(t => t.projectId === projectId && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
  }

  if (viewProject) {
    const projectTx = allTransactions.filter(t => t.projectId === viewProject.id);
    const spent = getSpent(viewProject.id);
    const remaining = viewProject.budget - spent;

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setViewProject(null)} data-testid="button-back-project">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{viewProject.name}</h2>
            {viewProject.description && <p className="text-sm text-muted-foreground mt-1">{viewProject.description}</p>}
          </div>
          <Badge variant="outline" className={PROJECT_STATUS_COLORS[viewProject.status] || ""}>{viewProject.status.replace("_", " ")}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Budget</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(viewProject.budget)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Spent</p>
            <p className="text-xl font-bold mt-1 text-red-600 dark:text-red-400">{formatCurrency(spent)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
            <p className={`text-xl font-bold mt-1 ${remaining >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(remaining)}</p>
          </CardContent></Card>
        </div>
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectTx.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No transactions linked to this project.</TableCell></TableRow>
              ) : projectTx.map(tx => (
                <TableRow key={tx.id} data-testid={`row-project-tx-${tx.id}`}>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(tx.date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={tx.type === "income" ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"}>
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{tx.category}</TableCell>
                  <TableCell className="text-sm">{tx.description}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    <span className={tx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button size="sm" data-testid="button-new-project">
              <Plus className="h-4 w-4 mr-1" /> New Project
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>New Finance Project</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <ProjectForm onSuccess={() => setCreateOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No finance projects yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(project => {
            const spent = getSpent(project.id);
            const remaining = project.budget - spent;
            const pct = project.budget > 0 ? Math.min((spent / project.budget) * 100, 100) : 0;

            return (
              <Card key={project.id} data-testid={`card-project-${project.id}`} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => setViewProject(project)}
                        className="text-left"
                        data-testid={`button-view-project-${project.id}`}
                      >
                        <h3 className="font-semibold truncate hover:underline">{project.name}</h3>
                        {project.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Badge variant="outline" className={`text-xs ${PROJECT_STATUS_COLORS[project.status] || ""}`}>
                        {project.status.replace("_", " ")}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setEditProject(project)} data-testid={`button-edit-project-${project.id}`} aria-label="Edit">
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(project.id)} data-testid={`button-delete-project-${project.id}`} aria-label="Delete">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                    <div>
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-semibold">{formatCurrency(project.budget)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Spent</p>
                      <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(spent)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining</p>
                      <p className={`font-semibold ${remaining >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(remaining)}</p>
                    </div>
                  </div>

                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${pct >= 100 ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                      data-testid={`bar-project-budget-${project.id}`}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!editProject} onOpenChange={(open) => { if (!open) setEditProject(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Project</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {editProject && <ProjectForm project={editProject} onSuccess={() => setEditProject(null)} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

type CalcOp = "+" | "-" | "×" | "÷" | null;

function CalculatorTab() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [op, setOp] = useState<CalcOp>(null);
  const [fresh, setFresh] = useState(false);

  function pressDigit(digit: string) {
    if (fresh) {
      setDisplay(digit === "." ? "0." : digit);
      setFresh(false);
    } else {
      if (digit === "." && display.includes(".")) return;
      setDisplay(display === "0" && digit !== "." ? digit : display + digit);
    }
  }

  function pressOp(newOp: CalcOp) {
    const current = parseFloat(display);
    if (stored !== null && op && !fresh) {
      const result = compute(stored, current, op);
      setDisplay(formatResult(result));
      setStored(result);
    } else {
      setStored(current);
    }
    setOp(newOp);
    setFresh(true);
  }

  function compute(a: number, b: number, operation: CalcOp): number {
    switch (operation) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      default: return b;
    }
  }

  function formatResult(n: number): string {
    if (isNaN(n) || !isFinite(n)) return "Error";
    const s = String(Math.round(n * 1e10) / 1e10);
    return s.length > 12 ? n.toPrecision(8) : s;
  }

  function pressEquals() {
    if (stored === null || op === null) return;
    const current = parseFloat(display);
    const result = compute(stored, current, op);
    setDisplay(formatResult(result));
    setStored(null);
    setOp(null);
    setFresh(true);
  }

  function pressClear() {
    setDisplay("0");
    setStored(null);
    setOp(null);
    setFresh(false);
  }

  function pressPlusMinus() {
    setDisplay(String(parseFloat(display) * -1));
  }

  function pressPercent() {
    setDisplay(String(parseFloat(display) / 100));
  }

  const btnBase = "flex items-center justify-center rounded-xl text-base font-medium h-14 w-full transition-all active:scale-95 select-none cursor-pointer";

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-xs">
        <div className="bg-muted/50 rounded-2xl border p-1 mb-1">
          <div className="text-right px-4 py-4">
            <p className="text-xs text-muted-foreground h-5">{stored !== null ? `${stored} ${op || ""}` : ""}</p>
            <p className="text-4xl font-light tabular-nums truncate" data-testid="text-calc-display">{display}</p>
          </div>

          <div className="grid grid-cols-4 gap-1 p-1">
            <button className={`${btnBase} bg-muted text-foreground hover:bg-muted/70`} onClick={pressClear} data-testid="button-calc-clear">AC</button>
            <button className={`${btnBase} bg-muted text-foreground hover:bg-muted/70`} onClick={pressPlusMinus} data-testid="button-calc-plusminus">+/-</button>
            <button className={`${btnBase} bg-muted text-foreground hover:bg-muted/70`} onClick={pressPercent} data-testid="button-calc-percent">%</button>
            <button className={`${btnBase} ${op === "÷" ? "bg-foreground text-background" : "bg-primary text-primary-foreground"} hover:opacity-90`} onClick={() => pressOp("÷")} data-testid="button-calc-div">÷</button>

            {["7","8","9"].map(d => (
              <button key={d} className={`${btnBase} bg-background border hover:bg-muted`} onClick={() => pressDigit(d)} data-testid={`button-calc-${d}`}>{d}</button>
            ))}
            <button className={`${btnBase} ${op === "×" ? "bg-foreground text-background" : "bg-primary text-primary-foreground"} hover:opacity-90`} onClick={() => pressOp("×")} data-testid="button-calc-mul">×</button>

            {["4","5","6"].map(d => (
              <button key={d} className={`${btnBase} bg-background border hover:bg-muted`} onClick={() => pressDigit(d)} data-testid={`button-calc-${d}`}>{d}</button>
            ))}
            <button className={`${btnBase} ${op === "-" ? "bg-foreground text-background" : "bg-primary text-primary-foreground"} hover:opacity-90`} onClick={() => pressOp("-")} data-testid="button-calc-sub">-</button>

            {["1","2","3"].map(d => (
              <button key={d} className={`${btnBase} bg-background border hover:bg-muted`} onClick={() => pressDigit(d)} data-testid={`button-calc-${d}`}>{d}</button>
            ))}
            <button className={`${btnBase} ${op === "+" ? "bg-foreground text-background" : "bg-primary text-primary-foreground"} hover:opacity-90`} onClick={() => pressOp("+")} data-testid="button-calc-add">+</button>

            <button className={`${btnBase} col-span-2 bg-background border hover:bg-muted`} onClick={() => pressDigit("0")} data-testid="button-calc-0">0</button>
            <button className={`${btnBase} bg-background border hover:bg-muted`} onClick={() => pressDigit(".")} data-testid="button-calc-dot">.</button>
            <button className={`${btnBase} bg-primary text-primary-foreground hover:opacity-90`} onClick={pressEquals} data-testid="button-calc-equals">=</button>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
          <Calculator className="h-3 w-3" /> Quick finance calculator
        </p>
      </div>
    </div>
  );
}

const SUBSCRIPTION_CATEGORIES = ["software", "hosting", "marketing", "design", "communication", "finance", "productivity", "other"];
const BILLING_CYCLES = ["monthly", "annual", "quarterly", "weekly"];
const SUBSCRIPTION_STATUSES = ["active", "paused", "cancelled"];

type SubForm = {
  name: string;
  category: string;
  amount: number;
  billingCycle: string;
  status: string;
  nextBillingDate: string;
  url: string;
  notes: string;
};

const defaultSubForm = (): SubForm => ({
  name: "", category: "software", amount: 0, billingCycle: "monthly",
  status: "active", nextBillingDate: "", url: "", notes: "",
});

function SubscriptionsTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [form, setForm] = useState<SubForm>(defaultSubForm());

  const { data: subs = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const createMutation = useMutation({
    mutationFn: (data: SubForm) => apiRequest("POST", "/api/subscriptions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setDialogOpen(false);
      toast({ description: "Subscription added." });
    },
    onError: (e: any) => toast({ description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SubForm> }) =>
      apiRequest("PATCH", `/api/subscriptions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setDialogOpen(false);
      toast({ description: "Subscription updated." });
    },
    onError: (e: any) => toast({ description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/subscriptions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ description: "Subscription removed." });
    },
    onError: (e: any) => toast({ description: e.message, variant: "destructive" }),
  });

  function openAdd() {
    setEditing(null);
    setForm(defaultSubForm());
    setDialogOpen(true);
  }

  function openEdit(sub: Subscription) {
    setEditing(sub);
    setForm({
      name: sub.name,
      category: sub.category,
      amount: sub.amount,
      billingCycle: sub.billingCycle,
      status: sub.status,
      nextBillingDate: sub.nextBillingDate ?? "",
      url: sub.url ?? "",
      notes: sub.notes ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function daysUntil(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null;
    const d = new Date(dateStr + "T00:00:00");
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  }

  function relativeDueDate(dateStr: string | null | undefined): React.ReactNode {
    const days = daysUntil(dateStr);
    if (days === null) return <span className="text-muted-foreground">—</span>;
    if (days < 0) return <span className="text-red-600 dark:text-red-400 font-medium">{Math.abs(days)} {Math.abs(days) === 1 ? "day" : "days"} overdue</span>;
    if (days === 0) return <span className="text-amber-600 dark:text-amber-400 font-medium">Today</span>;
    if (days <= 7) return <span className="text-amber-600 dark:text-amber-400 font-medium">In {days} {days === 1 ? "day" : "days"}</span>;
    return <span className="text-muted-foreground">In {days} days</span>;
  }

  const totalMonthly = subs
    .filter((s) => s.status === "active")
    .reduce((sum, s) => {
      const amt = s.amount ?? 0;
      if (s.billingCycle === "annual") return sum + amt / 12;
      if (s.billingCycle === "quarterly") return sum + amt / 3;
      if (s.billingCycle === "weekly") return sum + amt * 4.33;
      return sum + amt;
    }, 0);

  const activeSubs = subs.filter((s) => s.status === "active").length;
  const overdueSubs = subs.filter((s) => s.status === "active" && (daysUntil(s.nextBillingDate) ?? 1) < 0).length;

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Monthly Cost</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-subscription-monthly-total">{formatCurrency(totalMonthly)}</p>
              </div>
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold mt-1" data-testid="text-subscription-active-count">{activeSubs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Overdue</p>
            <p className={`text-2xl font-bold mt-1 ${overdueSubs > 0 ? "text-red-600 dark:text-red-400" : ""}`} data-testid="text-subscription-overdue-count">{overdueSubs}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end">
        <Button size="sm" className="gap-1.5" onClick={openAdd} data-testid="button-add-subscription">
          <Plus className="h-3.5 w-3.5" /> Add Subscription
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Next Bill</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7}><div className="h-8 bg-muted/40 rounded animate-pulse" /></TableCell></TableRow>
            )}
            {!isLoading && subs.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">No subscriptions yet. Click "Add Subscription" to get started.</TableCell></TableRow>
            )}
            {subs.map((sub) => {
              const days = daysUntil(sub.nextBillingDate);
              const isOverdue = sub.status === "active" && days !== null && days < 0;
              return (
              <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`} className={isOverdue ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{sub.name}</span>
                    {sub.url && (
                      <a href={sub.url} target="_blank" rel="noopener noreferrer" data-testid={`link-subscription-url-${sub.id}`}>
                        <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell className="capitalize text-sm text-muted-foreground">{sub.category}</TableCell>
                <TableCell className="text-sm font-mono">${(sub.amount ?? 0).toFixed(2)}</TableCell>
                <TableCell className="capitalize text-sm text-muted-foreground">{sub.billingCycle}</TableCell>
                <TableCell className="text-sm">{relativeDueDate(sub.nextBillingDate)}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${statusColor[sub.status] ?? statusColor.paused}`}>
                    {sub.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(sub)} data-testid={`button-edit-subscription-${sub.id}`} aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(sub.id)} data-testid={`button-delete-subscription-${sub.id}`} aria-label="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. GitHub, Figma, Notion"
                data-testid="input-subscription-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="select-subscription-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-subscription-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Amount ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  data-testid="input-subscription-amount"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Billing Cycle</label>
                <Select value={form.billingCycle} onValueChange={(v) => setForm((f) => ({ ...f, billingCycle: v }))}>
                  <SelectTrigger data-testid="select-subscription-cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Next Billing Date</label>
              <Input
                type="date"
                value={form.nextBillingDate}
                onChange={(e) => setForm((f) => ({ ...f, nextBillingDate: e.target.value }))}
                data-testid="input-subscription-next-billing"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL</label>
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
                data-testid="input-subscription-url"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                data-testid="input-subscription-notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || !form.name.trim()}
              data-testid="button-save-subscription"
            >
              {editing ? "Save Changes" : "Add Subscription"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CommandFinance() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview">
        <TabsList className="h-9">
          <TabsTrigger value="overview" data-testid="tab-finance-overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-finance-transactions">Transactions</TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-finance-invoices">Invoices</TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-finance-projects">Projects</TabsTrigger>
          <TabsTrigger value="subscriptions" data-testid="tab-finance-subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="calculator" data-testid="tab-finance-calculator">Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="transactions" className="mt-6">
          <TransactionsTab />
        </TabsContent>
        <TabsContent value="invoices" className="mt-6">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="projects" className="mt-6">
          <ProjectsTab />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-6">
          <SubscriptionsTab />
        </TabsContent>
        <TabsContent value="calculator" className="mt-6">
          <CalculatorTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
