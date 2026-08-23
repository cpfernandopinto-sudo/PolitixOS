# POLITIXOS — Facebook Bloco 5C — Migração cirúrgica Anthropic → Gemini

Data: 22/08/2026
Branch: `codex/facebook-bloco1`

## 1. Resumo executivo

O motor interno de Facebook Analytics foi migrado de Anthropic para Google Gemini sem alterar o endpoint, payload, respostas públicas, schema analítico, prompt, idempotência ou persistência. O runner agora usa o padrão Gemini já homologado no PolitixOS e foi validado com uma chamada real ao `gemini-2.5-flash` sobre um post Facebook real, mantendo a persistência somente em memória para não adulterar as oito análises existentes.

## 2. Causa da divergência

O Bloco 4 implementou `runFacebookAnalysis` diretamente com Anthropic/Claude Sonnet 5, enquanto a arquitetura definida para a automação Facebook é Gemini. O provider é detalhe interno e não deveria exigir alteração no contrato já integrado pelo n8n.

## 3. Implementação anterior

- SDK `@anthropic-ai/sdk` importado pelo runner Facebook;
- `ANTHROPIC_API_KEY`;
- modelo `claude-sonnet-5`;
- `client.messages.parse()` com `output_config`;
- função interna `callAnthropic`;
- Zod continuava como validador final.

## 4. Implementação Gemini

- SDK oficial já instalado: `@google/genai` 2.17.1;
- `GoogleGenAI` com timeout de 60 segundos;
- `GEMINI_API_KEY` somente server-side;
- `client.models.generateContent()`;
- `responseMimeType: application/json`;
- `responseJsonSchema` derivado do mesmo `FacebookAnalysisOutputSchema`;
- `thinkingConfig: { thinkingBudget: 0 }`;
- parsing JSON controlado e Zod soberano após a resposta;
- classificação de erros reaproveitada de `classifyGeminiError`;
- recusa/safety tratada como falha isolada do post;
- provenance futura registra `provider=gemini` e o modelo.

Não foi adicionado retry ao runner: foi preservada a política existente de uma tentativa por post e retry externo controlado pelo n8n/endpoint.

## 5. Arquivos alterados

- `lib/facebook/analysis-runner.ts`;
- `lib/facebook/analysis-runner.test.ts`;
- `FACEBOOK_BLOCO5C_CODEX_GEMINI_MIGRATION_RELATORIO.md`.

Nenhum arquivo de Instagram, X, UX ou n8n foi alterado. Nenhuma dependência foi adicionada ou removida.

## 6. Modelo Gemini utilizado

`gemini-2.5-flash`, o mesmo default homologado em `lib/territorios/intelligence/interpretation/gemini-provider.ts`.

## 7. Structured output

O Gemini recebe:

```text
responseMimeType = application/json
responseJsonSchema = FacebookAnalysisOutputSchema convertido para JSON Schema
maxOutputTokens = 2048
thinkingBudget = 0
```

O prompt `buildFacebookAnalysisPrompt` não foi reescrito nem adaptado semanticamente. `system` segue como `systemInstruction`; `user` segue como conteúdo da requisição.

## 8. Validação Zod

`FacebookAnalysisOutputSchema.safeParse` permanece obrigatório depois do parsing. Foram comprovadas rejeições para:

- `risk_level=extremo`;
- `sentiment=negative`;
- output parcial/incompleto;
- JSON ausente ou inválido.

Domínios preservados:

- risk: `baixo | medio | alto | critico`;
- sentiment: `positivo | negativo | neutro | misto`.

## 9. Tratamento de erros

- erros SDK Gemini passam por `classifyGeminiError`;
- auth, rate limit, timeout, rede, indisponibilidade e 5xx usam a taxonomia já homologada;
- finish reasons de safety/recusa falham de forma controlada;
- falha de um post permanece em `items` e não interrompe o batch;
- motivos internos continuam sanitizados pelo endpoint público.

## 10. Testes

