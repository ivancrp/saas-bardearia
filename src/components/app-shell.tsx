import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  Scissors,
  Wallet,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-companies";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/profissionais", label: "Profissionais", icon: UserCog },
  { to: "/servicos", label: "Serviços", icon: Scissors },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { active, memberships, setActiveId } = useActiveCompany();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-border bg-background-2 p-4">
        <CompanySwitcher
          active={active?.company.name ?? "Selecione"}
          memberships={memberships.map((m) => ({ id: m.company.id, name: m.company.name, role: m.role }))}
          onSelect={setActiveId}
        />
        <nav className="mt-6 flex-1 space-y-1">
          {NAV.map((item) => {
            const Active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-4 h-11 rounded-2xl text-sm transition-colors",
                  Active
                    ? "bg-primary text-primary-foreground font-medium shadow-[var(--shadow-button)]"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 h-11 rounded-2xl text-sm text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-background-2 sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Scissors className="h-4 w-4" />
            </div>
            <span className="font-semibold truncate text-sm">{active?.company.name ?? "Agenda"}</span>
          </div>
          <CompanySwitcher
            compact
            active={active?.company.name ?? ""}
            memberships={memberships.map((m) => ({ id: m.company.id, name: m.company.name, role: m.role }))}
            onSelect={setActiveId}
            onSignOut={handleSignOut}
          />
        </header>

        <main className="flex-1 pb-24 md:pb-8">{children}</main>

        {/* Mobile bottom nav (5 main items) */}
        <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-full bg-black/90 backdrop-blur border border-border shadow-[var(--shadow-floating)] flex items-center justify-around h-16 px-2">
          {NAV.slice(0, 5).map((item) => {
            const Active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className={cn(
                  "flex items-center justify-center h-12 w-12 rounded-full transition-colors",
                  Active ? "bg-primary text-primary-foreground" : "text-white/70 hover:text-white",
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function CompanySwitcher({
  active,
  memberships,
  onSelect,
  compact = false,
  onSignOut,
}: {
  active: string;
  memberships: Array<{ id: string; name: string; role: string }>;
  onSelect: (id: string) => void;
  compact?: boolean;
  onSignOut?: () => void;
}) {
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="h-9 w-9 rounded-full bg-surface flex items-center justify-center">
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Empresas</DropdownMenuLabel>
          {memberships.map((m) => (
            <DropdownMenuItem key={m.id} onClick={() => onSelect(m.id)}>
              <Building2 className="h-4 w-4" /> {m.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {onSignOut && (
            <DropdownMenuItem onClick={onSignOut} className="text-destructive">
              <LogOut className="h-4 w-4" /> Sair
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 h-14 rounded-2xl bg-surface hover:bg-surface-elevated transition-colors">
        <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Scissors className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate">{active}</p>
          <p className="text-xs text-muted-foreground">Plano Free</p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Empresas</DropdownMenuLabel>
        {memberships.map((m) => (
          <DropdownMenuItem key={m.id} onClick={() => onSelect(m.id)}>
            <Building2 className="h-4 w-4" /> {m.name}
            <span className="ml-auto text-xs text-muted-foreground">{m.role}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
