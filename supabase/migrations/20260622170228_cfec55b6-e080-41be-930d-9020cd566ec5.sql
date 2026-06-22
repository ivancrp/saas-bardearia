
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS brand_color text NOT NULL DEFAULT '#0ea5e9',
  ADD COLUMN IF NOT EXISTS brand_accent text NOT NULL DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS tagline text;

DROP POLICY IF EXISTS appt_authenticated_public_insert ON public.appointments;
CREATE POLICY appt_authenticated_public_insert ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (source = 'public');
