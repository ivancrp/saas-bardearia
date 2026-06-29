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
    <section>
      <div className="rounded-3xl border border-border bg-card p-5 md:p-6 shadow-card">
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight">Serviços</h2>
          <p className="text-sm text-muted-foreground mt-1">Escolha o que deseja agendar</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service)}
              className="group flex flex-col items-center text-center rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-transparent hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div
                className="size-12 rounded-2xl flex items-center justify-center shadow-sm"
                style={{ background: theme.brand, color: theme.onBrand }}
              >
                <Scissors className="size-5" />
              </div>

              <p className="mt-3 font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem] flex items-center">
                {service.name}
              </p>

              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {fmtDuration(service.duration_min)}
              </span>

              <p className="mt-2 text-xl font-extrabold tracking-tight" style={{ color: theme.brand }}>
                {fmtBRL(service.price_cents)}
              </p>

              <span
                className="mt-3 w-full inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold"
                style={{ background: theme.brand, color: theme.onBrand }}
              >
                Agendar
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}

          {services.length === 0 && (
            <div className="col-span-2 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
              <Scissors className="size-8 mx-auto text-muted-foreground/60 mb-3" />
              <p className="text-sm font-medium">Nenhum serviço disponível no momento</p>
              <p className="text-xs text-muted-foreground mt-1">Volte em breve ou entre em contato com o estabelecimento.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
