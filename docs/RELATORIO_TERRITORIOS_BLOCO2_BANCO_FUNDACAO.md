# POLITIX TERRITÓRIOS — Bloco 2: Fundação do Banco Territorial + Contratos Técnicos

**Sprint 11 · Relatório técnico**
**Base:** decisões homologadas em [docs/RELATORIO_TERRITORIOS_BLOCO1_FUNDACAO.md](docs/RELATORIO_TERRITORIOS_BLOCO1_FUNDACAO.md).
**Status:** implementação da fundação concluída. Migration criada, **não aplicada** (gate Supabase — Seção 14). Aguardando homologação humana antes do Bloco 3.

---

## 1. Arquivos criados

| Arquivo | Conteúdo |
|---|---|
| `supabase_migration_territories_foundation.sql` | DDL das 5 tabelas homologadas, idempotente, **não aplicada** |
| `lib/types/territories.ts` | Tipos + `isValidIbgeCode` |
| `lib/queries/territories.ts` | `getTerritories`, `getTerritoriesByUf`, `getTerritoryByIbgeCode`, `getTerritoryById`, `getAvailableUfs` |
| `lib/actions/territories.ts` | `createTerritoryIfMissing`, `createTerritoryBriefingRequest`, `getMunicipiosByUfAction` |
| `lib/actions/territories.test.ts` | 11 testes (validação, idempotência, autorização) |
| `lib/navigation/dashboardNavigation.test.ts` | 5 testes (permissão/bypass do item Territórios) |
| `proxy.test.ts` | 4 testes (proteção de rota `/dashboard/territorios`) |
| `components/territorios/TerritorySelector.tsx` | Seletor UF → Município |
| `components/territorios/BriefingStatus.tsx` | Badge de status do briefing (7 estados) |
| `components/territorios/TerritoryEmptyState.tsx` | Estado vazio profissional |
| `app/dashboard/territorios/page.tsx` | Server Component da rota |
| `app/dashboard/territorios/TerritoriosClient.tsx` | Orquestração client-side da tela |
| `app/dashboard/territorios/TerritoriosClient.test.tsx` | 3 testes (vazio, seleção, geração) |
| `docs/RELATORIO_TERRITORIOS_BLOCO2_BANCO_FUNDACAO.md` | Este relatório |

## 2. Arquivos modificados (aditivo, conforme autorizado na Seção 6 do briefing)

- `lib/auth/types.ts` — `'territorios'` adicionado a `ALL_SCREENS` (uma linha).
- `proxy.ts` — `'/dashboard/territorios': 'territorios'` adicionado a `SCREEN_MAP` (uma linha).
- `lib/navigation/dashboardNavigation.tsx` — import do ícone `MapPin` + item "Territórios" no grupo "Inteligência", `permission: 'territorios'`, sem `adminOnly`.

Nenhum outro arquivo existente foi tocado. `CLAUDE.md`/`AGENTS.md` não foram alterados, conforme instruído.

## 3. DDL final

Arquivo completo: [supabase_migration_territories_foundation.sql](supabase_migration_territories_foundation.sql). Resumo das 5 tabelas (colunas completas no arquivo):

- **`territories`** — catálogo global. `codigo_ibge text unique`, `uf char(2) check (char_length(uf)=2)`, `municipio`, `regiao`, `geometria jsonb` (placeholder, sem PostGIS), `metadata jsonb`.
- **`territory_indicators`** — contrato único de indicador, com os campos aprovados na revisão humana do Bloco 1: `source_dataset`, `source_record_id`, `source_updated_at`. `check (valor is not null or valor_texto is not null)`.
- **`territory_evidence`** — contrato único de evidência, com `source_external_id` adicionado.
- **`territory_collection_runs`** — com `workflow_name`/`workflow_version` adicionados, `status` restrito por `CHECK` textual (`pending|running|partial|completed|failed`).
- **`territory_briefings`** — `target_id`/`requested_by` nullable, `status CHECK` textual (7 estados), sem `UNIQUE` (histórico preservado por design).

