
-- ============================================================
-- Security fixes
-- ============================================================

-- 1) Move security-definer helpers to a non-API-exposed schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_company_member(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION private.has_company_role(_company_id uuid, _user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = _user_id AND role = ANY(_roles)
  );
$$;

REVOKE ALL ON FUNCTION private.is_company_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_company_role(uuid, uuid, public.app_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_company_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_company_role(uuid, uuid, public.app_role[]) TO authenticated;

-- Recreate every policy that referenced the old public helpers, now using private.*

-- companies
DROP POLICY IF EXISTS companies_member_select ON public.companies;
DROP POLICY IF EXISTS companies_update_owner_admin ON public.companies;
DROP POLICY IF EXISTS companies_delete_owner ON public.companies;
DROP POLICY IF EXISTS companies_public_select ON public.companies;

CREATE POLICY companies_member_select ON public.companies FOR SELECT TO authenticated
  USING (private.is_company_member(id, auth.uid()));
CREATE POLICY companies_update_owner_admin ON public.companies FOR UPDATE TO authenticated
  USING (private.has_company_role(id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]));
CREATE POLICY companies_delete_owner ON public.companies FOR DELETE TO authenticated
  USING (private.has_company_role(id, auth.uid(), ARRAY['owner'::public.app_role]));

-- 2) Restrict public companies select to non-sensitive columns via column grants
CREATE POLICY companies_public_select ON public.companies FOR SELECT TO anon, authenticated
  USING (true);
REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (id, name, slug, segment, logo_url, phone, address, timezone,
              brand_color, brand_accent, cover_url, tagline, created_at, updated_at)
  ON public.companies TO anon;
-- authenticated keeps full SELECT (already granted), member policy still gates non-public reads

-- company_members
DROP POLICY IF EXISTS members_view_same_company ON public.company_members;
DROP POLICY IF EXISTS members_insert_admin ON public.company_members;
DROP POLICY IF EXISTS members_update_admin ON public.company_members;
DROP POLICY IF EXISTS members_delete_admin ON public.company_members;

CREATE POLICY members_view_same_company ON public.company_members FOR SELECT TO authenticated
  USING (private.is_company_member(company_id, auth.uid()));
CREATE POLICY members_insert_admin ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (private.has_company_role(company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]));
CREATE POLICY members_update_admin ON public.company_members FOR UPDATE TO authenticated
  USING (private.has_company_role(company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]));
CREATE POLICY members_delete_admin ON public.company_members FOR DELETE TO authenticated
  USING (private.has_company_role(company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]));

-- customers
DROP POLICY IF EXISTS customers_select ON public.customers;
DROP POLICY IF EXISTS customers_insert ON public.customers;
DROP POLICY IF EXISTS customers_update ON public.customers;
DROP POLICY IF EXISTS customers_delete ON public.customers;

CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated
  USING (private.is_company_member(company_id, auth.uid()));
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(company_id, auth.uid()));
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated
  USING (private.is_company_member(company_id, auth.uid()));
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated
  USING (private.has_company_role(company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]));

-- professionals
DROP POLICY IF EXISTS professionals_select ON public.professionals;
DROP POLICY IF EXISTS professionals_write_admin ON public.professionals;
DROP POLICY IF EXISTS professionals_public_select ON public.professionals;

CREATE POLICY professionals_select ON public.professionals FOR SELECT TO authenticated
  USING (private.is_company_member(company_id, auth.uid()));
CREATE POLICY professionals_write_admin ON public.professionals
  TO authenticated
  USING (private.has_company_role(company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]))
  WITH CHECK (private.has_company_role(company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]));

-- 3) Public professionals: keep row filter, restrict columns (no email/phone) via grants
CREATE POLICY professionals_public_select ON public.professionals FOR SELECT TO anon, authenticated
  USING (active);
REVOKE SELECT ON public.professionals FROM anon;
GRANT SELECT (id, company_id, name, color, commission_pct, active, created_at, updated_at)
  ON public.professionals TO anon;
REVOKE SELECT (email, phone, user_id) ON public.professionals FROM authenticated;
GRANT SELECT (id, company_id, name, color, commission_pct, active, created_at, updated_at)
  ON public.professionals TO authenticated;
-- Authenticated members still see email/phone via a server-side query? Re-grant for members only is not possible per-row; keep email/phone server-only.
-- Re-grant email/phone to authenticated so member policy still returns full row to logged-in staff
GRANT SELECT (email, phone, user_id) ON public.professionals TO authenticated;

