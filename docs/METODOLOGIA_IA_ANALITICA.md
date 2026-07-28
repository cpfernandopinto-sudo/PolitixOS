# Metodologia da Leitura Analítica Assistida — PolitixOS

Ver também `docs/AUDITORIA_IA_POLITIXOS.md` (infraestrutura) e `docs/METODOLOGIA_CENTRO_EXECUTIVO.md` (metodologia determinística que alimenta este bloco).

## O que é

Um bloco opcional, gerado sob demanda, que **explica em linguagem natural** a síntese já calculada pela metodologia determinística do Centro Executivo (Sprint 3). A IA nunca decide o estado político, os riscos ou as oportunidades — isso já vem pronto. A IA apenas organiza e explica.

## Fluxo de dados

```
getExecutiveOverviewData(filters)           [lib/queries/overview.ts — já existente, Sprint 3]
        ↓
buildAnalyticsContext(...)                  [lib/ai/analytics-context.ts — sanitiza, trunca, monta contexto]
        ↓
hashAnalyticsContext(context)               [SHA-256 do contexto serializado]
        ↓
cache em memória? → sim → retorna resultado cacheado (nenhuma chamada ao modelo)
        ↓ não
ANTHROPIC_API_KEY configurada? → não → status "indisponivel" (nenhuma chamada ao modelo)
        ↓ sim
rate limit OK? → não → status "erro" (limite atingido)
        ↓ sim
Anthropic.messages.create(...)              [lib/ai/analytics-service.ts]
        ↓
extractJsonFromModelText(...)               [tolera cercas de código markdown]
        ↓
AnalyticsInsightOutputSchema.safeParse(...) [Zod — rejeita e descarta se inválido]
        ↓
stripUnknownEvidenceIds(...)                [remove evidências citadas que não existem no contexto]
        ↓
grava no cache em memória + retorna ao componente
```

## Contexto enviado ao modelo

Ver schema completo em `lib/ai/analytics-schema.ts#AnalyticsContextSchema`. Resumo do que é (e não é) incluído:

**Incluído**: versão da metodologia/prompt, período, filtros (candidato/período), estado político (label, score, fatores), síntese determinística (os 6 campos), até 8 riscos/oportunidades/mudanças/entidades/temas (já truncados e sanitizados), até 20 referências de evidência (id, tipo, url ou null, descrição curta), limitações conhecidas da metodologia (lista estática).

**Nunca incluído**: tokens de sessão, e-mail do usuário, ID interno de usuário, senha/hash, tabelas completas de notícias/posts, HTML bruto, qualquer campo não listado no schema.

## Sanitização e defesa contra prompt injection

Todo texto que se origina de notícias/posts monitorados (ex.: título de uma notícia usada como descrição de um risco) passa por `sanitizeMonitoredText` antes de entrar no contexto:
- Remove tags HTML/script.
- Neutraliza padrões que se parecem com tentativas de instrução embutida ("ignore as instruções anteriores", "system prompt", "you are now", "act as"), em português e inglês, nas duas ordens de palavras possíveis.
- É a **primeira camada** de defesa. A segunda é o próprio prompt de sistema (`lib/ai/analytics-prompt.ts#SYSTEM_PROMPT`), que instrui explicitamente o modelo a tratar todo o bloco `<CONTEXTO>...</CONTEXTO>` como dado, nunca como instrução, e a ignorar qualquer tentativa de mudança de papel contida nele.
- A terceira camada é a validação de saída: mesmo que o modelo "obedecesse" a uma instrução maliciosa e tentasse citar uma evidência inventada, `stripUnknownEvidenceIds` remove qualquer ID que não exista na lista real fornecida.

## Schema de saída (Zod)

Ver `lib/ai/analytics-schema.ts#AnalyticsInsightOutputSchema`. Campos obrigatórios: `resumo`, `pontosPrincipais` (1–5), `naoEpossivelConcluir` (**mínimo 1** — uma resposta sem nenhuma limitação é rejeitada, nunca aceita nem exibida), `confianca` (baixa/media/alta). `riscosInterpretados`, `oportunidadesInterpretadas` e `hipoteses` são arrays de `{ texto, evidenciaIds[] }`, cada um limitado a 5 itens.

Uma resposta que não passa no schema é **descartada inteiramente** — nunca exibida parcialmente, nunca "consertada" automaticamente. O usuário vê o estado "erro" com opção de tentar novamente.

## Diferenciação visual: dado, interpretação, hipótese, limitação

No componente `AssistedInsight.tsx`:
- **Dado** (síntese determinística): já exibido acima, no `ExecutiveScenarioSummary`/`PoliticalStatusCard` — a leitura assistida não repete, apenas referencia.
- **Interpretação**: seções "Riscos interpretados" (borda vermelha) e "Oportunidades interpretadas" (borda verde).
- **Hipótese**: seção "Hipóteses (não confirmadas)" (borda roxa tracejada), rótulo explícito.
- **Limitação**: seção "O que ainda não é possível concluir" (fundo neutro, sempre presente — schema exige ao menos 1 item).

