import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MapPin, Search, Scissors } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type PublicEstablishment = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  tagline: string | null;
  brand_color: string | null;
  segment: string | null;
};

export function FindEstablishment() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const { data: establishments = [], isLoading, isError } = useQuery({
    queryKey: ["public-establishments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, slug, address, logo_url, cover_url, tagline, brand_color, segment")
        .order("name");
      if (error) throw error;
      return data as PublicEstablishment[];
    },
  });

  const filtered = useMemo(() => {
    if (!deferredQuery) return establishments;
    return establishments.filter((item) => {
      const haystack = [item.name, item.address, item.tagline, item.segment]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(deferredQuery);
    });
  }, [establishments, deferredQuery]);

  return (
    <section id="encontrar" className="scroll-mt-20 pb-24">
      <div className="rounded-[2rem] border border-border bg-card p-5 md:p-8 shadow-sm">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Para clientes
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
            Encontre um estabelecimento
          </h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            Busque por nome, bairro ou cidade e agende direto no estabelecimento.
          </p>
        </div>

        <div className="relative mt-6 max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, bairro ou cidade…"
            className="h-12 rounded-2xl pl-10 text-base"
            aria-label="Buscar estabelecimento"
          />
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/60" />
              ))}
            </div>
          ) : isError ? (
            <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              Não foi possível carregar os estabelecimentos. Tente novamente em instantes.
            </p>
          ) : filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              {deferredQuery
                ? `Nenhum resultado para “${query.trim()}”.`
                : "Nenhum estabelecimento disponível no momento."}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((item) => (
                <EstablishmentCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function EstablishmentCard({ item }: { item: PublicEstablishment }) {
  const brand = item.brand_color || "hsl(var(--primary))";

  return (
    <Link
      to="/b/$slug"
      params={{ slug: item.slug }}
      className="group overflow-hidden rounded-2xl border border-border bg-background transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative h-24 overflow-hidden bg-muted">
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${brand}33, ${brand}88)` }} />
        )}
      </div>

      <div className="relative -mt-7 flex items-end gap-3 px-4 pb-4">
        <div
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-background bg-card shadow-sm"
          style={!item.logo_url ? { backgroundColor: brand, color: "#fff" } : undefined}
        >
          {item.logo_url ? (
            <img src={item.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Scissors className="size-5" />
          )}
        </div>

        <div className="min-w-0 flex-1 pt-8">
          <p className="truncate font-semibold leading-tight">{item.name}</p>
          {item.tagline && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.tagline}</p>
          )}
          <p className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span className="line-clamp-2">{item.address || "Endereço não informado"}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