- testes focados runner + endpoint: 2 arquivos, 33 testes, PASS;
- regressão final Facebook/API/analytics/Instagram/X: 21 arquivos, 164 testes, PASS;
- cobertura específica: chamada Gemini, modelo, JSON Schema, thinking zero, credential missing, output válido/inválido, enums, recusa, classificação de rede, isolamento por post, idempotência, maxPosts e persistência simulada;
- TypeScript: PASS;
- ESLint dirigido: PASS;
- `git diff --check`: PASS.

Busca final no runtime Facebook por `ANTHROPIC_API_KEY`, `Anthropic`, `claude-sonnet-5`, `callAnthropic` e `anthropicClient`: zero ocorrências.

## 11. Build

Next.js 16.2.6 production build: PASS. A rota `/api/automations/facebook/analyze` permanece presente.

## 12. E2E

O banco tinha zero posts pendentes, portanto nenhuma análise homologada foi apagada para fabricar elegibilidade.

Foi executado `REAL_PROVIDER_PATH_VALIDATED_BY_TARGETED_TEST`:

1. leitura de um post Facebook real existente;
2. chamada real ao `gemini-2.5-flash` com `GEMINI_API_KEY` do ambiente;
3. structured output real;
4. parsing e validação Zod reais;
5. chegada ao insert com `sentiment` e `risk_level` válidos;
6. insert interceptado em memória, sem escrita no Supabase.

Resultado: 1 elegível, 1 processado, 1 sucesso, 0 falha, 0 pulado. Duração total do teste: aproximadamente 8,2 segundos.

## 13. Persistência

Nenhuma nova persistência foi necessária ou autorizada. Auditoria read-only pós-E2E:

- 8 posts Facebook;
- 8 análises Facebook;
- 0 pendentes;
- 0 duplicidades de análise;
- 0 sentiments fora do enum;
- 0 risk levels fora do CHECK;
- 0 divergências client/target.

Novas análises futuras registrarão em `raw_ai_response`: `provider=gemini`, `model=gemini-2.5-flash`, versão do prompt e output validado.

## 14. Idempotência

A view de pendência e a checagem secundária em `ai_analysis` foram preservadas. O banco continua com oito análises para oito posts e zero pendentes/duplicadas. Não houve reprocessamento dos oito posts.

## 15. Regressão Instagram/X

Testes dirigidos de Instagram e X passaram. Nenhum módulo dessas plataformas foi modificado e o SDK Anthropic permanece disponível para outras funcionalidades que ainda o utilizem.

## 16. Referências Anthropic restantes e justificativa

No runtime e testes da frente Facebook Analytics: nenhuma.

Referências históricas permanecem nos relatórios dos Blocos 4/5A para preservar a trilha de auditoria. Referências em outros módulos do PolitixOS permanecem porque a migração é exclusivamente Facebook; `@anthropic-ai/sdk` não foi removido globalmente.

## 17. Riscos

- a limitação de concorrência distribuída documentada no Bloco 5A permanece inalterada;
- outputs futuros continuam dependentes da disponibilidade/cotas do Gemini, com falha isolada e retry externo;
- o primeiro E2E com persistência Gemini real ocorrerá naturalmente quando houver um post novo elegível; não se adulterou produção para forçá-lo;
- `ROTATE_FACEBOOK_RAPIDAPI_KEY_BEFORE_CONTINUOUS_PRODUCTION` permanece um débito independente da IA.

## 18. Veredito

`FACEBOOK_AI_PROVIDER = GEMINI`

`FACEBOOK_ANTHROPIC_RUNTIME_DEPENDENCY = NO`

`FACEBOOK_ANALYZE_CONTRACT_CHANGED = NO`

`N8N_CHANGE_REQUIRED = NO`

`REAL_PROVIDER_PATH_VALIDATED_BY_TARGETED_TEST = PASS`

`VEREDITO = GO`

`FACEBOOK_BLOCO5C_READY_FOR_CLAUDE_E2E = YES`

Não iniciei Antigravity, não alterei n8n, não fiz deploy e não iniciei o Bloco 6.
