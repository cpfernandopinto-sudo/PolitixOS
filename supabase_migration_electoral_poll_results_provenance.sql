-- PESQUISAS-01B — Proveniência e enriquecimento de electoral_poll_results
--
-- Estende (não substitui) a tabela criada em PESQUISAS-01A. Adiciona os
-- campos de proveniência exigidos para exibir resultado real de intenção de
-- voto com fonte verificável (PARTE 8 do briefing 01B) — sem os quais nenhum
-- resultado deveria ser exibido. `office`/`result_type` complementam
-- (não substituem) `cargo`-da-pesquisa/`turno`+`tipo_pergunta` já existentes,
-- que continuam sendo a chave de comparabilidade real (lib/pesquisas/comparability.ts).

ALTER TABLE public.electoral_poll_results
  ADD COLUMN IF NOT EXISTS office text,
  ADD COLUMN IF NOT EXISTS result_type text, -- STIMULATED | SPONTANEOUS | REJECTION | SECOND_ROUND | OTHER (livre, não enum — ver nota no código)
  ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES public.targets(id),
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_date date,
  ADD COLUMN IF NOT EXISTS collected_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS electoral_poll_results_office_idx ON public.electoral_poll_results (office);
CREATE INDEX IF NOT EXISTS electoral_poll_results_verified_idx ON public.electoral_poll_results (verified);

-- Chave natural para evitar duplicar o mesmo resultado em reingestões —
-- não um UNIQUE constraint rígido (percentuais podem legitimamente repetir
-- entre candidatos diferentes), aplicado como checagem na camada de
-- aplicação (lib/pesquisas/results-repository.ts) via SELECT antes do INSERT.

COMMENT ON COLUMN public.electoral_poll_results.source_url IS 'Nunca populado sem uma pesquisa/publicação real e verificável — ver PESQUISAS-01B PARTE 8.';
COMMENT ON COLUMN public.electoral_poll_results.verified IS 'true somente após conferência manual de que o resultado corresponde à pesquisa registrada (mesmo instituto, mesma janela de campo, mesmo cargo/território) — nunca setado automaticamente por similaridade de instituto/data isolada.';