## Hash e cache

`hashAnalyticsContext` usa SHA-256 sobre o contexto serializado (`JSON.stringify`, ordem de chaves estável porque `buildAnalyticsContext` sempre monta o objeto na mesma ordem). O hash muda quando qualquer dado relevante muda: score, riscos, oportunidades, mudanças, entidades, temas, filtros, ou as versões de metodologia/prompt (`METHODOLOGY_VERSION`, `PROMPT_VERSION` em `lib/ai/analytics-context.ts`) — subir a versão do prompt invalida todo o cache anterior de propósito.

### Persistência

**Nesta versão (MVP)**: cache em memória do processo Node (`Map` em `lib/ai/analytics-service.ts`). Reinicia a cada deploy/restart — aceitável para a primeira entrega, mas não sobrevive a múltiplas instâncias/regiões da Vercel (cada instância tem seu próprio cache).

**Próximo passo preparado, não aplicado**: `supabase_migration_executive_ai_insights.sql` (raiz do repositório) define a tabela `executive_ai_insights` para persistência real, compartilhada entre instâncias. **Não foi aplicada** — alterar o schema de produção requer confirmação explícita (ver comentário no topo do arquivo da migration).

## Controle de custo

- **Cache por hash**: mesmo contexto nunca gera duas vezes (a menos que o usuário clique em "Atualizar análise", que força `forceRefresh: true`).
- **Rate limit**: `checkRateLimit` — MVP global (não por usuário), 10 gerações por minuto por instância do servidor. Documentado como limitação: um rate limit por usuário/sessão exigiria estado persistente (Redis ou a própria tabela de insights), não implementado nesta sessão.
- **Timeout**: 20 segundos (`TIMEOUT_MS`), configurado no cliente Anthropic.
- **Limite de tokens de saída**: 1400 (`MAX_TOKENS`).
- **Limite de evidências no contexto**: 20 (`MAX_EVIDENCES`), 8 itens por categoria (`MAX_LIST_ITEMS`).
- **Geração nunca automática**: só ocorre ao clicar em "Gerar leitura analítica" ou "Atualizar análise" — nenhuma chamada no carregamento da página (verificado em teste, ver `AssistedInsight.test.tsx`).

## Comportamento sem provedor configurado / com falha

- Sem `ANTHROPIC_API_KEY`: status `indisponivel`, mensagem clara, **nenhuma chamada de rede é feita**. A Visão Geral determinística continua 100% funcional (validado visualmente, ver `docs/VALIDACAO_VISUAL_SPRINT_4.md`).
- Erro do provedor (timeout, resposta inválida, exceção de rede): status `erro`, mensagem genérica (sem vazar detalhes internos), botão "Tentar novamente". Nunca lança exceção para o Server Action nem trava a página.
- Dados insuficientes (`estadoPolitico.semDados`): status `dados_insuficientes`, sem sequer tentar chamar o modelo.

## Limitações da metodologia

- A leitura assistida é tão boa quanto o contexto determinístico que a alimenta — se a síntese determinística não tem dados (`semDados`), a leitura assistida também não terá.
- O rate limit é global por instância de servidor, não por usuário — em produção com múltiplas instâncias, o limite real é maior do que o configurado por instância (limitação conhecida, aceitável para o volume esperado nesta fase).
- Sem persistência real, o cache não sobrevive a um redeploy nem é compartilhado entre instâncias da Vercel.
- Não há verificação automatizada de que o modelo respeitou 100% das instruções do prompt — a defesa é em camadas (sanitização + prompt + validação de schema/evidências), não uma garantia absoluta de que o texto gerado nunca conterá uma formulação inadequada. Revisão humana permanece recomendada para uso em comunicação externa.

## Como ajustar no futuro

1. Trocar de modelo/provedor: alterar `MODEL` em `lib/ai/analytics-service.ts` e, se mudar de provedor, o bloco de chamada (a interface `getOrGenerateInsight` não muda).
2. Ajustar o prompt: editar `SYSTEM_PROMPT`/`buildUserPrompt` em `lib/ai/analytics-prompt.ts` e **subir `PROMPT_VERSION`** em `lib/ai/analytics-context.ts` (isso invalida o cache antigo automaticamente).
3. Adicionar persistência real: revisar e aplicar `supabase_migration_executive_ai_insights.sql`, depois trocar o `Map` em memória por leitura/escrita na tabela.
4. Adicionar perguntas guiadas: usar o mesmo `buildAnalyticsContext`, um novo prompt por pergunta (não um chat aberto), mesmo pipeline de validação de schema/evidências.
