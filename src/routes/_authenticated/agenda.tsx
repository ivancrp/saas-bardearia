import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-companies";
import { fmtBRL, fmtTime, toLocalInputValue } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Pro = Database["public"]["Tables"]["professionals"]["Row"];

const HOUR_START = 8;
const HOUR_END = 21;
const PX_PER_HOUR = 64;

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
});

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function AgendaPage() {
  const { active } = useActiveCompany();
  const companyId = active?.company.id ?? null;
  const [day, setDay] = useState(startOfDay(new Date()));
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const dayEnd = useMemo(() => addDays(day, 1), [day]);

  const { data: pros = [] } = useQuery({
    queryKey: ["professionals", companyId, "active"],
    queryFn: async () => {
      if (!companyId) return [] as Pro[];
      const { data, error } = await supabase
        .from("professionals").select("*").eq("company_id", companyId).eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: appts = [] } = useQuery({
    queryKey: ["appointments", companyId, day.toISOString()],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*, service:services(name), professional:professionals(name,color), customer:customers(name)")
        .eq("company_id", companyId)
        .gte("start_at", day.toISOString())
        .lt("start_at", dayEnd.toISOString())
        .order("start_at");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
        <PageHeader
          title="Agenda"
          subtitle={day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setDay(addDays(day, -1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" onClick={() => setDay(startOfDay(new Date()))}>
                <CalendarIcon className="size-4" /> Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={() => setDay(addDays(day, 1))}>
                <ChevronRight className="size-4" />
              </Button>
              <Dialog open={openNew || !!editing} onOpenChange={(v) => { if (!v) { setOpenNew(false); setEditing(null); } }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setOpenNew(true)}>
                    <Plus className="size-4" /> Agendar
                  </Button>
                </DialogTrigger>
                <AppointmentDialog
                  companyId={companyId}
                  appointment={editing}
                  defaultDate={day}
                  onClose={() => { setOpenNew(false); setEditing(null); }}
                />
              </Dialog>
            </div>
          }
        />

        {pros.length === 0 ? (
          <EmptyState
            title="Cadastre profissionais primeiro"
            description="A agenda mostra a coluna de cada profissional ativo."
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <div className="flex min-w-fit">
              {/* Time column */}
              <div className="w-16 shrink-0 border-r border-border">
                <div className="h-12 border-b border-border" />
                {hours.map((h) => (
                  <div key={h} style={{ height: PX_PER_HOUR }} className="text-xs text-muted-foreground text-right pr-2 pt-1 border-b border-border/50">
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              {/* Professional columns */}
              {pros.map((pro) => {
                const proAppts = appts.filter((a) => a.professional_id === pro.id);
                return (
                  <div key={pro.id} className="flex-1 min-w-[180px] border-r border-border last:border-r-0 relative">
                    <div className="h-12 border-b border-border flex items-center gap-2 px-3 sticky top-0 bg-card z-10">
                      <span className="size-3 rounded-full" style={{ backgroundColor: pro.color }} />
                      <span className="font-medium text-sm truncate">{pro.name}</span>
                    </div>
                    <div className="relative" style={{ height: hours.length * PX_PER_HOUR }}>
                      {hours.map((_, i) => (
                        <div key={i} style={{ top: i * PX_PER_HOUR, height: PX_PER_HOUR }}
                          className="absolute inset-x-0 border-b border-border/50" />
                      ))}
                      {proAppts.map((a) => {
                        const start = new Date(a.start_at);
                        const end = new Date(a.end_at);
                        const top = ((start.getHours() + start.getMinutes() / 60) - HOUR_START) * PX_PER_HOUR;
                        const height = Math.max(((end.getTime() - start.getTime()) / 3_600_000) * PX_PER_HOUR, 24);
                        const anyA = a as any;
                        return (
                          <button
                            key={a.id}
                            onClick={() => setEditing(a)}
                            className="absolute left-1 right-1 rounded-lg p-2 text-left text-xs shadow-sm hover:shadow-md transition border border-background/20"
                            style={{ top, height, backgroundColor: pro.color, color: "#0a0a0a" }}
                          >
                            <div className="font-semibold truncate">{fmtTime(start)} · {anyA.service?.name ?? "Serviço"}</div>
                            <div className="truncate opacity-80">{anyA.customer?.name ?? a.customer_name ?? "Cliente"}</div>
                            {a.status !== "scheduled" && <div className="opacity-70 text-[10px] uppercase">{statusLabel(a.status)}</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function statusLabel(s: Appointment["status"]) {
  return { scheduled: "agendado", confirmed: "confirmado", done: "concluído", canceled: "cancelado", no_show: "falta" }[s];
}

function AppointmentDialog({
  companyId, appointment, defaultDate, onClose,
}: { companyId: string | null; appointment: Appointment | null; defaultDate: Date; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: pros = [] } = useQuery({
    queryKey: ["professionals", companyId, "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", companyId!).eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
  const { data: services = [] } = useQuery({
    queryKey: ["services", companyId, "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("company_id", companyId!).eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name,phone").eq("company_id", companyId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const initialStart = appointment ? new Date(appointment.start_at) : new Date(defaultDate.getTime() + 9 * 3600_000);

  const [form, setForm] = useState({
    professional_id: appointment?.professional_id ?? "",
    service_id: appointment?.service_id ?? "",
    customer_id: appointment?.customer_id ?? "",
    customer_name: appointment?.customer_name ?? "",
    customer_phone: appointment?.customer_phone ?? "",
    start_at: toLocalInputValue(initialStart),
    status: appointment?.status ?? "scheduled",
    notes: appointment?.notes ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa");
      if (!form.professional_id || !form.service_id) throw new Error("Profissional e serviço são obrigatórios");
      const service = services.find((s) => s.id === form.service_id);
      const pro = pros.find((p) => p.id === form.professional_id);
      if (!service || !pro) throw new Error("Dados inválidos");

      const start = new Date(form.start_at);
      const end = new Date(start.getTime() + service.duration_min * 60_000);
      const commissionPct = service.commission_pct ?? pro.commission_pct ?? 0;
      const commission_cents = Math.round((service.price_cents * Number(commissionPct)) / 100);

      const payload = {
        company_id: companyId,
        professional_id: form.professional_id,
        service_id: form.service_id,
        customer_id: form.customer_id || null,
        customer_name: form.customer_id ? null : (form.customer_name.trim() || null),
        customer_phone: form.customer_id ? null : (form.customer_phone.trim() || null),
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: form.status,
        price_cents: service.price_cents,
        commission_cents,
        notes: form.notes.trim() || null,
      };

      if (appointment) {
        const { error } = await supabase.from("appointments").update(payload).eq("id", appointment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(appointment ? "Agendamento atualizado" : "Agendamento criado");
      qc.invalidateQueries({ queryKey: ["appointments", companyId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!appointment) return;
      const { error } = await supabase.from("appointments").delete().eq("id", appointment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento removido");
      qc.invalidateQueries({ queryKey: ["appointments", companyId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedService = services.find((s) => s.id === form.service_id);

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{appointment ? "Editar agendamento" : "Novo agendamento"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>Profissional *</Label>
          <Select value={form.professional_id} onValueChange={(v) => setForm({ ...form, professional_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {pros.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Serviço *</Label>
          <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name} · {fmtBRL(s.price_cents)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Cliente cadastrado</Label>
          <Select value={form.customer_id || "_none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "_none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Avulso" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Avulso (preencher abaixo)</SelectItem>
              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!form.customer_id && (
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Nome do cliente</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Telefone</Label>
              <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Início *</Label>
            <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
                <SelectItem value="no_show">Não compareceu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {selectedService && (
          <p className="text-xs text-muted-foreground">
            Duração: {selectedService.duration_min}min · Valor: {fmtBRL(selectedService.price_cents)}
          </p>
        )}
        <div className="grid gap-1.5">
          <Label>Observações</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <DialogFooter className="flex-wrap justify-between gap-2">
        {appointment ? (
          <Button variant="ghost" className="text-destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
            Excluir
          </Button>
        ) : <span />}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
