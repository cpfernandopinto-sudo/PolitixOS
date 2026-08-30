# Sprint 13.1 — WhatsApp Recommended Action
## Relatório de contrato API/DTO/frontend

**Data:** 30/08/2026

**Escopo executado:** somente código da aplicação Politix

**Não alterado:** n8n, Supabase, RPC, Gemini, Z-API, dados, backfill, deploy, merge e Git remoto

## 1. Resultado executivo

O campo `whatsapp_analysis.recommended_action` não chegava ao frontend por uma falha combinada na camada de leitura:

1. a query de `whatsapp_analysis` não selecionava a coluna;
2. o mapper do feed não serializava o campo;
3. a API reutilizava esse resultado incompleto;
4. o DTO e o drawer já conheciam o nome, mas o DTO o tratava como opcional e o drawer só mostrava o bloco quando havia valor.

A correção foi limitada ao transporte e à apresentação do campo. A análise mais recente por `message_id` passou a ser escolhida deterministicamente por `analyzed_at`, evitando que uma linha histórica schema `1.0` com valor nulo esconda uma análise `1.1` mais nova e preenchida.

## 2. Inventário do caminho

| Camada | Arquivo | Responsabilidade | Alterado? |
|---|---|---|---:|
| API messages | `app/api/whatsapp-intelligence/messages/route.ts` | autenticação, permissão, filtros e envelope HTTP | Não; já delegava corretamente ao repositório |
| API summary | `app/api/whatsapp-intelligence/summary/route.ts` | resumo agregado | Não; recomendação não pertence ao contrato do resumo |
| API groups | `app/api/whatsapp-intelligence/groups/route.ts` | listagem agregada de grupos | Não; recomendação não pertence ao contrato de grupos |
| Query/repositório | `lib/queries/whatsappIntelligence.ts` | select de mensagens/análises, tenant scope, mapper e paginação | Sim |
| Carregamento server-side | `lib/queries/whatsapp.ts` | compõe messages, summary, groups e filters para a página | Não; já consumia `getMessagesFeed` sem descartar campos |
| Página | `app/dashboard/whatsapp/page.tsx` | resolve sessão/tenant e carrega dashboard | Não |
| DTO | `lib/types/whatsapp.ts` | contrato `WhatsAppAnalysisDTO` | Sim |
| Feed/dashboard | `components/dashboard/WhatsAppDashboard.tsx` | feed, alerta e abertura do drawer | Não; já encaminhava o item integral |
| Card do feed | `components/dashboard/WhatsAppMessageCard.tsx` | resumo compacto da mensagem | Não |
| Drawer | `components/dashboard/WhatsAppMessageDrawer.tsx` | detalhamento completo | Sim |
| Teste de query/contrato | `lib/queries/whatsappIntelligence.test.ts` | select, mapper, versões, tenant e permissão | Sim |
| Teste de UI | `components/dashboard/WhatsAppDashboard.test.tsx` | abertura do drawer e estados string/null | Sim |
| Testes auxiliares | `lib/queries/whatsapp.test.ts`, `lib/navigation/appScreens.test.ts` | regressão do módulo e permissão de tela | Não |

Não há endpoint `GET /messages/{id}` nesta versão; o drawer usa o mesmo item retornado por `GET /messages`.

## 3. Diagnóstico do contrato anterior

Classificação encontrada:

- **A — não era consultado:** sim;
- **B — era descartado pelo mapper:** sim, pois o mapper não possuía a propriedade;
- **C — chegava à API sem DTO:** não; não chegava à API;
- **D — chegava ao frontend mas não era renderizado:** não no fluxo real; apenas fixtures podiam preencher o campo.

Caminho anterior:

```text
whatsapp_analysis.recommended_action
→ ausente do SELECT
→ ausente do mapper
→ ausente de GET /messages
→ DTO opcional
→ drawer sem valor e bloco oculto
```

## 4. Implementação realizada

### Query e mapper

O select do feed agora inclui:

```text
recommended_action
confidence
schema_version
prompt_version
analyzed_at
```

Os campos analíticos anteriores foram preservados explicitamente. Um mapper tipado converte `ai_summary` para `summary` e transporta `recommended_action` sem fallback ou transformação.

Quando coexistem análises de versões diferentes para a mesma mensagem, a aplicação seleciona a de maior `analyzed_at`.

### API

`GET /api/whatsapp-intelligence/messages` passa a responder:

```json
{
  "analysis": {
    "recommended_action": "string ou null"
  }
}
```

O envelope, paginação, autenticação, permissão e tenant scope não foram alterados.

### DTO

O contrato passou de propriedade opcional para propriedade explícita e nullable:

```ts
recommended_action: string | null;
```

Isso diferencia corretamente “campo ausente no contrato” de “análise histórica sem recomendação”.

### Frontend

O drawer mantém o padrão visual âmbar já usado por Instagram, Facebook e X. Não existe componente compartilhado compatível; os módulos implementam blocos locais com o mesmo padrão visual.

