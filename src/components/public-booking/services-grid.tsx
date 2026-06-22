import { ChevronRight, Clock, Scissors } from "lucide-react";
import { fmtBRL, fmtDuration } from "@/lib/format";
import type { BrandTheme, PublicService } from "./types";

type ServicesGridProps = {
  services: PublicService[];
  theme: BrandTheme;
  onSelect: (service: PublicService) => void;
};

export function ServicesGrid({ services, theme, onSelect }: ServicesGridProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5 md:p-6 shadow-card">
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight">Serviços</h2>
          <p className="text-sm text-muted-foreground mt-1">Escolha o que deseja agendar</p>
        </div>

        <div className="grid gap-3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service)}
              className="group w-full text-left rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-transparent hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start gap-4">
                <div
                  className="shrink-0 size-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                  style={{ background: theme.gradient }}
                >
                  <Scissors className="size-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-base leading-tight">{service.name}</p>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-lg font-extrabold tracking-tight" style={{ color: theme.brand }}>
                      {fmtBRL(service.price_cents)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/70 rounded-full px-2.5 py-1">
                      <Clock className="size-3" />
                      {fmtDuration(service.duration_min)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                      Agendar
                      <ChevronRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        style={{ color: theme.brand }}
                      />
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}

          {services.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
              <Scissors className="size-8 mx-auto text-muted-foreground/60 mb-3" />
              <p className="text-sm font-medium">Nenhum serviço disponível no momento</p>
              <p className="text-xs text-muted-foreground mt-1">Volte em breve ou entre em contato com o estabelecimento.</p>
            </div>
          )}
        </div>
      </div>

      <HowItWorks theme={theme} />
    </section>
  );
}

function HowItWorks({ theme }: { theme: BrandTheme }) {
  const steps = [
    { n: "1", title: "Escolha o serviço", text: "Veja preços e duração de cada opção." },
    { n: "2", title: "Profissional e horário", text: "Selecione quem vai atender e o melhor horário." },
    { n: "3", title: "Confirme", text: "Finalize com sua conta e pronto — está agendado." },
  ];

  return (
    <div className="rounded-3xl border border-border bg-card/50 p-5 md:p-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Como funciona</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.n} className="rounded-2xl bg-muted/30 p-4">
            <span
              className="inline-flex size-7 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: theme.gradient }}
            >
              {step.n}
            </span>
            <p className="mt-3 font-medium text-sm">{step.title}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
