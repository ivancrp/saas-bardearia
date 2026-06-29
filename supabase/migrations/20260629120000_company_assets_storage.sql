-- Storage bucket PRIVADO para logo e capa das empresas.
-- A exibição usa URLs assinadas de longa duração geradas no upload.
-- Caminho esperado dos arquivos: company-assets/{company_id}/{arquivo}

insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', false)
on conflict (id) do update set public = false;

-- SELECT para membros da empresa: necessário para gerar a URL assinada (createSignedUrl)
drop policy if exists company_assets_public_read on storage.objects;
drop policy if exists company_assets_member_read on storage.objects;
create policy company_assets_member_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'company-assets'
    and private.is_company_member(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

-- Apenas owner/admin da empresa pode enviar/alterar/remover arquivos na pasta da própria empresa
drop policy if exists company_assets_insert on storage.objects;
create policy company_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-assets'
    and private.has_company_role(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      array['owner'::public.app_role, 'admin'::public.app_role]
    )
  );

drop policy if exists company_assets_update on storage.objects;
create policy company_assets_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'company-assets'
    and private.has_company_role(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      array['owner'::public.app_role, 'admin'::public.app_role]
    )
  )
  with check (
    bucket_id = 'company-assets'
    and private.has_company_role(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      array['owner'::public.app_role, 'admin'::public.app_role]
    )
  );

drop policy if exists company_assets_delete on storage.objects;
create policy company_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-assets'
    and private.has_company_role(
      ((storage.foldername(name))[1])::uuid,
      auth.uid(),
      array['owner'::public.app_role, 'admin'::public.app_role]
    )
  );
