import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Building2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useMyCompanies } from "@/hooks/use-companies";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(80),
  slug: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: memberships, isLoading } = useMyCompanies();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  // If user already has a company, send them to dashboard.
  useEffect(() => {
    if (!isLoading && memberships && memberships.length > 0) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoading, memberships, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ name, slug });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setSaving(false);
      toast.error("Sessão expirada");
      return;
    }
    const { error } = await supabase.from("companies").insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      segment: "barbershop",
      owner_id: uid,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Este slug já está em uso" : error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["my-companies"] });
    toast.success("Empresa criada!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Crie sua empresa</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Você será o proprietário e poderá convidar profissionais depois.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-card p-6 border border-border shadow-[var(--shadow-card)] space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-muted-foreground">Nome do estabelecimento</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value));
              }}
              placeholder="Ex.: Barbearia do João"
              className="h-12 rounded-2xl bg-surface"
              maxLength={80}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug" className="text-xs text-muted-foreground">Link público da agenda</Label>
            <div className="flex items-center rounded-2xl bg-surface border border-border overflow-hidden h-12 px-4">
              <span className="text-sm text-muted-foreground">/b/</span>
              <input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="barbearia-do-joao"
                className="flex-1 bg-transparent outline-none text-sm ml-1"
                maxLength={40}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Loader2 className="animate-spin" />} Criar empresa
          </Button>
        </form>
      </div>
    </div>
  );
}
