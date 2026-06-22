import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-companies";
import { PALETTES } from "@/lib/palettes";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfigPage,
});

function ConfigPage() {
  const { active } = useActiveCompany();
  const qc = useQueryClient();
  const company = active?.company;
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    tagline: "",
    brand_color: "#0ea5e9",
    brand_accent: "#6366f1",
    cover_url: "",
  });

  useEffect(() => {
    if (company)
      setForm({
        name: company.name,
        phone: company.phone ?? "",
        address: company.address ?? "",
        tagline: (company as any).tagline ?? "",
        brand_color: (company as any).brand_color ?? "#0ea5e9",
        brand_accent: (company as any).brand_accent ?? "#6366f1",
        cover_url: (company as any).cover_url ?? "",
      });
  }, [company?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("Sem empresa ativa");
      const { error } = await supabase
        .from("companies")
        .update({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          tagline: form.tagline.trim() || null,
          brand_color: form.brand_color,
          brand_accent: form.brand_accent,
          cover_url: form.cover_url.trim() || null,
        })
        .eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["my-companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["company-members", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("role, user_id, profile:profiles(full_name)")
        .eq("company_id", company!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const publicUrl = company
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/b/${company.slug}`
    : "";

  const applyPalette = (brand: string, accent: string) =>
    setForm((f) => ({ ...f, brand_color: brand, brand_accent: accent }));

  return (
    <AppShell>
      <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
        <PageHeader title="Configurações" subtitle="Dados, branding, equipe e link público." />

        {/* EMPRESA */}
        <section className="rounded-2xl border border-border bg-card p-6 mb-6">
          <h2 className="font-semibold mb-4">Empresa</h2>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Slogan / chamada</Label>
              <Input
                placeholder="Ex.: O melhor corte da cidade"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Imagem de capa (URL)</Label>
                <Input
                  placeholder="https://..."
                  value={form.cover_url}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Endereço</Label>
              <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
        </section>

        {/* BRAND / PALETTE */}
        <section className="rounded-2xl border border-border bg-card p-6 mb-6">
          <h2 className="font-semibold mb-1">Identidade visual</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Escolha uma paleta pronta ou ajuste as cores manualmente. Aplicada na página pública.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {PALETTES.map((p) => {
              const selected = p.brand.toLowerCase() === form.brand_color.toLowerCase();
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPalette(p.brand, p.accent)}
                  className={`group rounded-2xl border p-3 text-left transition ${
                    selected ? "border-foreground ring-2 ring-foreground/10" : "border-border hover:border-foreground/40"
                  }`}
                >
                  <div className="flex gap-1 mb-2">
                    <span className="h-8 flex-1 rounded-lg" style={{ background: p.brand }} />
                    <span className="h-8 flex-1 rounded-lg" style={{ background: p.accent }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{p.name}</span>
                    {selected && <Check className="size-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Cor primária</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.brand_color}
                  onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                  className="h-10 w-14 rounded-md border border-border bg-transparent cursor-pointer"
                />
                <Input value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Cor de destaque</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.brand_accent}
                  onChange={(e) => setForm({ ...form, brand_accent: e.target.value })}
                  className="h-10 w-14 rounded-md border border-border bg-transparent cursor-pointer"
                />
                <Input value={form.brand_accent} onChange={(e) => setForm({ ...form, brand_accent: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div
            className="mt-5 rounded-2xl p-5 text-white overflow-hidden relative"
            style={{ background: `linear-gradient(135deg, ${form.brand_color}, ${form.brand_accent})` }}
          >
            <p className="text-xs uppercase tracking-wider opacity-80">Pré-visualização</p>
            <p className="font-bold text-xl mt-1">{form.name || "Sua empresa"}</p>
            {form.tagline && <p className="text-sm opacity-90">{form.tagline}</p>}
          </div>
        </section>

        <div className="flex justify-end mb-8">
          <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg">
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>

        {/* PUBLIC LINK */}
        <section className="rounded-2xl border border-border bg-card p-6 mb-6">
          <h2 className="font-semibold mb-2">Link público de agendamento</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Compartilhe com seus clientes. Eles precisam criar uma conta para confirmar o agendamento.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={publicUrl} className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success("Copiado");
              }}
            >
              <Copy className="size-4" />
            </Button>
            {company && (
              <Button variant="outline" asChild>
                <Link to="/b/$slug" params={{ slug: company.slug }} target="_blank">
                  <ExternalLink className="size-4" /> Abrir
                </Link>
              </Button>
            )}
          </div>
        </section>

        {/* TEAM */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-4">Equipe</h2>
          <ul className="divide-y divide-border">
            {members.map((m: any) => (
              <li key={m.user_id} className="flex items-center justify-between py-3">
                <span>{m.profile?.full_name ?? m.user_id.slice(0, 8)}</span>
                <span className="text-xs uppercase text-muted-foreground">{m.role}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
