# PolitixOS — Territórios — Relatório do Bloco 5.9

## 1. Baseline 5.8

O Bloco 5.8 permaneceu como entrada canônica e não foi alterado. A amostra continua restrita a Contagem, Belo Horizonte, Betim, Nova Lima, Ribeirão das Neves e Taquaraçu de Minas nos pleitos de 2016, 2020 e 2024. O inventário homologado foi confirmado antes e depois da execução: 9.330 indicadores e 54 evidências.

## 2. Objetivo e arquitetura

Foi implementada uma camada de domínio `ELECTORAL INTELLIGENCE` sobre `ELECTORAL ANALYTICS`:

`fonte → fato → métrica derivada → comparação → sinal`

A execução para no sinal. Não há texto livre, inferência de IA, causalidade, previsão ou orientação política.

## 3. Contrato

`ElectoralTerritoryIntelligence` contém território, período, fatos eleitorais, sinais, comparações, padrões históricos, sequência partidária, participação, competição, benchmark e proveniência. `ElectoralSignal`, `ElectoralHistoricalChange`, `ElectoralIntelligenceProvenance` e `ElectoralSampleRanking` são explicitamente tipados.

Cada sinal tem `signalType`, origem `COMPARATIVE_SIGNAL`, métrica, período, valor atual, delta, comparação e proveniência. Sinal sem valor ou sem proveniência completa em qualquer fato participante não é emitido.

## 4. Taxonomia

- Participação, abstenção e eleitorado: `INCREASED`, `DECREASED`, `UNCHANGED_EXACTLY`.
- Margem: `EXPANDED`, `NARROWED`, `UNCHANGED_EXACTLY`.
- Vencedor e partido: `CHANGED` ou `MAINTAINED`.
- Turno: ida ao segundo turno, ida ao primeiro turno ou manutenção.
- Benchmark: acima, abaixo ou exatamente na média para participação, abstenção e margem.

## 5. Fórmulas e thresholds

- Delta absoluto: `valor_final - valor_inicial`.
- Delta relativo: `(delta_absoluto / |valor_inicial|) × 100`; `null` quando o valor inicial é zero.
- Benchmark: `valor_municipal - média_da_amostra`.
- Direção: maior que zero, menor que zero ou exatamente zero.

Não foi adotado threshold arbitrário. A estabilidade categórica foi deliberadamente excluída; igualdade exata usa `UNCHANGED_EXACTLY`. Também não foi criado sinal de eleitorado bruto contra a média, pois diferenças de porte municipal tornam essa comparação pouco útil. Não foi implementada classificação de outlier com apenas seis observações; os extremos são descritos somente como `highest` e `lowest`.

## 6. Sinais por município

Foram produzidos 27 sinais por município, totalizando 162. Cada município possui 12 comparações quantitativas (quatro métricas em 2016→2020, 2020→2024 e 2016→2024), seis sinais consecutivos de vencedor/partido/turno e nove sinais de benchmark (três métricas por pleito).

| Município | Participação 2016 / 2020 / 2024 | Abstenção 2016 / 2020 / 2024 | Margem 2016 / 2020 / 2024 (p.p.) | Partido vencedor | Turno |
|---|---:|---:|---:|---|---|
| Belo Horizonte | 77,226 / 71,663 / 68,050 | 22,774 / 28,337 / 31,950 | 5,964 / 53,410 / 7,454 | PHS → PSD → PSD | 2 → 1 → 2 |
| Betim | 84,824 / 83,677 / 80,520 | 15,176 / 16,323 / 19,480 | 46,199 / 61,934 / 14,236 | PHS → PSD → UNIÃO | 1 → 1 → 1 |
| Contagem | 79,193 / 77,060 / 76,747 | 20,807 / 22,940 / 23,253 | 45,918 / 2,704 / 21,753 | PSDB → PT → PT | 2 → 2 → 1 |
| Nova Lima | 84,878 / 79,432 / 82,130 | 15,122 / 20,568 / 17,870 | 43,834 / 14,728 / 77,230 | DEM → CIDADANIA → CIDADANIA | 1 → 1 → 1 |
| Ribeirão das Neves | 81,939 / 77,206 / 77,370 | 18,061 / 22,794 / 22,630 | 23,483 / 27,819 / 68,548 | PSC → DEM → PP | 1 → 1 → 1 |
| Taquaraçu de Minas | 87,386 / 84,826 / 83,784 | 12,614 / 15,174 / 16,216 | 5,042 / 12,556 / 58,312 | PSC → PSD → PP | 1 → 1 → 1 |

## 7. Participação, abstenção, eleitorado e margem

