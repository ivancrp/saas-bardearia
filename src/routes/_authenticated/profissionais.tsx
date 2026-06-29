import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ImageInput } from "@/components/image-input";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Database } from "@/integrations/supabase/types";

type Professional = Database["public"]["Tables"]["professionals"]["Row"];
type Service = Database["public"]["Tables"]["services"]["Row"];

const COLORS = ["#6DEAED", "#A78BFA", "#F472B6", "#FB923C", "#34D399", "#FBBF24", "#60A5FA", "#F87171"];

export const Route = createFileRoute("/_authenticated/profissionais")({
  component: ProfissionaisPage,
});

function ProfissionaisPage() {
  const { active } = useActiveCompany();
  const companyId = active?.company.id ?? null;
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Professional | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Professional | null>(null);

  const { data: pros = [], isLoading } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("professionals").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("professionals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profissional removido");
      qc.invalidateQueries({ queryKey: ["professionals", companyId] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
        <PageHeader
          title="Profissionais"
          subtitle="Equipe, comissões e serviços atendidos."
          actions={
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}>
                  <Plus className="size-4" /> Novo profissional
                </Button>
              </DialogTrigger>
              <ProDialog key={editing?.id ?? "new"} companyId={companyId} pro={editing} onClose={() => { setOpen(false); setEditing(null); }} />
            </Dialog>
          }
        />

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : pros.length === 0 ? (
          <EmptyState title="Nenhum profissional cadastrado" description="Adicione o primeiro profissional da equipe." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pros.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.name}
                      className="size-12 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="size-12 rounded-full flex items-center justify-center text-base font-semibold text-background shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{p.name}</p>
                      {!p.active && <Badge variant="secondary">inativo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {[p.phone, p.email].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Comissão: {Number(p.commission_pct)}%</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(p)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover profissional?</AlertDialogTitle>
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

function ProDialog({
  companyId, pro, onClose,
}: { companyId: string | null; pro: Professional | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: pro?.name ?? "",
    phone: pro?.phone ?? "",
    email: pro?.email ?? "",
    avatar_url: pro?.avatar_url ?? "",
    color: pro?.color ?? COLORS[0],
    commission_pct: pro?.commission_pct?.toString() ?? "0",
    active: pro?.active ?? true,
  });
  const [serviceIds, setServiceIds] = useState<Set<string>>(new Set());

  const { data: services = [] } = useQuery({
    queryKey: ["services", companyId, "active"],
    queryFn: async () => {
      if (!companyId) return [] as Service[];
      const { data, error } = await supabase
        .from("services").select("*").eq("company_id", companyId).eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  useQuery({
    queryKey: ["pro-services", pro?.id],
    queryFn: async () => {
      if (!pro?.id) return [];
      const { data, error } = await supabase
        .from("professional_services").select("service_id").eq("professional_id", pro.id);
      if (error) throw error;
      setServiceIds(new Set(data.map((d) => d.service_id)));
      return data;
    },
    enabled: !!pro?.id,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa");
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const payload = {
        company_id: companyId,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        color: form.color,
        commission_pct: Number(form.commission_pct) || 0,
        active: form.active,
      };
      let proId = pro?.id;
      if (pro) {
        const { error } = await supabase.from("professionals").update(payload).eq("id", pro.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("professionals").insert(payload).select("id").single();
        if (error) throw error;
        proId = data.id;
      }
      if (proId) {
        await supabase.from("professional_services").delete().eq("professional_id", proId);
        if (serviceIds.size > 0) {
          const rows = Array.from(serviceIds).map((sid) => ({ professional_id: proId!, service_id: sid }));
          const { error } = await supabase.from("professional_services").insert(rows);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success(pro ? "Profissional atualizado" : "Profissional cadastrado");
      qc.invalidateQueries({ queryKey: ["professionals", companyId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleService = (id: string) => {
    const next = new Set(serviceIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setServiceIds(next);
  };

  const allSelected = services.length > 0 && services.every((s) => serviceIds.has(s.id));
  const someSelected = services.some((s) => serviceIds.has(s.id));
  const toggleAll = () =>
    setServiceIds(allSelected ? new Set() : new Set(services.map((s) => s.id)));

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{pro ? "Editar profissional" : "Novo profissional"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <ImageInput
          label="Foto do profissional"
          kind="avatar"
          companyId={companyId ?? undefined}
          value={form.avatar_url}
          onChange={(url) => setForm({ ...form, avatar_url: url })}
          fallbackChar={form.name.charAt(0).toUpperCase() || "?"}
          previewClassName="size-20 rounded-full"
        />
        <div className="grid gap-1.5">
          <Label htmlFor="p-name">Nome *</Label>
          <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="p-phone">Telefone</Label>
            <Input id="p-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-email">Email</Label>
            <Input id="p-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Cor de exibição</Label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={`size-8 rounded-full border-2 transition ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-com">Comissão padrão (%)</Label>
          <Input id="p-com" type="number" min={0} max={100} step={0.5} value={form.commission_pct}
            onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} />
        </div>
        {services.length > 0 && (
          <div className="grid gap-1.5">
            <Label>Serviços atendidos</Label>
            <div className="grid gap-1.5 rounded-xl border border-border p-3 max-h-40 overflow-y-auto">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer border-b border-border pb-2 mb-1">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                  onChange={toggleAll}
                />
                Marcar todos
              </label>
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={serviceIds.has(s.id)} onChange={() => toggleService(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        )}
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
