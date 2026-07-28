# Auditoria de Infraestrutura de IA — PolitixOS

## Arquitetura atual (antes do Sprint 4)

O PolitixOS **não tinha nenhuma integração de IA generativa dentro da aplicação Next.js**. Toda a análise de IA já existente é produzida por um **pipeline externo (n8n)** que:

1. Coleta notícias/posts (Google News RSS, scraping de redes sociais — fora do código deste repositório).
2. Envia o conteúdo para um provedor de IA (não identificável a partir deste repositório — a chamada ao modelo acontece no workflow n8n, não aqui).
3. Grava o resultado estruturado na tabela `ai_analysis` do Supabase, vinculada por `content_id`/`content_type` a `mentions` e `social_posts`.

O Next.js **apenas lê** os campos já processados — nunca chama um modelo de IA em nenhuma rota, Server Action ou componente existente antes desta sessão.

### Campos disponíveis em `ai_analysis` (lidos pelo código já existente)

| Campo | Uso atual |
|---|---|
| `sentiment` | Badge de sentimento em Notícias/Instagram/X |
| `risk_level` | Badge de risco, regras de alerta (`lib/config/alert-thresholds.ts`) |
| `ai_topics` / `ai_topic` | Temas dominantes, ranking de temas |
| `ai_takeaways` (notícias) / `summary` | Resumo exibido no drawer de notícia e no modal/drawer de post |
| `recommended_action` | Mapa de Ação Estratégica (Visão Geral), botão "Ação Recomendada" |
| `risk_reason` | Justificativa de risco no drawer de post |
| `author_tone` / `public_reaction` | Análise "Discurso vs. Reação" (X) |
| `polarization_level` | Termômetro de crise (X), badge de polarização |
| `crisis_temperature` | Exibido no drawer de post (X) |
| `strategic_reading` | Leitura estratégica (X) — texto livre já gerado pelo pipeline externo |

Nenhum desses campos é gerado pela aplicação — todos vêm prontos do Supabase.

## Pontos de integração possíveis para IA no Next.js

Antes desta sessão, não havia:
- SDK de nenhum provedor de IA instalado (`package.json` não tinha `openai`, `@anthropic-ai/sdk`, `ai`, etc.).
- Variável de ambiente de API key de IA em `.env.local`.
- Nenhuma rota, Server Action ou serviço server-side que chamasse um modelo.

## Riscos identificados antes de implementar

1. **Custo**: qualquer chamada de IA por render ou por card seria proibitivamente cara em uma tela com múltiplos blocos (Visão Geral tem 6+ blocos executivos). Mitigado no Sprint 4 com geração única sob demanda + cache por hash (ver `docs/METODOLOGIA_IA_ANALITICA.md`).
2. **Exposição de dados sensíveis**: o contexto enviado ao modelo não pode incluir tokens de sessão, e-mails, IDs internos de usuário. Mitigado com `AnalyticsContextSchema` (Zod) restringindo exatamente os campos permitidos.
3. **Prompt injection via conteúdo monitorado**: notícias/posts são conteúdo de terceiros, não confiável. Mitigado com sanitização (`sanitizeMonitoredText`) + delimitação explícita no prompt + instrução de sistema para nunca seguir instruções embutidas no bloco de dados.
4. **Alucinação de evidências**: a IA poderia citar uma fonte que não existe. Mitigado validando cada `evidenciaId` citado contra a lista real fornecida (`stripUnknownEvidenceIds`) — IDs inventados são removidos antes de qualquer exibição/persistência.
5. **Chave exposta no cliente**: mitigado com `import 'server-only'` em `lib/ai/analytics-service.ts` (falha o build se importado de um Client Component) e chamando o serviço apenas via Server Action.

## Estratégia recomendada (adotada)

- **Provedor**: Anthropic (`@anthropic-ai/sdk`), server-side apenas. Não havia provedor já instalado no projeto — introduzir um foi necessário, mas mínimo (uma dependência, um arquivo de serviço).
- **Modelo**: `claude-sonnet-5` (constante em `lib/ai/analytics-service.ts`, fácil de trocar).
- **Cache**: em memória por hash do contexto nesta primeira versão (MVP) — ver `docs/METODOLOGIA_IA_ANALITICA.md` para a migration de persistência preparada (não aplicada).
- **Geração**: exclusivamente sob demanda (clique do usuário), nunca automática.

## Funcionalidades possíveis nesta base

- Leitura analítica assistida da Visão Geral (implementada no Sprint 4).
- Explicações contextuais por bloco (parcialmente coberto — a leitura assistida já separa riscos/oportunidades/hipóteses interpretados; explicação "por card" individual ficou fora do escopo desta sessão para não multiplicar chamadas de IA, conforme a própria diretriz do pedido).

## Funcionalidades bloqueadas / fora de escopo nesta sessão

- **Perguntas guiadas aos dados** (Parte 11 do pedido do Sprint 4): não implementada nesta sessão — exigiria uma segunda camada de prompt/schema por pergunta, tratamento de contexto adicional por pergunta, e mais testes; registrada como próximo passo (Sprint 5).
- **Persistência real do cache** (tabela `executive_ai_insights`): migration preparada, não aplicada — requer confirmação explícita antes de alterar o schema de produção.
- **Validação com chave de API real**: este ambiente de desenvolvimento não tem `ANTHROPIC_API_KEY` configurada — o fluxo completo de geração foi validado com o provedor mockado (testes automatizados) e com o estado real "indisponível" (validação visual, ver `docs/VALIDACAO_VISUAL_SPRINT_4.md`). A chamada real ao modelo Anthropic não foi exercida end-to-end nesta sessão.
