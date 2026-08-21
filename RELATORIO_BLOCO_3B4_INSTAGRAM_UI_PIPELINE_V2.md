# Relatório — Bloco 3B.4 Instagram UI + Pipeline V2

Data da validação: 21/08/2026  
Branch: `codex/instagram-bloco3b4-ui`  
Escopo: aplicação, contratos, integração e testes. Sem deploy.

## Resultado

PASS. A UI visualmente aprovada foi preservada e seus componentes passaram a compartilhar o mesmo recorte server-side de candidato, período, formato, risco, sentimento e, quando acionado pelo ranking, tema. Não houve alteração de banco, schema, RLS, `client_id`, n8n, Pipeline V2, Legacy, schedule ou infraestrutura.

## Arquivos modificados

- `app/dashboard/instagram/page.tsx`
- `components/dashboard/instagram/InstagramIntelligenceDashboard.tsx`
- `components/dashboard/instagram/InstagramIntelligenceDashboard.test.tsx`
- `components/dashboard/instagram/InstagramUiFilters.tsx`
- `lib/instagram/ui-contract.ts`
- `lib/instagram/ui-contract.test.ts`
- `lib/queries/instagram-ui.ts`
- `lib/types/instagram-ui.ts`
- `RELATORIO_BLOCO_3B4_INSTAGRAM_UI_PIPELINE_V2.md`

## Matriz de componentes e dados

| Componente | Origem real | Campos/transformação | Filtros | Status |
|---|---|---|---|---|
| Cabeçalho/frescor | `social_posts` | máximo de `collected_at` | todos | PASS |
| KPIs | contrato sobre `social_posts` + `ai_analysis` | posts, likes + comments, risco, sentimento e formato | todos | PASS |
| Pressão Social | todos os posts do recorte | série diária por `taken_at`; comentários declarados por `comment_count`; engajamento = likes + comentários | todos | PASS |
| Termômetro de Risco | `ai_analysis.risk_level` | buckets e índice sintético sobre o mesmo universo dos KPIs | todos | PASS |
| Sentimento | `ai_analysis.sentiment` | categorias reais e predominância no mesmo universo | todos | PASS |
| Temas IA | `ai_analysis.ai_topics` | agrupamento e ranking, sem geração no frontend | todos, inclusive tema acionado | PASS |
| Performance por formato | `social_posts.content_type`, métricas estruturadas e enrichment bruto permitido | IMAGE/REEL/CAROUSEL; plays permanece indisponível quando ausente | todos | PASS |
| Posts prioritários | posts + análise | risco decrescente e, depois, likes + comments; tema e recomendação reais | todos | PASS |
| Feed executivo | posts paginados | mídia, legenda, formato, candidato e métricas | todos | PASS |
| Comentários relevantes | `instagram_comments` | ordenação por `like_count`, vínculo pelo `post_id` real | todos | PASS |
| Drawer | contrato do post e comentários vinculados | conteúdo, candidato, formato, data, métricas, engajamento, IA, temas, motivo, recomendação e permalink | todos | PASS |

## Contratos encontrados e corrigidos

O contrato existente já preservava multi-tenant por `getAllowedTargetIds()`, `getActiveClientId()` e filtros de `client_id` no servidor. Também distinguia métrica disponível com valor zero de métrica indisponível.

Correções realizadas:

- `sentiment` passou a ser recebido pela página e aplicado no servidor.
- `topic` passou a ser aplicado no servidor; o clique em tema deixa de ser apenas uma mudança visual de URL.
- opções de sentimento agora vêm das categorias efetivamente presentes no contrato.
- `socialPressure` passou a ser produzido no servidor usando todo o recorte, não apenas a página atual ou uma amostra de comentários.
- `priorityPosts` recebeu critério explícito `risk_desc_then_engagement_desc`.
- o alerta crítico passou a usar um post realmente classificado como alto/crítico no conjunto prioritário.
- o formato em destaque passou a usar likes + comentários, coerente com o rótulo de engajamento.
- comentários relevantes deixaram de criar um post fictício quando o vínculo não está disponível.
- o drawer passou a explicitar data e engajamento, mantendo a faixa visual existente.

## Mocks, hardcodes e fallbacks

Foi removido o fallback que fabricava um `InstagramUiPost` do tipo IMAGE a partir de comentário órfão. A interface não inventa tema, recomendação, plays, alcance, impressões, compartilhamentos ou salvamentos. Ausência permanece `UNAVAILABLE`/`—`; recomendação ausente permanece `ANÁLISE PENDENTE` ou `RECOMENDAÇÃO INDISPONÍVEL`.

As listas de sentimentos deixaram de ser hardcoded no componente e passaram a refletir o contrato real. As fórmulas derivadas ficaram explícitas: engajamento é a soma de likes e comentários disponíveis; pressão de comentários usa `comment_count` declarado por post.

## Validação dos dados reais

Consulta somente leitura no Supabase conectado confirmou:

- 652 posts Instagram;
- 652/652 com `like_count`, `comment_count` e `taken_at` disponíveis;
- formatos exibidos: 74 IMAGE, 473 REEL e 105 CAROUSEL;
- sentimentos suportados: misto, negativo, neutro e positivo;
- riscos suportados: alto, baixo e medio;
- `summary`, `risk_reason` e `recommended_action` existentes e preenchidos na amostra de análises consultada.

Na interface autenticada, o recorte sem filtros exibiu os 652 posts e a distribuição de formatos acima. A rota com `sentiment=negativo` exibiu 54 posts, sentimento dominante negativo em 100% do recorte e atualizou KPIs/risco/interações de forma consistente.

## Testes executados

- testes direcionados do contrato, query e dashboard: 22/22 PASS;
- suíte completa Vitest: 132 arquivos PASS, 5 skipped; 1.175 testes PASS, 5 skipped;
- TypeScript `--noEmit`: PASS;
- lint dos arquivos do escopo: PASS, sem warnings;
- build de produção Next.js 16.2.6/Turbopack: PASS;
- inspeção no navegador autenticado: rota, dados reais, filtros server-side e ausência de erros de console: PASS.

Foram adicionados testes para série temporal sobre todo o recorte, prioridade por risco antes do engajamento, categorias reais de sentimento e apresentação de data/engajamento no drawer.

## Dependências do workflow n8n, pendências e riscos

Não há blocker estrutural para este bloco. A qualidade textual de temas, resumo, motivo de risco e recomendação continua dependente do workflow de enriquecimento mantido pelo agente responsável pelo n8n. Quando o provedor não fornecer uma métrica, a UI mantém ausência explícita.

Risco operacional conhecido: o contrato analítico limita a leitura a 2.000 posts e a janela operacional de comentários a 500 registros para evitar varredura cara. Atualmente o baseline de 652 posts está integralmente coberto. Se o volume superar o teto, será necessária decisão de paginação/agregação server-side, sem alterar silenciosamente a semântica.

## Commit

Commit criado nesta branch com a mensagem `feat(instagram): integrate approved UI with Pipeline V2 data` (hash registrado no histórico Git e no handoff final).

Não foi realizado deploy de produção.
