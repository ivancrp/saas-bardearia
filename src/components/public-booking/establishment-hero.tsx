import type { Session } from "@supabase/supabase-js";
import { LogOut, MapPin, Phone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getHeroStyle } from "./brand";
import type { BrandTheme, PublicCompany } from "./types";

type EstablishmentHeroProps = {
  company: PublicCompany;
  theme: BrandTheme;
  session: Session | null;
  onSignOut: () => void;
};

export function EstablishmentHero({ company, theme, session, onSignOut }: EstablishmentHeroProps) {
  const userLabel =
    session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "Cliente";

  return (
    <header className="relative text-white overflow-hidden" style={getHeroStyle(company, theme)}>
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/40" />
      <div className="relative max-w-3xl mx-auto px-4 pt-10 pb-16 md:pt-14 md:pb-20">
        <Badge className="mb-4 border-white/20 bg-white/15 text-white backdrop-blur hover:bg-white/20">
          <Sparkles className="size-3 mr-1" />
          Agendamento online
        </Badge>

        <div className="flex items-start gap-4">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              className="size-20 md:size-24 rounded-3xl object-cover ring-4 ring-white/25 shadow-2xl"
            />
          ) : (
            <div className="size-20 md:size-24 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center text-4xl font-black ring-4 ring-white/25 shadow-2xl">
              {company.name.charAt(0)}
            </div>
          )}

          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">{company.name}</h1>
            {company.tagline && (
              <p className="mt-2 text-sm md:text-base text-white/90 max-w-lg">{company.tagline}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {company.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(company.address)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur px-3 py-1.5 text-xs md:text-sm hover:bg-white/20 transition-colors"
            >
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate max-w-[240px] md:max-w-none">{company.address}</span>
            </a>
          )}
          {company.phone && (
            <a
              href={`tel:${company.phone.replace(/\D/g, "")}`}
              className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur px-3 py-1.5 text-xs md:text-sm hover:bg-white/20 transition-colors"
            >
              <Phone className="size-3.5 shrink-0" />
              {company.phone}
            </a>
          )}
        </div>

        {session && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 backdrop-blur px-4 py-2.5 text-sm">
            <span className="truncate text-white/90">
              Olá, <strong className="text-white">{userLabel}</strong>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              className="shrink-0 h-8 text-white hover:bg-white/15 hover:text-white"
            >
              <LogOut className="size-3.5" />
              Sair
            </Button>
          </div>
        )}
      </div>

      <svg viewBox="0 0 1440 56" className="relative block w-full h-5 md:h-8 text-background" preserveAspectRatio="none">
        <path fill="currentColor" d="M0,56 L0,24 Q720,0 1440,24 L1440,56 Z" />
      </svg>
    </header>
  );
}