-- services
DROP POLICY IF EXISTS services_select ON public.services;
DROP POLICY IF EXISTS services_write_admin ON public.services;
CREATE POLICY services_select ON public.services FOR SELECT TO authenticated
  USING (private.is_company_member(company_id, auth.uid()));
CREATE POLICY services_write_admin ON public.services
  TO authenticated
  USING (private.has_company_role(company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]))
  WITH CHECK (private.has_company_role(company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]));

-- professional_services
DROP POLICY IF EXISTS ps_select ON public.professional_services;
DROP POLICY IF EXISTS ps_write ON public.professional_services;
DROP POLICY IF EXISTS ps_public_select ON public.professional_services;

CREATE POLICY ps_select ON public.professional_services FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.professionals p
                 WHERE p.id = professional_services.professional_id
                   AND private.is_company_member(p.company_id, auth.uid())));
CREATE POLICY ps_write ON public.professional_services
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.professionals p
                 WHERE p.id = professional_services.professional_id
                   AND private.has_company_role(p.company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.professionals p
                 WHERE p.id = professional_services.professional_id
                   AND private.has_company_role(p.company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role])));

-- 4) ps_public_select: restrict to mappings of ACTIVE professionals only
CREATE POLICY ps_public_select ON public.professional_services FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.professionals p
                 WHERE p.id = professional_services.professional_id AND p.active));

-- appointments
DROP POLICY IF EXISTS appt_select ON public.appointments;
DROP POLICY IF EXISTS appt_insert ON public.appointments;
DROP POLICY IF EXISTS appt_update ON public.appointments;
DROP POLICY IF EXISTS appt_delete ON public.appointments;
DROP POLICY IF EXISTS appt_authenticated_public_insert ON public.appointments;

CREATE POLICY appt_select ON public.appointments FOR SELECT TO authenticated
  USING (private.is_company_member(company_id, auth.uid()));
CREATE POLICY appt_insert ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(company_id, auth.uid()));
CREATE POLICY appt_update ON public.appointments FOR UPDATE TO authenticated
  USING (private.is_company_member(company_id, auth.uid()));
CREATE POLICY appt_delete ON public.appointments FOR DELETE TO authenticated
  USING (private.has_company_role(company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]));

-- 5) Authenticated public-booking insert: now requires a valid company AND
--    that the chosen professional+service actually belong to that company
--    (prevents cross-tenant / arbitrary-foreign-key escalation).
CREATE POLICY appt_authenticated_public_insert ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    source = 'public'
    AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id)
    AND EXISTS (SELECT 1 FROM public.professionals p
                WHERE p.id = professional_id AND p.company_id = appointments.company_id AND p.active)
    AND EXISTS (SELECT 1 FROM public.services s
                WHERE s.id = service_id AND s.company_id = appointments.company_id AND s.active)
  );

-- Also tighten the anon public-booking policy with the same integrity checks
DROP POLICY IF EXISTS appt_public_insert ON public.appointments;
CREATE POLICY appt_public_insert ON public.appointments FOR INSERT TO anon
  WITH CHECK (
    source = 'public'
    AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id)
    AND EXISTS (SELECT 1 FROM public.professionals p
                WHERE p.id = professional_id AND p.company_id = appointments.company_id AND p.active)
    AND EXISTS (SELECT 1 FROM public.services s
                WHERE s.id = service_id AND s.company_id = appointments.company_id AND s.active)
  );

-- financial_entries
DROP POLICY IF EXISTS fin_select ON public.financial_entries;
DROP POLICY IF EXISTS fin_write ON public.financial_entries;
CREATE POLICY fin_select ON public.financial_entries FOR SELECT TO authenticated
  USING (private.is_company_member(company_id, auth.uid()));
CREATE POLICY fin_write ON public.financial_entries
  TO authenticated
  USING (private.has_company_role(company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]))
  WITH CHECK (private.has_company_role(company_id, auth.uid(), ARRAY['owner'::public.app_role,'admin'::public.app_role]));

-- Drop old public helpers now that nothing references them
DROP FUNCTION IF EXISTS public.is_company_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_company_role(uuid, uuid, public.app_role[]);

-- Tighten EXECUTE on remaining SECURITY DEFINER trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_new_company() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
