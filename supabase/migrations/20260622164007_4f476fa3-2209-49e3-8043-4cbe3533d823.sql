
-- ENUMS
CREATE TYPE public.appointment_status AS ENUM ('scheduled','confirmed','done','canceled','no_show');
CREATE TYPE public.financial_kind AS ENUM ('income','expense','commission');

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  birthday date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_company_idx ON public.customers(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated USING (public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::app_role[]));
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROFESSIONALS
CREATE TABLE public.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  color text NOT NULL DEFAULT '#6DEAED',
  commission_pct numeric(5,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX professionals_company_idx ON public.professionals(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professionals TO authenticated;
GRANT ALL ON public.professionals TO service_role;
GRANT SELECT ON public.professionals TO anon;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY professionals_public_select ON public.professionals FOR SELECT TO anon USING (active);
CREATE POLICY professionals_select ON public.professionals FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY professionals_write_admin ON public.professionals FOR ALL TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::app_role[]))
  WITH CHECK (public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::app_role[]));
CREATE TRIGGER professionals_updated_at BEFORE UPDATE ON public.professionals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SERVICES
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_min integer NOT NULL DEFAULT 30,
  price_cents integer NOT NULL DEFAULT 0,
  commission_pct numeric(5,2),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX services_company_idx ON public.services(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
GRANT SELECT ON public.services TO anon;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY services_public_select ON public.services FOR SELECT TO anon USING (active);
CREATE POLICY services_select ON public.services FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY services_write_admin ON public.services FOR ALL TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::app_role[]))
  WITH CHECK (public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::app_role[]));
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROFESSIONAL <-> SERVICE
CREATE TABLE public.professional_services (
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_services TO authenticated;
GRANT ALL ON public.professional_services TO service_role;
GRANT SELECT ON public.professional_services TO anon;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_public_select ON public.professional_services FOR SELECT TO anon USING (true);
CREATE POLICY ps_select ON public.professional_services FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND public.is_company_member(p.company_id, auth.uid()))
);
CREATE POLICY ps_write ON public.professional_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND public.has_company_role(p.company_id, auth.uid(), ARRAY['owner','admin']::app_role[])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND public.has_company_role(p.company_id, auth.uid(), ARRAY['owner','admin']::app_role[])));

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  price_cents integer NOT NULL DEFAULT 0,
  commission_cents integer NOT NULL DEFAULT 0,
  customer_name text,
  customer_phone text,
  notes text,
  source text NOT NULL DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appointments_company_start_idx ON public.appointments(company_id, start_at);
CREATE INDEX appointments_professional_start_idx ON public.appointments(professional_id, start_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
GRANT SELECT, INSERT ON public.appointments TO anon;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY appt_public_insert ON public.appointments FOR INSERT TO anon WITH CHECK (source = 'public');
CREATE POLICY appt_select ON public.appointments FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY appt_insert ON public.appointments FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY appt_update ON public.appointments FOR UPDATE TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY appt_delete ON public.appointments FOR DELETE TO authenticated USING (public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::app_role[]));
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FINANCIAL ENTRIES
CREATE TABLE public.financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  kind financial_kind NOT NULL,
  amount_cents integer NOT NULL,
  description text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_company_date_idx ON public.financial_entries(company_id, paid_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_select ON public.financial_entries FOR SELECT TO authenticated USING (
  public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::app_role[])
);
CREATE POLICY fin_write ON public.financial_entries FOR ALL TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::app_role[]))
  WITH CHECK (public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::app_role[]));
CREATE TRIGGER financial_updated_at BEFORE UPDATE ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