## 4. Estratégia de idempotência utilizada

- **`territories`**: `unique(codigo_ibge)` simples — chave natural sem nulos.
- **`territory_indicators`**: **não** usei `UNIQUE` simples sobre `(territory_id, categoria, indicador, periodo_inicio, periodo_fim, fonte)` porque no Postgres `NULL` nunca é igual a `NULL` numa constraint `UNIQUE` — todo indicador "sem período" geraria uma linha nova a cada re-execução. Solução: **índice único sobre expressão com `COALESCE`**, colapsando `periodo_inicio`/`periodo_fim`/`source_dataset` nulos em sentinelas determinísticos (`'0001-01-01'`, `''`). Incluí `source_dataset` na chave natural (além dos campos já homologados) porque a mesma `fonte` pode publicar o mesmo `indicador` a partir de datasets diferentes para o mesmo período (ex.: IBGE/SIDRA vs. IBGE/Censo) — tratar isso como a mesma linha seria uma colisão indevida. Decisão documentada em comentário no próprio SQL.
- **`territory_evidence`**: `unique(territory_id, source_hash)` — mesmo espírito do `hash` já existente em `mencoes`.
- **`territory_collection_runs`/`territory_briefings`**: sem `UNIQUE` proposital — são eventos/histórico, não estado; idempotência vive nos dados que produzem, não nos próprios registros de execução (conforme já definido no Bloco 1).

## 5. Índices criados

`territories`: `codigo_ibge`, `uf`, `municipio`, composto `(uf, municipio)`.
`territory_indicators`: índice único natural (Seção 4), `territory_id`, `categoria`, `fonte`.
`territory_evidence`: índice único `(territory_id, source_hash)`, `territory_id`, `source_type`, `published_at`, `tema`.
`territory_collection_runs`: `request_id`, `territory_id`, `source`, `status`, `created_at desc`.
`territory_briefings`: `territory_id`, `target_id`, `request_id`, `status`, `created_at desc`.

## 6. RLS/policies

RLS habilitado nas 5 tabelas com policy `allow_all_*` (`using (true) with check (true)`), idêntico ao padrão de `supabase_migration_access_control.sql` — autorização real acontece nas Server Actions (`requireAuth` + `allowedTargetIds`), não no Postgres. Nenhuma arquitetura de tenancy nova foi inventada; não houve tentativa de migrar para Supabase Auth.

## 7. Tipos TypeScript

`lib/types/territories.ts`: `Territory`, `TerritoryIndicator`, `TerritoryEvidence`, `TerritoryCollectionRun` (+ `CollectionRunStatus`), `TerritoryBriefing` (+ `TerritoryBriefingStatus`), `CreateTerritoryInput`, `CreateBriefingInput`, `TerritoryFilters`, `isValidIbgeCode`. Sem `any` em nenhum ponto; campos JSON tipados como `unknown`/`Record<string, unknown>` e refinados no ponto de uso, seguindo o padrão de `full_report: unknown` em `lib/types/investigations.ts`.

## 8. Queries implementadas

`lib/queries/territories.ts`: `getTerritories(filters)`, `getTerritoriesByUf(uf)`, `getTerritoryByIbgeCode(codigo)`, `getTerritoryById(id)`, `getAvailableUfs()`. Todas seguem o padrão de tolerância a falha de `lib/queries/investigations.ts` (erro logado, retorno `[]`/`null`) — cobre tanto uma falha real de rede/permissão quanto o caso da migration ainda não ter sido aplicada (tabela inexistente), sem quebrar a aplicação em runtime.

## 9. Server Actions implementadas

