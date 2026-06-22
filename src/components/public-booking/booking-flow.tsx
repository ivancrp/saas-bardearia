import type { Session } from "@supabase/supabase-js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Calendar, Check, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fmtBRL, fmtDateTime, fmtDuration } from "@/lib/format";
import { buildAvailableSlots } from "./slots";
import type { BrandTheme, PublicCompany, PublicProfessional, PublicService } from "./types";

type BookingFlowProps = {
  company: PublicCompany;
  session: Session | null;
  service: PublicService;
  theme: BrandTheme;
  onBack: () => void;
};

type BookingStep = "professional" | "schedule" | "confirm";

const STEPS: { id: BookingStep; label: string }[] = [
  { id: "professional", label: "Profissional" },
  { id: "schedule", label: "Horário" },
  { id: "confirm", label: "Confirmar" },
];

export function BookingFlow({ company, session, service, theme, onBack }: BookingFlowProps) {
  const [step, setStep] = useState<BookingStep>("professional");
  const [proId, setProId] = useState("");
  const [slot, setSlot] = useState("");
  const [done, setDone] = useState(false);

  const userMeta = session?.user?.user_metadata ?? {};
  const userName = userMeta.full_name || userMeta.name || session?.user?.email?.split("@")[0] || "";
  const userPhone = userMeta.phone || "";
  const userEmail = session?.user?.email || "";

  const { data: pros = [] } = useQuery({
    queryKey: ["pub-pros", company.id, service.id],
    queryFn: async () => {
      const { data: links } = await supabase
        .from("professional_services")
        .select("professional_id")
        .eq("service_id", service.id);
      const ids = (links ?? []).map((l) => l.professional_id);
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, color, commission_pct, active")
        .eq("company_id", company.id)
        .eq("active", true)
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
        .order("name");
      if (error) throw error;
      return data as PublicProfessional[];
    },
  });

  const selectedPro = pros.find((p) => p.id === proId);
  const slotsByDay = useMemo(() => buildAvailableSlots(), []);
  const selectedSlot = slotsByDay.flatMap((d) => d.slots).find((s) => s.iso === slot);

  const book = useMutation({
    mutationFn: async () => {
      if (!selectedPro) throw new Error("Selecione o profissional");
      if (!slot) throw new Error("Escolha um horário");
      const { error } = await supabase.rpc("book_public_appointment", {
        p_company_id: company.id,
        p_service_id: service.id,
        p_professional_id: selectedPro.id,
        p_start_at: slot,
        p_name: userName,
        p_phone: userPhone || "",
        p_email: userEmail || "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento confirmado!");
      setDone(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (done) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-card text-center">
        <div
          className="size-20 rounded-full flex items-center justify-center mx-auto mb-5 text-white shadow-lg"
          style={{ background: theme.gradient }}
        >
          <Check className="size-10" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Agendamento confirmado!</h2>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          <strong className="text-foreground">{service.name}</strong>
          <br />
          com {selectedPro?.name}
          <br />
          {slot && fmtDateTime(slot)}
        </p>
        <Button variant="outline" className="mt-8" onClick={onBack}>
          Voltar aos serviços
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 md:p-7 shadow-card">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Voltar aos serviços
      </button>

      <ServiceSummary service={service} theme={theme} />

      <StepIndicator current={step} theme={theme} />

      {step === "professional" && (
        <ProfessionalStep
          pros={pros}
          proId={proId}
          theme={theme}
          onSelect={(id) => {
            setProId(id);
            setSlot("");
          }}
          onContinue={() => setStep("schedule")}
          canContinue={!!proId}
        />
      )}

      {step === "schedule" && (
        <ScheduleStep
          slotsByDay={slotsByDay}
          slot={slot}
          theme={theme}
          onSelect={setSlot}
          onBack={() => setStep("professional")}
          onContinue={() => setStep("confirm")}
          canContinue={!!slot}
        />
      )}

      {step === "confirm" && (
        <ConfirmStep
          service={service}
          professional={selectedPro}
          slotLabel={selectedSlot ? fmtDateTime(selectedSlot.iso) : ""}
          theme={theme}
          isPending={book.isPending}
          onBack={() => setStep("schedule")}
          onConfirm={() => book.mutate()}
        />
      )}
    </div>
  );
}

function ServiceSummary({ service, theme }: { service: PublicService; theme: BrandTheme }) {
  return (
    <div className="rounded-2xl p-4 mb-6 text-white" style={{ background: theme.gradient }}>
      <p className="text-xs uppercase tracking-wide opacity-80">Serviço selecionado</p>
      <p className="font-bold text-lg mt-0.5">{service.name}</p>
      <p className="text-sm opacity-90 mt-1">
        {fmtDuration(service.duration_min)} · {fmtBRL(service.price_cents)}
      </p>
    </div>
  );
}

function StepIndicator({ current, theme }: { current: BookingStep; theme: BrandTheme }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="mb-6 grid grid-cols-3 gap-2">
      {STEPS.map((item, index) => {
        const active = index === currentIndex;
        const done = index < currentIndex;
        return (
          <div key={item.id} className="text-center">
            <div
              className="mx-auto mb-1.5 flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors"
              style={
                active || done
                  ? { background: theme.gradient, color: "#fff" }
                  : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
              }
            >
              {done ? <Check className="size-4" /> : index + 1}
            </div>
            <p className={`text-[11px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ProfessionalStep({
  pros,
  proId,
  theme,
  onSelect,
  onContinue,
  canContinue,
}: {
  pros: PublicProfessional[];
  proId: string;
  theme: BrandTheme;
  onSelect: (id: string) => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  return (
    <div>
      <SectionTitle icon={User} title="Escolha o profissional" />

      {pros.length === 0 ? (
        <EmptyState text="Nenhum profissional atende este serviço no momento." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {pros.map((pro) => {
            const selected = proId === pro.id;
            return (
              <button
                key={pro.id}
                type="button"
                onClick={() => onSelect(pro.id)}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all"
                style={{
                  borderColor: selected ? theme.brand : "hsl(var(--border))",
                  background: selected ? `${theme.brand}12` : "transparent",
                }}
              >
                <div
                  className="size-14 rounded-full flex items-center justify-center font-bold text-white text-lg"
                  style={{ backgroundColor: pro.color }}
                >
                  {pro.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-center leading-tight line-clamp-2">{pro.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <ContinueButton disabled={!canContinue} theme={theme} onClick={onContinue} label="Escolher horário" />
    </div>
  );
}

function ScheduleStep({
  slotsByDay,
  slot,
  theme,
  onSelect,
  onBack,
  onContinue,
  canContinue,
}: {
  slotsByDay: ReturnType<typeof buildAvailableSlots>;
  slot: string;
  theme: BrandTheme;
  onSelect: (iso: string) => void;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  return (
    <div>
      <SectionTitle icon={Calendar} title="Escolha data e horário" />

      <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
        {slotsByDay.map((day) => (
          <div key={day.key}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 capitalize">
              {day.label}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {day.slots.map((s) => {
                const selected = slot === s.iso;
                return (
                  <button
                    key={s.iso}
                    type="button"
                    onClick={() => onSelect(s.iso)}
                    className="rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors"
                    style={
                      selected
                        ? { background: theme.brand, color: "#fff", borderColor: theme.brand }
                        : { background: "var(--background)", borderColor: "hsl(var(--border))" }
                    }
                  >
                    {s.timeLabel}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Voltar
        </Button>
        <ContinueButton disabled={!canContinue} theme={theme} onClick={onContinue} label="Revisar" className="flex-1" />
      </div>
    </div>
  );
}

function ConfirmStep({
  service,
  professional,
  slotLabel,
  theme,
  isPending,
  onBack,
  onConfirm,
}: {
  service: PublicService;
  professional?: PublicProfessional;
  slotLabel: string;
  theme: BrandTheme;
  isPending: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <SectionTitle icon={Check} title="Revise seu agendamento" />

      <div className="rounded-2xl border border-border bg-muted/20 divide-y divide-border">
        <SummaryRow label="Serviço" value={service.name} />
        <SummaryRow label="Profissional" value={professional?.name ?? "—"} />
        <SummaryRow label="Data e hora" value={slotLabel || "—"} />
        <SummaryRow label="Valor" value={fmtBRL(service.price_cents)} highlight={theme.brand} />
      </div>

      <div className="mt-6 flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          disabled={isPending}
          onClick={onConfirm}
          className="flex-1 h-11 text-white font-semibold"
          style={{ background: theme.gradient }}
        >
          {isPending ? "Confirmando…" : "Confirmar agendamento"}
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="size-4 text-muted-foreground" />
      <p className="text-sm font-semibold">{title}</p>
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right" style={highlight ? { color: highlight } : undefined}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-2xl border border-dashed border-border">
      {text}
    </p>
  );
}

function ContinueButton({
  disabled,
  theme,
  onClick,
  label,
  className,
}: {
  disabled: boolean;
  theme: BrandTheme;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`mt-6 w-full h-11 text-white font-semibold ${className ?? ""}`}
      style={{ background: theme.gradient }}
    >
      {label}
    </Button>
  );
}