As quatro métricas são comparadas nos três intervalos obrigatórios, preservando valores de origem, delta absoluto e delta relativo. Entre 2020 e 2024, a participação diminuiu em Belo Horizonte (-3,613 p.p.), Betim (-3,157), Contagem (-0,313) e Taquaraçu (-1,042), e aumentou em Nova Lima (+2,697) e Ribeirão das Neves (+0,164). A abstenção apresenta a direção matematicamente complementar. O eleitorado possui deltas históricos, mas não recebe benchmark bruto.

No mesmo intervalo, a margem diminuiu em Belo Horizonte (-45,956 p.p.) e Betim (-47,698), e aumentou em Contagem (+19,049), Nova Lima (+62,502), Ribeirão das Neves (+40,729) e Taquaraçu (+45,756).

## 8. Vencedor, partido e turno

A identidade do vencedor e o partido são comparados separadamente. Isso permite detectar, por exemplo, manutenção de candidato com troca de partido ou troca de candidato com manutenção partidária. O turno decisivo é comparado apenas entre pleitos consecutivos, sem interpretação adicional.

## 9. Benchmark e ranking da amostra

Todo benchmark é rotulado literalmente como `amostra homologada de seis municípios`; não há referência à RMBH, Minas Gerais ou Brasil.

Ranking factual de 2024:

- Maior participação: Taquaraçu de Minas, 83,784%; menor: Belo Horizonte, 68,050%.
- Maior abstenção: Belo Horizonte, 31,950%; menor: Taquaraçu de Minas, 16,216%.
- Maior margem: Nova Lima, 77,230 p.p.; menor: Belo Horizonte, 7,454 p.p.

## 10. Proveniência

Cada sinal combina, de forma ordenada e sem duplicação, território, anos, chaves dos indicadores, datasets e hashes de evidência dos fatos utilizados. A emissão exige proveniência completa em cada pleito participante. A auditoria real confirmou sinais com datasets de detalhe, candidato e partido e seus hashes oficiais correspondentes.

## 11. Casos de homologação

### Contagem

Foram confirmados: queda de participação nos dois intervalos; PSDB→PT e depois manutenção do PT; troca de ALEX DE FREITAS para MARÍLIA e posterior manutenção de MARÍLIA; margem -43,214 p.p. em 2016→2020 e +19,049 p.p. em 2020→2024; turno 2→2→1.

### Belo Horizonte

Em 2020→2024, o vencedor mudou de KALIL para FUAD NOMAN, enquanto o partido PSD foi mantido. O turno mudou de 1 para 2. A separação obrigatória entre candidato e partido passou.

### Betim

Em 2016→2020, VITTORIO MEDIOLI foi mantido e o partido mudou de PHS para PSD. Em 2020→2024, mudaram tanto o vencedor quanto o partido. A regressão passou.

## 12. Determinismo e read-only

- Execução 1: `4500a69b2a910eb22a07e99fd8f779ae82737e3e5d8aafec4d2b96cfd6e0a44f`.
- Execução 2: `4500a69b2a910eb22a07e99fd8f779ae82737e3e5d8aafec4d2b96cfd6e0a44f`.
- Determinismo: PASS.
- Indicadores antes/depois: 9.330 / 9.330.
- Evidências antes/depois: 54 / 54.
- Mutações: 0.

## 13. Performance

- Tempo total da auditoria, incluindo inventários remotos antes/depois: 17.204,414 ms.
- Transformação por município na primeira execução: entre 0,119 e 1,117 ms.
- Transformação por município na segunda execução: entre 0,118 e 0,202 ms.
- Entradas lidas/processadas: 9.330 indicadores; 18 município/pleito.
- Memória RSS inicial/média/pico/final: 116,34 / 89,77 / 116,34 / 94,27 MB.

## 14. Testes e qualidade

- Testes relacionados: 50/50 PASS, distribuídos em 11 arquivos.
- Testes novos do domínio: 10/10 PASS.
- TypeScript: PASS.
- ESLint do escopo: PASS.
- Build de produção: PASS.
- Cobertura funcional: deltas; identidades; turnos; benchmark; ranking; proveniência; ausências; determinismo; não mutação; ordenação; rótulo da amostra; ausência de termos interpretativos; regressões Contagem/BH/Betim.

## 15. Arquivos alterados

- `lib/territorios/electoral-intelligence.ts`
- `lib/territorios/electoral-intelligence.test.ts`
- `scripts/audit-rmbh-electoral-intelligence.ts`
- `docs/RELATORIO_TERRITORIOS_BLOCO5_9_INTELIGENCIA_ELEITORAL.md`

## 16. Limitações

A camada não persiste sinais, não apresenta UI, não usa IA, não produz narrativa, causalidade, score, confiança estatística, recomendação, previsão, ideologia ou outlier. A amostra não foi expandida. Qualquer interpretação futura deve permanecer em camada separada.

## 17. Gate final

Status: **HOMOLOGADO**. Liberado somente para planejamento do próximo bloco, aguardando autorização humana.