Ordem no WhatsApp:

```text
Resumo Factual (IA)
→ Ação Recomendada pela IA
→ Tema / Subtema / Intenção
```

Com valor nulo, o bloco mostra apenas o estado neutro:

```text
Não disponível para esta análise.
```

Não foi criado botão, envio, resposta automática ou integração com WhatsApp.

## 5. Compatibilidade histórica e dados controlados

Uma consulta read-only confirmou:

| Schema | Análises COMPLETED | Com recomendação | Sem recomendação |
|---|---:|---:|---:|
| `1.0` | 4 | 0 | 4 |
| `1.1` | 2 | 2 | 0 |

- O caso histórico de Edson Moreira permanece intocado.
- Nenhuma mensagem foi consultada por conteúdo, enviada ou reprocessada.
- Nenhum backfill foi executado.
- `null` continua sendo valor válido para schema `1.0`.
- As análises controladas `1.1` comprovam que o backend já dispõe de valores preenchidos.

## 6. Preservação do contrato existente

Os testes verificam que continuam intactos:

- `theme`;
- `subtheme`;
- `sentiment`;
- `sentiment_score`;
- `relevance`;
- `ai_summary` → `summary`;
- `intent`;
- `risk_level`;
- `mentioned_candidates`;
- `mentioned_entities`;
- `mentioned_locations`;
- `confidence`;
- `schema_version`;
- `prompt_version`;
- `analyzed_at`;
- `analysis_status` no item da mensagem.

## 7. Segurança

- O `client_id` continua vindo exclusivamente da sessão.
- Queries de mensagens, chats e análises continuam filtradas pelo tenant para não-admin.
- Usuário sem permissão `whatsapp` continua recebendo `403`.
- O select não inclui `raw_response` nem payload do provider.
- A chave administrativa permanece exclusivamente server-side.

Os testes existentes de escopo e permissão permaneceram verdes.

## 8. Testes executados

### TypeScript

```text
npx tsc --noEmit
PASS
```

### Testes específicos WhatsApp e permissão

Comando:

```text
npx vitest run lib/queries/whatsappIntelligence.test.ts lib/queries/whatsapp.test.ts components/dashboard/WhatsAppDashboard.test.tsx lib/navigation/appScreens.test.ts
```

Resultado:

```text
4 arquivos aprovados
43 testes aprovados
0 falhas
```

Cobertura adicionada:

1. select contém `recommended_action` e todos os campos anteriores;
2. mapper transporta string preenchida;
3. mapper preserva `null`;
4. schema `1.0` permanece compatível;
5. schema `1.1` permanece compatível;
6. análise mais recente é escolhida quando `1.0` e `1.1` coexistem;
7. drawer exibe ação preenchida;
8. drawer exibe estado neutro para `null`;
9. tenant derivado da sessão continua preservado;
10. permissão `whatsapp` continua obrigatória.

### Suíte global

```text
npx vitest run
183 arquivos aprovados, 5 ignorados
1.597 testes aprovados, 5 ignorados
0 falhas
```

## 9. Git e escopo

Comandos executados:

```text
git status --short
git diff --stat
git diff --name-only
git diff --check
```

`git diff --check`: sem erros.

Nenhum `git add`, commit, push, PR, merge ou deploy foi executado. Arquivos não rastreados preexistentes e não relacionados foram preservados sem alteração.

## 10. Quadro obrigatório

**CAUSA DA AUSÊNCIA NO FRONTEND:**

`recommended_action` não era selecionado de `whatsapp_analysis` nem serializado pelo mapper do feed; assim, nunca chegava ao payload real de `/messages`, apesar de já existir como campo opcional no type e no drawer.

**QUERY:**

ALTERADA

**API:**

ALTERADA — por meio do read model retornado por `getMessagesFeed`; Route Handler e envelope permaneceram intactos.

**DTO:**

ALTERADO

**FRONTEND:**

ALTERADO

**recommended_action STRING:**

OK

**recommended_action NULL:**

OK

**SCHEMA 1.0:**

COMPATÍVEL

**SCHEMA 1.1:**

COMPATÍVEL

**TSC:**

PASS

**TESTES WHATSAPP:**

43/43 PASS no conjunto específico WhatsApp + permissão/navegação.

**TESTES GLOBAIS:**

1.597 PASS, 5 SKIPPED, 0 FAIL.

**ARQUIVOS MODIFICADOS:**

- `lib/queries/whatsappIntelligence.ts`;
- `lib/types/whatsapp.ts`;
- `components/dashboard/WhatsAppMessageDrawer.tsx`;
- `lib/queries/whatsappIntelligence.test.ts`;
- `components/dashboard/WhatsAppDashboard.test.tsx`;
- `SPRINT13_1_WHATSAPP_RECOMMENDED_ACTION_APP_REPORT.md`.

**ALTERAÇÕES FORA DO ESCOPO:**

NENHUMA

**RELEASE GATE:**

APROVADO PARA PREVIEW
