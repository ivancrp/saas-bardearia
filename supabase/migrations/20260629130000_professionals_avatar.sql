-- Adiciona foto do profissional.
-- A imagem reaproveita o bucket privado company-assets (mesmo padrão de logo/capa),
-- armazenando a URL assinada de longa duração na coluna avatar_url.

alter table public.professionals
  add column if not exists avatar_url text;

-- O acesso à tabela é controlado por grants a nível de coluna (ver migration 20260622172942).
-- A foto é pública (aparece na página de agendamento), então concedemos leitura a anon e authenticated.
grant select (avatar_url) on public.professionals to anon, authenticated;
