# Relatório — Instagram Bloco 3B.6B

## Decisão

**PASS WITH LIMITATIONS**

Data: 21/08/2026  
Branch: `codex/instagram-bloco3b6b`  
Baseline de origem: commit `a169633`

O contrato da aplicação passou a transportar os novos sinais V2 e a detectar explicitamente truncamento. O carregamento analítico agora é paginado em lotes controlados e cobre integralmente o baseline e crescimentos acima de 2.000 posts, até o teto de segurança documentado de 10.000. Nenhum arquivo visual foi alterado.

## 1. Baseline

- 652 posts Instagram;
- 74 IMAGE;
- 473 REEL;
- 105 CAROUSEL;
- 126.134 registros em `instagram_comments` na leitura de 21/08/2026;
- filtros server-side e isolamento multi-tenant preservados;
- baseline anterior: 1.175 testes PASS, 5 skipped e build PASS.

## 2. Arquivos alterados

- `lib/types/instagram-ui.ts`
- `lib/instagram/ui-contract.ts`
- `lib/queries/instagram-ui.ts`
- `lib/instagram/ui-contract.test.ts`
- `lib/queries/instagram-ui.test.ts`
- `docs/RELATORIO_INSTAGRAM_BLOCO3B6B_APP_SCALE_CONTRACT.md`

Alterações paralelas detectadas em `n8n/instagram-pipeline-v2-shadow.json` e `scripts/validate-instagram-pipeline-v2.mjs` foram preservadas e excluídas deste bloco e de seu commit.

## 3. Contratos encontrados

`social_posts` fornece identificação, tenant, candidato, formato, data, legenda, permalink, likes, comentários agregados e `raw_json`. `ai_analysis` fornece `sentiment`, `risk_level`, `risk_reason`, `ai_topics`, `summary`, `recommended_action`, `engagement_quality` e `polarization_level`. `instagram_comments` mantém o vínculo real `post_id → social_posts.id` e alimenta somente a janela operacional de comentários.

As consultas continuam escopadas por `getAllowedTargetIds()`, `getActiveClientId()`, `target_id` e `client_id`. O cliente administrativo permanece exclusivamente server-side.

## 4. Novos campos V2

Foram adicionados ao contrato:

- `analysis.engagementQuality`;
- `analysis.polarizationLevel`.

Cada sinal possui `{ value, availability }`. Strings não vazias são transportadas sem reclassificação; nulo, ausência ou tipo inválido resulta em `{ value: null, availability: "UNAVAILABLE" }`. Nenhum valor default ou sintético é criado. Os campos não foram adicionados à UI neste bloco.

Consulta somente leitura confirmou que ambas as colunas existem em `ai_analysis`, são textuais quando preenchidas e aceitam nulo.

## 5. Estratégia de paginação

O antigo `.limit(2000)` foi substituído por:

1. primeira página de 500 posts com `count: exact`;
2. cálculo determinístico das faixas restantes;
3. páginas de 500 posts com ordenação estável por `taken_at DESC, id DESC`;
4. concorrência controlada de quatro páginas por onda;
5. análises carregadas por lotes de 150 IDs, também com concorrência máxima de quatro lotes por onda;
6. feed visual mantido em paginação própria de 20 itens.

KPIs, riscos, sentimentos, temas, formatos e pressão social usam o conjunto analítico carregado; a página visual não altera esses totais.

## 6. Tratamento acima de 2.000 posts

Universos de 1.999, 2.000 e 3.800 posts são carregados integralmente pela estratégia atual. O teto de segurança da aplicação foi definido em 10.000 posts para evitar carga sem limite.

Acima desse teto, o contrato não mascara o truncamento:

```text
completeness.totalAvailable
completeness.totalLoaded
completeness.isComplete
completeness.limit
```

Exemplo testado: 12.000 disponíveis, 10.000 carregados, `isComplete = false`, `limit = 10000`.

## 7. Tratamento de comentários

Os 126 mil comentários não são carregados para produzir KPIs. A separação ficou explícita:

- `summary.comments`: soma de `social_posts.comment_count` no recorte analítico;
- `comments.recent` e `comments.relevant`: janela operacional dos posts da página e dos posts prioritários;
- `comments.totalAvailable`: contagem exata da janela consultada;
- `comments.totalLoaded`: quantidade efetivamente transportada, limitada a 500;
- `comments.isComplete`: guard de completude da janela.