- `createTerritoryIfMissing(input)` — upsert idempotente por `codigo_ibge` (primitiva para o futuro Motor IBGE; não dispara nada sozinha).
- `createTerritoryBriefingRequest(input)` — valida `codigo_ibge`, autentica (`requireAuth`), aplica `allowedTargetIds` quando `target_id` é informado (admin bypassa), busca o território (falha com `TERRITORY_NOT_FOUND` se a base estiver vazia — **não fabrica território a partir de um código arbitrário**), cria `territory_briefings` com `status='nao_iniciado'` e `request_id = randomUUID()`. **Não dispara n8n.**
- `getMunicipiosByUfAction(uf)` — wrapper de leitura chamável do client component, mesmo padrão de `fetchTargetsAction` em `lib/actions/candidatos.ts`.

## 10. Comportamento da nova permissão

`screen_key = 'territorios'` adicionado a `ALL_SCREENS`. **Não foi concedido automaticamente a nenhum usuário existente** — `gestor`/`visualizador` precisam de concessão explícita via `/dashboard/usuarios` (mesmo fluxo de qualquer tela nova). Confirmado: a tela de Usuários já lista `territorios` automaticamente via `ALL_SCREENS.map(...)` (com fallback `SCREEN_LABELS[key] ?? key` quando não há rótulo amigável — ver Seção 18, divergência #1). Admin mantém bypass total, sem alteração de comportamento.

## 11. Tela criada

`/dashboard/territorios`: header no padrão das demais telas (ícone + título + subtítulo), reaproveita 100% do shell existente (Header/Sidebar/layout do `dashboard/layout.tsx`, nada duplicado). Corpo: `TerritorySelector` (UF → Município, sem hardcode — populado só pelo que já está em `territories`) + botão "Gerar Briefing" (desabilitado até selecionar município) + `BriefingStatus`. Quando `getAvailableUfs()` retorna `[]` (base vazia, caso atual), a tela renderiza `TerritoryEmptyState` com a mensagem "Base territorial ainda não inicializada." em vez de qualquer opção fictícia.

## 12. Testes adicionados

23 testes novos, todos passando:
- `lib/actions/territories.test.ts` (11): validação de `codigo_ibge`, idempotência de `createTerritoryIfMissing` (upsert por `codigo_ibge`, normalização de UF), `TERRITORY_NOT_FOUND` com base vazia, bloqueio de `target_id` fora de `allowedTargetIds`, permissão dentro do escopo, bypass de admin, `target_id` nullable (briefing genérico), erro estruturado de banco.
- `lib/navigation/dashboardNavigation.test.ts` (5): `ALL_SCREENS` contém `territorios`, item existe no grupo certo, bypass de admin, bloqueio de `gestor`/`visualizador` sem concessão, liberação quando concedido.
- `proxy.test.ts` (4): sem sessão → `/login`; sem permissão → `/dashboard/sem-permissao`; com permissão → passa; admin → passa (bypass).
- `app/dashboard/territorios/TerritoriosClient.test.tsx` (3): estado vazio sem opções falsas, botão desabilitado até seleção, fluxo completo de criação da solicitação (status `nao_iniciado`).

## 13. Resultados de tsc/vitest/build

```
PROJECT_ID CONFIRMADO: NÃO
MIGRATION CRIADA: SIM
MIGRATION APLICADA: NÃO

npx tsc --noEmit   → OK, 0 erros
npx vitest run     → 24 arquivos de teste, 210 testes, 210 passando (baseline não regrediu)
npm run build      → sucesso (Next.js 16.2.6/Turbopack). Rota /dashboard/territorios listada
                      como "ƒ" (dinâmica, server-rendered), Proxy (Middleware) compilado sem erro.
```

## 14. Project_id identificado ou não

**NÃO identificado.** Confirmação da auditoria do Bloco 1: não existe `.env.local`/`.env.example` neste repositório, e a conta Supabase acessível via MCP nesta sessão lista projetos de **outros clientes** (`Check-list Qualidade`, `biotech-compras`) ao lado de um projeto ativo sem nome que o vincule inequivocamente ao PolitixOS. Não há como aplicar as verificações da Seção 22 do briefing (confirmar presença de `targets`/`app_users`/`app_user_permissions`, descartar ser o banco de outro cliente) sem essa confirmação prévia — por isso a regra absoluta da Seção 21 foi seguida à risca: migration criada localmente, **não executada remotamente**.

## 15. Migration aplicada ou não

**NÃO aplicada.** `supabase_migration_territories_foundation.sql` está pronta para revisão manual (SQL Editor do Supabase), com o mesmo cabeçalho de status "NÃO APLICADA" usado em `supabase_migration_executive_ai_insights.sql`. Nenhum comando SQL foi executado contra qualquer projeto Supabase nesta sessão.

## 16. Riscos encontrados

1. **Bloqueio real de continuidade**: sem o `project_id` correto, o Bloco 3 (primeira integração real, ex. Motor IBGE) não pode persistir nada de verdade. Este é o gate mais urgente para o usuário resolver.
2. **`SCREEN_LABELS` sem entrada para `territorios`**: a tela de Usuários exibirá o rótulo cru `"territorios"` em vez de "Territórios" até que alguém adicione a entrada em `app/dashboard/usuarios/UsuariosClient.tsx`. Não corrigi isso porque esse arquivo não está na lista de alterações aditivas autorizadas na Seção 6 do briefing — ver divergência na Seção 18.
3. **`getMunicipiosByUfAction`/`createTerritoryBriefingRequest` dependem de `territories` já populada** — com a migration não aplicada, qualquer chamada real (fora dos testes, que mockam o client) retornará lista vazia / `TERRITORY_NOT_FOUND`, o que é o comportamento correto e esperado neste bloco, mas vale registrar para não ser confundido com bug quando o Bloco 3 começar.
4. **`territory_indicators.valor`/`valor_texto`**: o `CHECK (valor is not null or valor_texto is not null)` impede uma linha totalmente vazia, mas não impede os dois preenchidos simultaneamente (caso legítimo — ex. valor numérico + rótulo textual da faixa). Não é um risco, é uma decisão de design a confirmar se fizer sentido no Bloco 3.

## 17. Pendências para o Bloco 3

- Confirmar `project_id` do Supabase de produção e aplicar a migration (com as verificações da Seção 22 do briefing do Bloco 2).
- Popular `territories` (Motor IBGE) — fora de escopo até aqui, propositalmente.
- Decidir e implementar `app/api/territorios/generate/route.ts` (ver justificativa de adiamento na Seção 18, divergência #2) quando houver de fato um webhook n8n para apontar.
- Adicionar rótulo amigável de `territorios` em `SCREEN_LABELS` (`UsuariosClient.tsx`) — mudança trivial, mas fora do escopo aditivo autorizado neste bloco.
- Avaliar se `createTerritoryIfMissing` deve ficar restrito a `admin`/service role quando ganhar um caller real (hoje aceita qualquer usuário autenticado, por não ter uso de UI neste bloco).

## 18. Divergências em relação à arquitetura homologada

1. **Rótulo de permissão na tela de Usuários**: `ALL_SCREENS` já lista `territorios` automaticamente (confirmado, nenhuma lógica paralela criada, conforme pedido). Mas o rótulo amigável em `SCREEN_LABELS` não foi adicionado porque `UsuariosClient.tsx` não está entre os 3 arquivos aditivos autorizados na Seção 6 do briefing — o fallback `?? key` já deixa a tela funcional (mostra `"territorios"` em vez de `"Territórios"`), então não bloqueia nada, apenas fica menos bonito até ser autorizado.
2. **`app/api/territorios/generate/route.ts` NÃO foi criado.** O briefing (Seção 14) permitia essa escolha, pedindo justificativa. Optei por adiar porque, sem `N8N_TERRITORIOS_WEBHOOK_URL`/`N8N_TERRITORIOS_API_KEY` reais e sem um workflow n8n do outro lado, a rota só poderia responder "motor não conectado" incondicionalmente — isso é código que existe apenas para anunciar sua própria inexistência, o que se enquadra em "código morto" pela definição do próprio briefing. A `Server Action` `createTerritoryBriefingRequest` já cobre o estado necessário para este bloco (cria o registro em `nao_iniciado`) sem essa rota. O padrão de referência (`app/api/investigations/start/route.ts`) está documentado e pronto para ser replicado assim que houver credenciais reais no Bloco 3.
3. **Nenhuma outra divergência.** Nomes de tabelas/colunas, consolidação (sem `territory_demographics/health/security/elections/finance/news`), `target_id` nullable, ausência de PostGIS, e os 3 arquivos aditivos seguem exatamente o homologado no Bloco 1.

---

## ATUALIZAÇÃO PARA O NOTION

**Sprint 11 — itens executados (Bloco 2):**
- [x] Migration SQL territorial criada (`territories`, `territory_indicators`, `territory_evidence`, `territory_collection_runs`, `territory_briefings`) — não aplicada, aguardando `project_id`.
- [x] Contratos TypeScript territoriais (`lib/types/territories.ts`).
- [x] Queries de leitura territorial com fallback gracioso (`lib/queries/territories.ts`).
- [x] Server Actions fundacionais: criação idempotente de território, criação de solicitação de briefing (sem disparo de n8n), busca de municípios por UF (`lib/actions/territories.ts`).
- [x] Permissão `territorios` cadastrada (`ALL_SCREENS`), sem concessão automática a usuários existentes.
- [x] Rota `/dashboard/territorios` protegida (`proxy.ts`) e item de navegação no grupo Inteligência.
- [x] Tela mínima funcional: seleção UF → Município (sem hardcode), botão "Gerar Briefing", estados do briefing, estado vazio profissional.
- [x] 23 testes novos cobrindo permissão, autorização, idempotência, validação e UI — suíte completa (210 testes) sem regressão.
- [x] `tsc --noEmit`, `vitest run` e `npm run build` verdes.

**Itens parcialmente executados:**
- [~] Observabilidade de execução (`territory_collection_runs`): schema pronto, sem nenhum motor gravando nele ainda (esperado — fora de escopo do Bloco 2).
- [~] Rótulo amigável da nova permissão na tela de Usuários: funcional via fallback, texto não polido (pendência trivial, Seção 17).

**Itens ainda pendentes (Bloco 3+):**
- [ ] Confirmação do `project_id` Supabase de produção e aplicação da migration.
- [ ] Motor IBGE (primeira fonte real, carga do catálogo de municípios).
- [ ] `app/api/territorios/generate/route.ts` + primeiro workflow n8n real.
- [ ] Demais motores (DATASUS, Segurança, TSE, SICONFI, Perplexity, Notícias) — não iniciados, conforme gate.
- [ ] Classificação IA / geração real do conteúdo do briefing.
- [ ] Heatmap / mapa municipal.

**Itens adicionados fora do escopo original do Sprint (justificados, sem expandir integrações):**
- Testes de proteção de rota (`proxy.test.ts`) e de permissão de navegação (`dashboardNavigation.test.ts`) — não estavam nomeados explicitamente nos contratos do Bloco 1, mas eram necessários para cumprir a exigência de testes do próprio Bloco 2 ("permissão da nova screen_key", "rota protegida").

---

**Gate respeitado nesta execução:** nenhuma integração externa foi implementada, nenhum município foi carregado, nenhum workflow n8n foi criado, nenhum dado mockado foi inserido, nenhum módulo existente (Visão Geral/Notícias/Instagram/X/Investigações/Politix IA) foi alterado, `CLAUDE.md`/`AGENTS.md` não foram tocados, nenhuma migration foi aplicada, nenhum deploy ou push foi feito. Aguardando homologação humana antes do Bloco 3.
