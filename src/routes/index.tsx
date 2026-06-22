import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Scissors, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agenda SaaS — Gestão completa para barbearias" },
      { name: "description", content: "Plataforma multiempresa de agendamento, clientes, comissões e financeiro. Mobile-first e elegante." },
      { property: "og:title", content: "Agenda SaaS — Gestão para barbearias" },
      { property: "og:description", content: "Agenda visual, agendamento online, comissões e financeiro em um só lugar." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="px-4 md:px-8 h-16 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Scissors className="h-4 w-4" />
          </div>
          <span className="font-bold">Agenda SaaS</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/auth">Entrar</Link></Button>
          <Button asChild size="sm"><Link to="/auth">Começar grátis</Link></Button>
        </div>
      </header>

      <main className="px-4 md:px-8 max-w-6xl mx-auto">
        <section className="py-16 md:py-28 text-center">
          <span className="inline-block text-xs font-medium rounded-full bg-surface px-3 py-1 text-primary border border-border">
            Multi-empresa • Mobile-first • Premium
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
            Sua barbearia,<br />
            <span className="text-primary">organizada de ponta a ponta.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
            Agenda visual, agendamento online, gestão de clientes, profissionais, comissões e
            financeiro — numa experiência elegante e responsiva.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Button asChild size="lg"><Link to="/auth">Criar minha conta</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link to="/auth">Entrar</Link></Button>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4 pb-24">
          <Feature icon={Calendar} title="Agenda visual" text="Visualize seu dia/semana estilo Google Calendar com prevenção de conflitos." />
          <Feature icon={Smartphone} title="Reserva online" text="Link público para clientes agendarem 24/7 — sem instalar nada." />
          <Feature icon={ShieldCheck} title="RBAC multi-tenant" text="Empresas, papéis e permissões isolados com segurança real (RLS)." />
        </section>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof Calendar; title: string; text: string }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-6">
      <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
