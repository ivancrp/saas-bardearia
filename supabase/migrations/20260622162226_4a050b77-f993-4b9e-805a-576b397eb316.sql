
REVOKE EXECUTE ON FUNCTION public.is_company_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_company_role(UUID, UUID, public.app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_company() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_role(UUID, UUID, public.app_role[]) TO authenticated;
