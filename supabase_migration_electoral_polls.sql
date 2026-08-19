-- PESQUISAS-01A — Módulo Pesquisas Eleitorais (TSE/PesqEle)
--
-- Modelo MÍNIMO deliberado (não as 7 tabelas sugeridas na especificação):
-- só duas tabelas novas. Contratante/pagante/metodologia/valor viram colunas
-- planas em `electoral_polls` em vez de tabelas normalizadas separadas —
-- sem dados reais para validar cardinalidade (um instituto pode aparecer em
-- N pesquisas? um contratante financia quantas?), normalizar agora seria
-- adivinhar uma forma relacional sem evidência. Reavaliar quando o schema
-- real do TSE for verificado (ver docs/relatorios/CLAUDE_PESQUISAS_01A_CORE_TSE.md).
--
-- Rastreamento de execução do coletor REAPROVEITA `source_collection_runs`
-- (já existente, genérica, usada pelo CAGED) em vez de criar
-- `electoral_poll_sync_runs` — mesma finalidade, evita tabela redundante.

CREATE TABLE IF NOT EXISTS public.electoral_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidade oficial (PARTE 11 — nunca instituto+data como chave).
  tse_registration_number text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'TSE/PesqEle',
  source_url text,
  source_dataset text NOT NULL DEFAULT 'pesquisas-eleitorais-2026',

  -- Ficha técnica (PARTE 22) — colunas planas, ver nota acima.
  election_year integer NOT NULL,
  uf text,
  municipio text,
  cargo text,
  abrangencia text,
  instituto text,
  contratante text,
  pagante text,
  valor numeric,
  metodologia text,
  data_registro date,
  campo_inicio date,
  campo_fim date,
  amostra integer,
  margem_erro numeric,
  nivel_confianca numeric,

  -- Linha bruta original do CSV, para nunca perder o que a fonte realmente
  -- disse mesmo que a normalização acima ainda não cubra um campo.
  raw_source_row jsonb,

  ingested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS electoral_polls_uf_idx ON public.electoral_polls (uf);
CREATE INDEX IF NOT EXISTS electoral_polls_cargo_idx ON public.electoral_polls (cargo);
CREATE INDEX IF NOT EXISTS electoral_polls_instituto_idx ON public.electoral_polls (instituto);
CREATE INDEX IF NOT EXISTS electoral_polls_election_year_idx ON public.electoral_polls (election_year);

-- Preparada e vazia (PARTE 9) — só populada se/quando resultado de intenção
-- de voto por candidato for comprovadamente encontrado no dataset oficial.
-- Nenhuma linha deve ser inserida aqui sem uma pesquisa real em electoral_polls.
CREATE TABLE IF NOT EXISTS public.electoral_poll_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.electoral_polls(id) ON DELETE CASCADE,

  -- Chave de comparabilidade (PARTE 8) — nunca comparar resultados com
  -- cenario/turno/tipo_pergunta diferentes como se fossem a mesma leitura.
  cenario text NOT NULL,
  turno integer NOT NULL,
  tipo_pergunta text NOT NULL, -- 'espontanea' | 'estimulada'

  candidate_name text NOT NULL,
  percentage numeric NOT NULL,

  raw_source_row jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS electoral_poll_results_poll_id_idx ON public.electoral_poll_results (poll_id);

-- RLS: mesmo padrão já usado em territories/territory_indicators — "allow
-- all" é seguro aqui porque o dado é público (registro oficial do TSE, não
-- há candidato/usuário a proteger) e a única escrita é via createAdminClient()
-- no coletor (service role, já ignora RLS de qualquer forma).
ALTER TABLE public.electoral_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electoral_poll_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all_electoral_polls ON public.electoral_polls;
CREATE POLICY allow_all_electoral_polls ON public.electoral_polls FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_electoral_poll_results ON public.electoral_poll_results;
CREATE POLICY allow_all_electoral_poll_results ON public.electoral_poll_results FOR ALL TO public USING (true) WITH CHECK (true);

COMMENT ON TABLE public.electoral_polls IS 'Registro de pesquisas eleitorais oficiais (TSE/PesqEle) — ver docs/relatorios/CLAUDE_PESQUISAS_01A_CORE_TSE.md para status real de ingestão.';
COMMENT ON TABLE public.electoral_poll_results IS 'Resultado de intenção de voto por candidato/cenário — só populada se comprovadamente presente na fonte oficial. Vazia por padrão.';
