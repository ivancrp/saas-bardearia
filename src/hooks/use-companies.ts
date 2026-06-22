import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export type CompanyMembership = {
  company: Company;
  role: AppRole;
};

const ACTIVE_KEY = "active_company_id";

export function useMyCompanies() {
  return useQuery({
    queryKey: ["my-companies"],
    queryFn: async (): Promise<CompanyMembership[]> => {
      const { data, error } = await supabase
        .from("company_members")
        .select("role, company:companies(*)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter((r) => r.company)
        .map((r) => ({ role: r.role as AppRole, company: r.company as Company }));
    },
  });
}

export function useActiveCompany() {
  const { data: memberships, isLoading } = useMyCompanies();
  const [activeId, setActiveIdState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveIdState(localStorage.getItem(ACTIVE_KEY));
  }, []);

  useEffect(() => {
    if (!memberships || memberships.length === 0) return;
    if (activeId && memberships.some((m) => m.company.id === activeId)) return;
    const first = memberships[0].company.id;
    setActiveIdState(first);
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_KEY, first);
  }, [memberships, activeId]);

  const setActiveId = (id: string) => {
    setActiveIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_KEY, id);
  };

  const active = memberships?.find((m) => m.company.id === activeId) ?? null;
  return { active, memberships: memberships ?? [], setActiveId, loading: isLoading };
}