Nenhum vínculo é fabricado. O enriquecimento dos comentários continua usando exclusivamente `instagram_comments.post_id` associado ao post real.

## 8. Completeness contract

O guard é interno, backward-compatible e não altera o visual. `totalAvailable` vem da contagem exata da consulta base; `totalLoaded` registra o volume realmente transportado. Para filtros dependentes de análise (`risk`, `sentiment`, `topic`), o total filtrado é exato quando o universo base foi integralmente carregado. Se o universo base exceder 10.000, `isComplete` permanece falso e `totalAvailable` conserva a contagem base como limite superior conservador.

## 9. Performance

Não foi encontrado N+1 por post. O baseline de 652 posts executa, na camada de dados da página:

- 1 consulta de targets;
- 2 páginas de posts;
- 5 lotes de análises, em duas ondas controladas;
- 1 consulta de comentários com count;
- chamadas de autenticação/escopo já existentes.

O custo adicional no baseline é uma página de posts em troca da remoção do truncamento silencioso. Para 3.800 posts, são oito páginas de posts e 26 lotes de análises, com concorrência limitada. Não foi criada infraestrutura, view materializada, RPC ou migration.

## 10. Testes

- direcionados: 32/32 PASS;
- suíte Vitest: 132 arquivos PASS, 5 skipped; 1.185 testes PASS, 5 skipped;
- TypeScript `--noEmit`: PASS;
- lint do escopo: PASS;
- `git diff --check` do escopo: PASS;
- build Next.js 16.2.6/Turbopack: PASS.

Casos novos cobertos:

- `engagement_quality` presente, ausente e inválido;
- `polarization_level` presente, ausente e inválido;
- universos 1.999, 2.000, 3.800 e 12.000;
- `totalAvailable`, `totalLoaded`, `isComplete` e `limit`;
- feed paginado sem alterar KPIs;
- janela de comentários sem alterar contador global;
- ausência sem dado sintético.

Os testes existentes continuam cobrindo filtros server-side, interseção de `allowedTargetIds`, multi-tenant, vínculo de comentários, drawer e estado vazio.

## 11. Regressão visual e funcional

Nenhum arquivo TSX, CSS, layout, componente visual, título, grid, spacing, header, sidebar ou drawer foi alterado. O build de todas as rotas passou. A tentativa de inspeção autenticada no navegador interno foi bloqueada pela política de URL para o endereço local; nenhuma tentativa de contorno foi realizada.

## 12. Evidências

- baseline real: 652 posts e 126.134 comentários;
- colunas V2 consultáveis no banco, com valores textuais e nulos reais;
- PostgREST/Supabase usa contagem exata na primeira página;
- paginação testada sem perda ou sobreposição de faixas;
- ordenação recebeu desempate por `id` para estabilidade entre páginas;
- todas as queries novas mantêm os mesmos filtros de tenant e candidato.

## 13. Limitações

1. Acima de 10.000 posts, o contrato detecta a incompletude, mas os agregados continuam limitados ao conjunto carregado. Resolver agregação exata ilimitada exigirá RPC/view/query agregada no banco e autorização arquitetural posterior.
2. Sob truncamento e com filtro dependente de IA, o total exato pós-filtro não pode ser conhecido apenas com as consultas atuais; o contrato permanece `isComplete = false` e usa a contagem base como limite superior conservador.
3. `summary.comments` depende de `comment_count` estruturado nos posts. No baseline, o campo está disponível nos 652 registros. Ausência futura deve motivar evolução do summary para uma métrica com disponibilidade explícita antes de consumo visual.
4. A regressão visual autenticada não foi repetida por bloqueio da política do navegador local; nenhum arquivo visual foi modificado.

## 14. Alterações realizadas

- suporte tipado aos dois sinais V2;
- ausência explícita como `UNAVAILABLE`;
- paginação analítica em batches;
- concorrência controlada;
- desempate estável da ordenação;
- guard de completude para posts e comentários;
- separação entre contador agregado de comentários e janela visual;
- novos testes de contrato e escala.

## 15. Itens deliberadamente não alterados

- schema Supabase;
- migrations;
- RLS e policies;
- `client_id`;
- n8n e Pipeline V2;
- Legacy e schedules;
- credenciais e secrets;
- UX e Design System;
- outras páginas;
- deploy e produção.

## 16. Conclusão

O Bloco 3B.6B está apto para integração com as limitações acima explicitamente registradas. Não houve merge, deploy ou avanço para o Bloco 3B.6D.
