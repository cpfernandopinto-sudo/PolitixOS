# PolitixOS — Territórios — Relatório do Bloco 5.10

## 1. Baseline

O Bloco 5.9 foi preservado integralmente como input canônico: seis municípios, pleitos 2016/2020/2024, 18 combinações, 9.330 indicadores, 54 evidências e 162 sinais determinísticos. `electoral-analytics.ts` e `electoral-intelligence.ts` não foram alterados.

## 2. Objetivo e arquitetura

Foi criado um Context Builder puro para organizar os fatos comprováveis necessários a uma futura camada de interpretação:

`fonte → fato → métrica → comparação → sinal → contexto estruturado`

O bloco encerra no contexto. Não há IA, interpretação, recomendação, previsão ou narrativa livre.

## 3. Contrato e schemaVersion

`ElectoralInterpretationContext` possui versão fixa `electoral-context-v1` e separa território, escopo, eleições, snapshot atual, histórico, participação, competição, vencedor, partido, turno, benchmark, sinais, mudanças-chave, proveniência, fontes, limitações, dados ausentes, guardrails e assertions.

Metadados temporais não integram o contrato. O payload canônico não depende de relógio, timezone, locale, banco ou ordem implícita.

## 4. Seleção de contexto e relevância

Regras determinísticas:

1. conservar um fato eleitoral estruturado para cada um dos três pleitos;
2. usar 2024 como snapshot atual por ser o último fato cronológico disponível;
3. selecionar como `keyChanges` todos os sete sinais comparativos de 2020→2024: eleitorado, participação, abstenção, margem, vencedor, partido e turno;
4. selecionar os três benchmarks homologados de 2024: participação, abstenção e margem;
5. manter valores assinados e proveniência; não produzir score de importância política.

Resultado por município: três fatos, sete mudanças-chave e dez sinais selecionados. Os 27 sinais originais continuam disponíveis no input 5.9, mas não viajam todos como igualmente relevantes.

## 5. Current snapshot e histórico

O snapshot 2024 inclui eleitorado, comparecimento, taxas de participação e abstenção, votos válidos, vencedor e partido, segundo colocado e partido, margem em votos e pontos percentuais, turno, status oficial e proveniência.

Os fatos de 2016 e 2020 permanecem em `historicalEvolution`; os três anos também são expostos cronologicamente em vetores específicos de participação, competição, vencedor, partido e turno.

## 6. Key changes

Foram selecionadas 42 mudanças recentes, sete por município. Exemplos canônicos de Contagem em 2020→2024: participação -0,313 p.p.; margem +19,049 p.p.; vencedor mantido; partido mantido; turno 2→1. Os valores são sinais reutilizados do 5.9, não recalculados.

## 7. Benchmark

Cada comparação transporta universo `homologated-six-municipality-sample`, label `amostra homologada de seis municípios`, média da amostra, valor municipal, delta, tipo do sinal e proveniência. Não há denominação RMBH, MG ou Brasil.

## 8. Signals e distinção de camadas

Os sinais selecionados preservam `COMPARATIVE_SIGNAL`. Fatos e benchmarks possuem `assertionClass: FACT`. Os arrays reservados para `INTERPRETATION` e `RECOMMENDATION` permanecem vazios.

## 9. Proveniência e sourcesUsed

Cada fato e sinal mantém território, anos, indicator keys, datasets e evidence hashes. `sourcesUsed` consolida datasets e hashes sem duplicação, ordenados deterministicamente. Nenhuma fonte, URL ou hash foi criado ou alterado.

## 10. Limitations

O contexto carrega explicitamente: benchmark restrito à amostra de seis municípios; apenas 2016/2020/2024; ausência de classificação ideológica, pesquisa de opinião, previsão e causalidade; natureza matemática/determinística dos sinais; interpretação ainda não executada.

## 11. Guardrails

O futuro consumidor poderá descrever evolução, comparar valores, destacar mudanças observadas, interpretar sinais com linguagem qualificada e relacionar fatos do contexto. Não poderá inventar causa, intenção, opinião, pesquisa, ideologia ou números; prever resultado como fato; converter correlação em causalidade; omitir limitações; ou representar a amostra como RMBH/MG/Brasil.

## 12. Casos de regressão

- **Contagem:** histórico PSDB/ALEX/45,918/2 → PT/MARÍLIA/2,704/2 → PT/MARÍLIA/21,753/1 e participação 79,193→77,060→76,747 preservados.
- **Belo Horizonte:** em 2020→2024, `WINNER_CHANGED` e `WINNING_PARTY_MAINTAINED` coexistem corretamente.
- **Betim:** 2016→2020 preserva vencedor e muda partido; 2020→2024 muda vencedor e partido.

## 13. Compactação

- Indicadores de origem: 9.330.
- Sinais de origem: 162.
- Fatos selecionados: 18.
- Mudanças-chave selecionadas: 42.
- Sinais selecionados: 60.
- JSON bruto de indicadores + evidências: 6.260.289 bytes.
- JSON final dos seis contextos: 313.684 bytes.
- Redução aproximada: 94,989%.
- Contexto por município: 43.733 a 59.967 bytes.

A proveniência não foi removida para reduzir tamanho.

## 14. Determinismo e read-only

- Hash 1: `56105e59366712aa2f3066cb5a7acdaba8517098e78086aa913804f1fa7c6362`.
- Hash 2: `56105e59366712aa2f3066cb5a7acdaba8517098e78086aa913804f1fa7c6362`.
- Determinismo: PASS.
- Indicadores antes/depois: 9.330/9.330.
- Evidências antes/depois: 54/54.
- Mutações: 0.

## 15. Testes negativos

Auditoria do escopo: OpenAI 0, Anthropic 0, Perplexity 0 e chamadas LLM 0. O payload não contém as frases livres proibidas e não preenche interpretação ou recomendação.

## 16. Performance

- Auditoria total com leituras remotas antes/depois: 19.925,132 ms.
- Context Builder por município, primeira execução: 0,020 a 0,478 ms.
- Context Builder por município, segunda execução: 0,012 a 0,038 ms.
- Memória RSS inicial/média/pico/final: 116,15/80,55/116,15/79,36 MB.

## 17. Testes e qualidade

- Testes novos: 11/11 PASS.
- Testes relacionados: 61/61 PASS em 12 arquivos.
- TypeScript: PASS.
- ESLint do escopo: PASS sem warnings.
- Build de produção: PASS.

## 18. Arquivos alterados

- `lib/territorios/electoral-interpretation-context.ts`
- `lib/territorios/electoral-interpretation-context.test.ts`
- `scripts/audit-electoral-interpretation-context.ts`
- `docs/RELATORIO_TERRITORIOS_BLOCO5_10_CONTEXTO_INTERPRETACAO_ELEITORAL.md`

## 19. Limitações operacionais

O contexto não é persistido e não está integrado ao frontend. Não houve alteração de schema, migration, Motor TSE, analytics, intelligence, n8n, UX, segurança, território, deploy ou merge.

## 20. Gate final

Status: **HOMOLOGADO**. Liberado somente para planejamento da camada de interpretação, aguardando autorização humana.
