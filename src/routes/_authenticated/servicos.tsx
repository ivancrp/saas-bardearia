import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-companies";
import { fmtBRL, fmtDuration, parseBRLToCents } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Service = Database["public"]["Tables"]["services"]["Row"];

export const Route = createFileRoute("/_authenticated/servicos")({
  component: ServicosPage,
});

function ServicosPage() {
  const { active } = useActiveCompany();
  const companyId = active?.company.id ?? null;
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Service | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("services").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço removido");
      qc.invalidateQueries({ queryKey: ["services", companyId] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
        <PageHeader
          title="Serviços"
          subtitle="Catálogo de serviços, duração e preços."
          actions={
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}>
                  <Plus className="size-4" /> Novo serviço
                </Button>
              </DialogTrigger>
              <ServiceDialog companyId={companyId} service={editing} onClose={() => { setOpen(false); setEditing(null); }} />
            </Dialog>
          }
        />

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : services.length === 0 ? (
          <EmptyState title="Nenhum serviço cadastrado" description="Adicione o primeiro serviço do seu catálogo." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{fmtDuration(s.duration_min)}</p>
                  </div>
                  {!s.active && <Badge variant="secondary">inativo</Badge>}
                </div>
                {s.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{s.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold">{fmtBRL(s.price_cents)}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(s)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover serviço?</AlertDialogTitle>
              <AlertDialogDescription>{deleting?.name} será removido.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleting && remove.mutate(deleting.id)}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}

function ServiceDialog({
  companyId, service, onClose,
}: { companyId: string | null; service: Service | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: service?.name ?? "",
    description: service?.description ?? "",
    duration_min: service?.duration_min ?? 30,
    price: service ? (service.price_cents / 100).toFixed(2).replace(".", ",") : "",
    commission_pct: service?.commission_pct?.toString() ?? "",
    active: service?.active ?? true,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa");
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const payload = {
        company_id: companyId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        duration_min: Number(form.duration_min) || 30,
        price_cents: parseBRLToCents(form.price),
        commission_pct: form.commission_pct ? Number(form.commission_pct) : null,
        active: form.active,
      };
      if (service) {
        const { error } = await supabase.from("services").update(payload).eq("id", service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(service ? "Serviço atualizado" : "Serviço criado");
      qc.invalidateQueries({ queryKey: ["services", companyId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{service ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="s-name">Nome *</Label>
          <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="s-desc">Descrição</Label>
          <Textarea id="s-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="s-dur">Duração (min)</Label>
            <Input id="s-dur" type="number" min={5} step={5} value={form.duration_min}
              onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-price">Preço (R$)</Label>
            <Input id="s-price" inputMode="decimal" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-com">Comissão (%)</Label>
            <Input id="s-com" type="number" min={0} max={100} step={0.5} value={form.commission_pct}
              onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center justify-between rounded-xl border border-border p-3">
          <span className="text-sm">Ativo</span>
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        </label>
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
