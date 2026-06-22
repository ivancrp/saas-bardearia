import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-companies";
import { fmtBRL, fmtDate, parseBRLToCents, toLocalInputValue } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Entry = Database["public"]["Tables"]["financial_entries"]["Row"];

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinanceiroPage,
});

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 1); }

function FinanceiroPage() {
  const { active } = useActiveCompany();
  const companyId = active?.company.id ?? null;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const month = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() + monthOffset); return startOfMonth(d);
  }, [monthOffset]);
  const next = useMemo(() => endOfMonth(month), [month]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["financial_entries", companyId, month.toISOString()],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("financial_entries")
        .select("*, professional:professionals(name)")
        .eq("company_id", companyId)
        .gte("paid_at", month.toISOString())
        .lt("paid_at", next.toISOString())
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const totals = useMemo(() => {
    const t = { income: 0, expense: 0, commission: 0 };
    for (const e of entries) {
      if (e.kind === "income") t.income += e.amount_cents;
      else if (e.kind === "expense") t.expense += e.amount_cents;
      else t.commission += e.amount_cents;
    }
    return { ...t, net: t.income - t.expense - t.commission };
  }, [entries]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento removido");
      qc.invalidateQueries({ queryKey: ["financial_entries", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
        <PageHeader
          title="Financeiro"
          subtitle={month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMonthOffset(monthOffset - 1)}>‹ Mês anterior</Button>
              <Button variant="outline" onClick={() => setMonthOffset(0)} disabled={monthOffset === 0}>Atual</Button>
              <Button variant="outline" onClick={() => setMonthOffset(monthOffset + 1)}>Próximo ›</Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="size-4" /> Novo lançamento</Button>
                </DialogTrigger>
                <EntryDialog companyId={companyId} onClose={() => setOpen(false)} />
              </Dialog>
            </div>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard icon={<TrendingUp className="size-5" />} label="Receitas" value={fmtBRL(totals.income)} tone="positive" />
          <StatCard icon={<TrendingDown className="size-5" />} label="Despesas" value={fmtBRL(totals.expense)} tone="negative" />
          <StatCard icon={<Wallet className="size-5" />} label="Comissões" value={fmtBRL(totals.commission)} />
          <StatCard icon={<Wallet className="size-5" />} label="Líquido" value={fmtBRL(totals.net)} tone={totals.net >= 0 ? "positive" : "negative"} />
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : entries.length === 0 ? (
          <EmptyState title="Nenhum lançamento neste mês" description="Adicione receitas, despesas ou comissões." />
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <ul className="divide-y divide-border">
              {entries.map((e) => {
                const anyE = e as any;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.description || kindLabel(e.kind)}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(e.paid_at)} · {kindLabel(e.kind)}
                        {anyE.professional?.name ? ` · ${anyE.professional.name}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${e.kind === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                        {e.kind === "income" ? "+" : "−"} {fmtBRL(e.amount_cents)}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(e.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function kindLabel(k: Entry["kind"]) {
  return { income: "Receita", expense: "Despesa", commission: "Comissão" }[k];
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "positive" | "negative" }) {
  const color = tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-rose-400" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">{icon}{label}</div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EntryDialog({ companyId, onClose }: { companyId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    kind: "income" as Entry["kind"],
    amount: "",
    description: "",
    paid_at: toLocalInputValue(new Date()),
    professional_id: "",
  });
  const { data: pros = [] } = useQuery({
    queryKey: ["professionals", companyId, "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("id,name").eq("company_id", companyId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa");
      const amount_cents = parseBRLToCents(form.amount);
      if (!amount_cents) throw new Error("Valor obrigatório");
      const { error } = await supabase.from("financial_entries").insert({
        company_id: companyId,
        kind: form.kind,
        amount_cents,
        description: form.description.trim() || null,
        paid_at: new Date(form.paid_at).toISOString(),
        professional_id: form.professional_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento criado");
      qc.invalidateQueries({ queryKey: ["financial_entries", companyId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>Tipo</Label>
          <Select value={form.kind} onValueChange={(v: any) => setForm({ ...form, kind: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="commission">Comissão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Valor (R$) *</Label>
            <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Data</Label>
            <Input type="datetime-local" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Descrição</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        {form.kind === "commission" && pros.length > 0 && (
          <div className="grid gap-1.5">
            <Label>Profissional</Label>
            <Select value={form.professional_id} onValueChange={(v) => setForm({ ...form, professional_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {pros.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
