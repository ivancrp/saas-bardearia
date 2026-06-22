import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Calendar, DollarSign, Users, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useActiveCompany, useMyCompanies } from "@/hooks/use-companies";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { data: memberships, isLoading } = useMyCompanies();
  const { active } = useActiveCompany();

  useEffect(() => {
    if (!isLoading && memberships && memberships.length === 0) {
      navigate({ to: "/onboarding" });
    }
  }, [isLoading, memberships, navigate]);

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto">
        <header className="mb-6">
          <p className="text-sm text-muted-foreground">Bem-vindo de volta</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {active?.company.name ?? "Carregando…"}
          </h1>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Stat label="Agendamentos hoje" value="0" icon={Calendar} />
          <Stat label="Faturamento mês" value="R$ 0" icon={DollarSign} />
          <Stat label="Clientes" value="0" icon={Users} />
          <Stat label="Comissões" value="R$ 0" icon={TrendingUp} />
        </div>

        <section className="mt-8 grid lg:grid-cols-2 gap-4">
          <Card title="Próximos agendamentos">
            <EmptyState message="Nenhum agendamento ainda. Crie um na Agenda." />
          </Card>
          <Card title="Atalhos">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Shortcut label="Nova reserva" to="/agenda" />
              <Shortcut label="Novo cliente" to="/clientes" />
              <Shortcut label="Novo serviço" to="/servicos" />
              <Shortcut label="Profissionais" to="/profissionais" />
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Calendar }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-4 md:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="h-8 w-8 rounded-full bg-surface-elevated flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-5">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{message}</p>;
}

function Shortcut({ label, to }: { label: string; to: string }) {
  return (
    <a
      href={to}
      className="rounded-2xl bg-surface hover:bg-surface-elevated transition-colors p-4 text-center"
    >
      {label}
    </a>
  );
}
