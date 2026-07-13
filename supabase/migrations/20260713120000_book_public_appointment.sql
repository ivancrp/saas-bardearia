-- Recria a RPC de agendamento público (pode estar ausente em ambientes
-- onde a migration 20260622174946 não chegou a ser aplicada).
-- Idempotente: CREATE OR REPLACE + grants + reload do schema cache do PostgREST.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_company_user_unique
  ON public.customers(company_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.book_public_appointment(
  p_company_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_start_at timestamptz,
  p_name text,
  p_phone text,
  p_email text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_service public.services%ROWTYPE;
  v_pro public.professionals%ROWTYPE;
  v_customer_id uuid;
  v_appt_id uuid;
  v_end timestamptz;
  v_commission_pct numeric;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
    AND company_id = p_company_id
    AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço inválido';
  END IF;

  SELECT * INTO v_pro
  FROM public.professionals
  WHERE id = p_professional_id
    AND company_id = p_company_id
    AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profissional inválido';
  END IF;

  INSERT INTO public.customers (company_id, user_id, name, phone, email)
  VALUES (p_company_id, v_user, p_name, NULLIF(p_phone, ''), NULLIF(p_email, ''))
  ON CONFLICT (company_id, user_id) WHERE user_id IS NOT NULL
  DO UPDATE SET
    name = EXCLUDED.name,
    phone = COALESCE(EXCLUDED.phone, public.customers.phone),
    email = COALESCE(EXCLUDED.email, public.customers.email),
    updated_at = now()
  RETURNING id INTO v_customer_id;

  v_end := p_start_at + (v_service.duration_min || ' minutes')::interval;
  v_commission_pct := COALESCE(v_service.commission_pct, v_pro.commission_pct, 0);

  INSERT INTO public.appointments (
    company_id, professional_id, service_id, customer_id,
    start_at, end_at, status, price_cents, commission_cents,
    customer_name, customer_phone, source
  ) VALUES (
    p_company_id, p_professional_id, p_service_id, v_customer_id,
    p_start_at, v_end, 'scheduled', v_service.price_cents,
    ROUND((v_service.price_cents * v_commission_pct) / 100),
    p_name, NULLIF(p_phone, ''), 'public'
  )
  RETURNING id INTO v_appt_id;

  RETURN v_appt_id;
END;
$$;

REVOKE ALL ON FUNCTION public.book_public_appointment(uuid, uuid, uuid, timestamptz, text, text, text)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.book_public_appointment(uuid, uuid, uuid, timestamptz, text, text, text)
  TO authenticated;

-- Força o PostgREST a recarregar o schema cache (corrige PGRST202).
NOTIFY pgrst, 'reload schema';
