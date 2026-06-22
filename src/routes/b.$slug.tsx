import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  MapPin,
  Phone,
  Sparkles,
  Calendar as CalendarIcon,
  Loader2,
  LogOut,
  Clock,
  ChevronRight,
  Scissors,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { fmtBRL, fmtDuration } from "@/lib/format";

export const Route = createFileRoute("/b/$slug")({
  loader: async ({ params }) => {
    const { data: company, error } = await supabase
      .from("companies")
      .select("id, name, slug, phone, address, logo_url, brand_color, brand_accent, cover_url, tagline")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw error;
    if (!company) throw notFound();
    return { company };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `Agendar — ${loaderData.company.name}` },
          { name: "description", content: `Agende seu horário com ${loaderData.company.name}.` },
        ]
      : [],
  }),
  component: PublicBooking,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <p>Empresa não encontrada.</p>
    </div>
  ),
});

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number;
  commission_pct: number | null;
  active: boolean;
};

function PublicBooking() {
  const { company } = Route.useLoaderData();
  const brand = company.brand_color || "#0ea5e9";
  const accent = company.brand_accent || "#6366f1";

  const [session, setSession] = useState<any>(null);
  const [pendingService, setPendingService] = useState<Service | null>(null);
  const [activeService, setActiveService] = useState<Service | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s && pendingService) {
        setActiveService(pendingService);
        setPendingService(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [pendingService]);

  const { data: services = [] } = useQuery({
    queryKey: ["pub-services", company.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, description, duration_min, price_cents, commission_pct, active")
        .eq("company_id", company.id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  function handleSelectService(s: Service) {
    if (session) setActiveService(s);
    else setPendingService(s);
  }

  const bgStyle = {
    backgroundImage: company.cover_url
      ? `linear-gradient(135deg, ${brand}cc, ${accent}cc), url(${company.cover_url})`
      : `linear-gradient(135deg, ${brand}, ${accent})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as const;

  return (
    <div
      className="min-h-screen bg-background"
      style={{ ["--brand" as any]: brand, ["--accent" as any]: accent }}
    >
      {/* HERO */}
      <header className="relative text-white" style={bgStyle}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-3xl mx-auto px-4 py-14 md:py-20">
          <div className="flex items-center gap-4">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="size-16 md:size-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-xl"
              />
            ) : (
              <div className="size-16 md:size-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-black ring-4 ring-white/30 shadow-xl">
                {company.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-white/20 backdrop-blur rounded-full px-2.5 py-0.5">
                <Sparkles className="size-3" /> Agendamento online
              </span>
              <h1 className="mt-1.5 text-2xl md:text-4xl font-black tracking-tight leading-tight">
                {company.name}
              </h1>
              {company.tagline && <p className="text-sm md:text-base opacity-90 mt-1">{company.tagline}</p>}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs md:text-sm opacity-90">
            {company.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {company.address}
              </span>
            )}
            {company.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5" /> {company.phone}
              </span>
            )}
          </div>

          {session && (
            <div className="mt-5 flex items-center justify-between text-xs bg-white/10 backdrop-blur rounded-full px-3 py-1.5">
              <span className="opacity-90 truncate">
                Olá, <strong>{session.user?.user_metadata?.full_name || session.user?.email}</strong>
              </span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="inline-flex items-center gap-1 opacity-90 hover:opacity-100"
              >
                <LogOut className="size-3" /> Sair
              </button>
            </div>
          )}
        </div>
        <svg viewBox="0 0 1440 60" className="block w-full h-6 md:h-10 text-background" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,60 L0,30 Q720,0 1440,30 L1440,60 Z" />
        </svg>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-20 -mt-4">
        {activeService ? (
          <BookingFlow
            company={company}
            session={session}
            service={activeService}
            brand={brand}
            accent={accent}
            onBack={() => setActiveService(null)}
          />
        ) : (
          <ServicesList
            services={services}
            brand={brand}
            accent={accent}
            onSelect={handleSelectService}
          />
        )}
      </main>

      {pendingService && (
        <AuthModal
          brand={brand}
          accent={accent}
          companyName={company.name}
          service={pendingService}
          onClose={() => setPendingService(null)}
        />
      )}
    </div>
  );
}

/* ------------------------- SERVICES LIST ------------------------- */

function ServicesList({
  services,
  brand,
  accent,
  onSelect,
}: {
  services: Service[];
  brand: string;
  accent: string;
  onSelect: (s: Service) => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 md:p-7 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold">Nossos serviços</h2>
          <p className="text-xs text-muted-foreground">Escolha um serviço para agendar</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="group relative overflow-hidden text-left rounded-2xl border border-border bg-card p-4 hover:border-transparent hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: `linear-gradient(90deg, ${brand}, ${accent})` }}
            />
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 size-11 rounded-xl flex items-center justify-center text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${brand}, ${accent})` }}
              >
                <Scissors className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base leading-tight truncate">{s.name}</p>
                {s.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                    <Clock className="size-3" /> {fmtDuration(s.duration_min)}
                  </span>
                  <span className="text-lg font-extrabold tracking-tight" style={{ color: brand }}>
                    {fmtBRL(s.price_cents)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-dashed border-border flex items-center justify-between text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              <span>Agendar</span>
              <ChevronRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                style={{ color: brand }}
              />
            </div>
          </button>
        ))}
        {services.length === 0 && (
          <p className="text-sm text-muted-foreground sm:col-span-2 text-center py-8">
            Nenhum serviço disponível.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------- AUTH MODAL ------------------------- */

function AuthModal({
  brand,
  accent,
  companyName,
  service,
  onClose,
}: {
  brand: string;
  accent: string;
  companyName: string;
  service: Service;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function signInGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google");
      setLoading(false);
    }
  }

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email") || "").trim(),
      password: String(fd.get("password") || ""),
    });
    setLoading(false);
    if (error) toast.error(error.message);
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email") || "").trim(),
      password: String(fd.get("password") || ""),
      options: {
        emailRedirectTo: window.location.href,
        data: {
          full_name: String(fd.get("full_name") || "").trim(),
          phone: String(fd.get("phone") || "").trim(),
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Pronto para agendar.");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div
          className="relative p-6 text-white rounded-t-3xl"
          style={{ background: `linear-gradient(135deg, ${brand}, ${accent})` }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 size-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs"
            aria-label="Fechar"
          >
            ✕
          </button>
          <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <CalendarIcon className="size-6" />
          </div>
          <h2 className="text-lg font-bold leading-tight">Quase lá!</h2>
          <p className="text-xs opacity-90 mt-1">
            Acesse sua conta para confirmar <strong>{service.name}</strong> em {companyName}.
          </p>
        </div>

        <div className="p-5">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={signInGoogle}
            className="w-full h-11 font-medium"
          >
            <GoogleIcon /> Continuar com Google
          </Button>

          <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
            <span className="flex-1 h-px bg-border" />
            ou com e-mail
            <span className="flex-1 h-px bg-border" />
          </div>

          <Tabs defaultValue="signup">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
              <TabsTrigger value="signin">Entrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={signUp} className="grid gap-3">
                <Field name="full_name" label="Nome completo" required />
                <Field name="phone" label="Telefone (WhatsApp)" />
                <Field name="email" label="E-mail" type="email" required />
                <Field name="password" label="Senha" type="password" required />
                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-1 text-white"
                  style={{ background: `linear-gradient(135deg, ${brand}, ${accent})` }}
                >
                  {loading && <Loader2 className="animate-spin" />} Criar conta e continuar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signin" className="mt-4">
              <form onSubmit={signIn} className="grid gap-3">
                <Field name="email" label="E-mail" type="email" required />
                <Field name="password" label="Senha" type="password" required />
                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-1 text-white"
                  style={{ background: `linear-gradient(135deg, ${brand}, ${accent})` }}
                >
                  {loading && <Loader2 className="animate-spin" />} Entrar
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name} className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input id={name} name={name} type={type} required={required} className="h-11" />
    </div>
  );
}

/* ------------------------- BOOKING FLOW ------------------------- */

type Company = ReturnType<typeof Route.useLoaderData>["company"];

function BookingFlow({
  company,
  session,
  service,
  brand,
  accent,
  onBack,
}: {
  company: Company;
  session: any;
  service: Service;
  brand: string;
  accent: string;
  onBack: () => void;
}) {
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
      return data;
    },
  });

  const selectedPro = pros.find((p) => p.id === proId);

  const slots = useMemo(() => {
    const result: { date: Date; label: string; iso: string }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let d = 0; d < 7; d++) {
      const base = new Date(today);
      base.setDate(today.getDate() + d);
      for (let h = 9; h < 19; h++) {
        for (const m of [0, 30]) {
          const dt = new Date(base);
          dt.setHours(h, m, 0, 0);
          if (dt < new Date()) continue;
          result.push({
            date: dt,
            label: `${dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} · ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
            iso: dt.toISOString(),
          });
        }
      }
    }
    return result;
  }, []);

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
      <div className="rounded-3xl border border-border bg-card p-5 md:p-7 shadow-xl text-center py-10">
        <div
          className="size-20 rounded-full flex items-center justify-center mx-auto mb-5 text-white"
          style={{ background: `linear-gradient(135deg, ${brand}, ${accent})` }}
        >
          <Check className="size-10" />
        </div>
        <h2 className="text-2xl font-black">Tudo pronto!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {service.name} com {selectedPro?.name}
          <br />
          {slot && new Date(slot).toLocaleString("pt-BR")}
        </p>
        <Button variant="outline" className="mt-6" onClick={onBack}>
          Voltar aos serviços
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 md:p-7 shadow-xl">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-3.5" /> Voltar aos serviços
      </button>

      <div
        className="rounded-2xl p-4 mb-5 text-white"
        style={{ background: `linear-gradient(135deg, ${brand}, ${accent})` }}
      >
        <p className="text-xs opacity-80">Serviço selecionado</p>
        <p className="font-bold">{service.name}</p>
        <p className="text-xs opacity-90 mt-0.5">
          {fmtDuration(service.duration_min)} · {fmtBRL(service.price_cents)}
        </p>
      </div>

      <div className="mb-6">
        <p className="text-sm font-semibold mb-2">Profissional</p>
        {pros.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center bg-muted/40 rounded-xl">
            Nenhum profissional atende este serviço.
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {pros.map((p) => {
              const isSel = proId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setProId(p.id)}
                  className="shrink-0 flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 min-w-[88px] transition"
                  style={{
                    borderColor: isSel ? brand : "hsl(var(--border))",
                    background: isSel ? `${brand}10` : "transparent",
                  }}
                >
                  <div
                    className="size-12 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-center leading-tight max-w-[80px] truncate">
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {proId && (
        <div className="mb-5">
          <p className="text-sm font-semibold mb-2">Horário disponível</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto p-1">
            {slots.map((s) => {
              const isSel = slot === s.iso;
              return (
                <button
                  key={s.iso}
                  onClick={() => setSlot(s.iso)}
                  className="rounded-xl border p-3 text-xs font-medium transition text-foreground"
                  style={
                    isSel
                      ? { background: brand, color: "#fff", borderColor: brand }
                      : { background: "var(--background)", borderColor: "hsl(var(--border))" }
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Button
        onClick={() => book.mutate()}
        disabled={book.isPending || !slot || !proId}
        className="w-full h-12 text-white text-base font-semibold"
        style={{ background: `linear-gradient(135deg, ${brand}, ${accent})` }}
      >
        {book.isPending ? "Agendando…" : "Confirmar agendamento"}
      </Button>
    </div>
  );
}
