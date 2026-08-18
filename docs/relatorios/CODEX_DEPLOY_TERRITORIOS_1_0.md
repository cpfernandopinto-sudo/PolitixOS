# CODEX — DEPLOY TERRITÓRIOS 1.0

**Gate:** `DEPLOY-TERRITORIOS-1.0`  
**Data:** 2026-08-17 (America/Sao_Paulo)  
**Agente:** Codex  
**Escopo:** verify → release → deploy → smoke test → report; sem feature, refactor, migration, reprocessamento ou início da 2.0.

## 1. Resumo executivo

O commit homologado foi publicado em produção com build remoto concluído e estado Vercel `READY`. O alias canônico está ativo e as rotas protegidas respondem normalmente, redirecionando usuários sem sessão para `/login`.

O gate técnico pré-deploy passou integralmente: typecheck, 894 testes e build. A auditoria somente leitura do banco persistido confirmou os 30 meses de CAGED dos três municípios piloto e todos os valores-canário; confirmou também ausência de CAGED para Nova Lima e presença de dados persistidos reais nos domínios Demografia, Segurança/SEJUSP e Eleitoral/TSE.

A validação visual autenticada não pôde ser concluída porque o navegador de homologação não possuía sessão de produção e não havia credencial de teste configurada no repositório. Portanto, o release fica **publicado e tecnicamente saudável, mas com reserva operacional de homologação visual autenticada**. Nenhuma credencial foi solicitada, exposta ou contornada.

## 2. Pré-deploy

Baseline lido:

- `docs/relatorios/CLAUDE_RELEASE_GATE_TERRITORIOS_1_0.md`
- `docs/relatorios/CLAUDE_RELEASE_HOTFIX_TERRITORIOS_1_0.md`

Estado exato publicado:

| Verificação | Resultado |
|---|---:|
| `npx tsc --noEmit` | PASS |
| `npx vitest run --exclude '.claude/worktrees/**'` | PASS — 99 arquivos, 894 testes, 5 skips conhecidos |
| `npm run build` | PASS — Next.js 16.2.6 |

Arquivos temporários, dois worktrees internos e um arquivo órfão vazio foram excluídos do release. Não houve migration, limpeza de dados, expansão territorial ou reprocessamento de motores.

## 3. Release e deploy

| Campo | Valor |
|---|---|
| Branch | `main` |
| Commit | `a4a70135ed7ac7fc04fb91c70081ffcc331712f3` |
| Mensagem | `feat(territorios): homologate territorios 1.0` |
| Commit timestamp | `2026-08-17T11:21:19-03:00` |
| Deployment ID | `dpl_BvXW63RcwVUXeFvRhAHJvX5AtRXR` |
| Target | `production` |
| Estado | `READY` |
| Deploy timestamp | 2026-08-17 11:24:31 -03:00 |
| URL imutável | `https://politix-71bia9ii4-cpfernandopinto-4810s-projects.vercel.app` |
| URL de produção | `https://app.politixos.ia.br` |
| Inspector | `https://vercel.com/cpfernandopinto-4810s-projects/politix-os/BvXW63RcwVUXeFvRhAHJvX5AtRXR` |

Consulta pós-deploy: Vercel `READY`, 98 artefatos adicionais no build, alias canônico ativo. Consulta de logs do deployment para erros e HTTP 500: nenhum registro encontrado.

## 4. Smoke de disponibilidade

As rotas protegidas responderam HTTP 307 para o login, comportamento esperado para requisição sem sessão. Não houve 404/500 nas rotas verificadas.

| Rota | HTTP | Tempo observado |
|---|---:|---:|
| `/dashboard/territorios` | 307 → `/login` | 0,868 s |
| `/dashboard/territorios/3118601` | 307 → `/login` | 0,187 s |
| `/dashboard/territorios/3118601/economia` | 307 → `/login` | 0,134 s |
| `/dashboard/territorios/3118601/seguranca` | 307 → `/login` | 0,188 s |
| `/dashboard/territorios/3118601/demografia` | 307 → `/login` | 0,121 s |
| `/dashboard/territorios/3118601/eleicoes` | 307 → `/login` | 0,121 s |
| `/dashboard/territorios/3106200/economia` | 307 → `/login` | 0,122 s |
| `/dashboard/territorios/3106705/economia` | 307 → `/login` | 0,116 s |
| `/dashboard/territorios/3144805/economia` | 307 → `/login` | 0,116 s |

## 5. Auditoria dos dados persistidos

A auditoria foi feita em modo somente leitura, paginando integralmente `territories` e `territory_indicators`. Nenhum dado foi alterado.

### CAGED — 202401 a 202606

| Município | Código IBGE | Meses distintos | Primeiro | Último | Resultado |
|---|---:|---:|---:|---:|---:|
| Contagem | 3118601 | 30 | 202401 | 202606 | PASS |
| Belo Horizonte | 3106200 | 30 | 202401 | 202606 | PASS |
| Betim | 3106705 | 30 | 202401 | 202606 | PASS |
| Nova Lima | 3144805 | 0 | — | — | PASS — município sem CAGED |

Canários:

| Município | Competência | Admissões | Desligamentos | Saldo | Resultado |
|---|---:|---:|---:|---:|---:|
| Contagem | 202506 | 11.416 | 11.078 | +338 | PASS |
| Contagem | 202512 | — | — | -4.132 | PASS |
| Contagem | 202606 | — | — | +914 | PASS |
| Belo Horizonte | 202512 | — | — | -13.001 | PASS |
| Belo Horizonte | 202606 | — | — | +1.146 | PASS |
| Betim | 202606 | — | — | +1.356 | PASS |

Os valores são territorialmente distintos; nenhum canário de Belo Horizonte ou Betim reproduziu o valor de Contagem. Nova Lima retornou zero competências persistidas, sem preenchimento com dados de Contagem.

### Domínios reais persistidos

| Município | Demografia/IBGE | Segurança/SEJUSP-MG | Eleitoral/TSE |
|---|---:|---:|---:|
| Contagem | 1 indicador | 154 indicadores | 1.838 indicadores |
| Belo Horizonte | 1 indicador | 154 indicadores | 3.826 indicadores |
| Betim | 1 indicador | 154 indicadores | 1.575 indicadores |
| Nova Lima | 1 indicador | 154 indicadores | 717 indicadores |

A população é persistida em `territory_indicators` pelo motor IBGE/SIDRA. Não há evidência persistida para pirâmide etária, sexo, raça, domicílios ou urbanização; o contrato visual implementado mantém essas dimensões como indisponíveis/demonstrativas quando não existem.

## 6. Inteligência / LLM

- Provider default: Gemini (`gemini-2.5-flash`) — PASS.
- Prompt default: V3 — PASS.
- Provider fallback: Anthropic, por `generateWithFallback`, somente para erro classificado do provider principal — PASS.
- Chamada real: `NOT_EXECUTED_COST_CONTROL`.

Não foi gerada chamada externa paga. O contrato foi validado pelo código homologado e pelos testes pré-deploy.

## 7. Limitação da homologação visual

O navegador automatizado chegou corretamente a `https://app.politixos.ia.br/login`. Não havia sessão autenticada disponível nem credencial E2E/teste configurada. Por isso não foi possível observar, dentro da interface real:

- renderização final dos gráficos e disclosures;
- troca de município pela UI;
- ausência de loading infinito;
- console do React após renderização autenticada;
- Visão Geral e abas autenticadas de cada dossiê.

Esse ponto é uma pendência de evidência, não um erro funcional detectado. A confirmação foi realizada até onde era possível sem contornar autenticação nem transmitir credenciais.

## 8. Resultado exigido pelo gate

```text
PRE-DEPLOY TYPECHECK:
PASS

PRE-DEPLOY TESTS:
PASS

PRE-DEPLOY BUILD:
PASS

RELEASE COMMIT:
a4a70135ed7ac7fc04fb91c70081ffcc331712f3

DEPLOY:
PASS

PRODUCTION URL:
https://app.politixos.ia.br

CONTAGEM:
PASS_WITH_VISUAL_RESERVATION

BELO HORIZONTE:
PASS_WITH_VISUAL_RESERVATION

BETIM:
PASS_WITH_VISUAL_RESERVATION

NO-CAGED MUNICIPALITY:
PASS_WITH_VISUAL_RESERVATION

CAGED 202401→202606:
PASS

CAGED CANARIES:
PASS

SECURITY:
PASS_WITH_VISUAL_RESERVATION

DEMOGRAPHY:
PASS_WITH_VISUAL_RESERVATION

ELECTORAL:
PASS_WITH_VISUAL_RESERVATION

OVERVIEW:
NOT_EXECUTED_AUTH_REQUIRED

REAL/DEMO DISCLOSURE:
NOT_EXECUTED_AUTH_REQUIRED

CONTAGEM FALLBACK LEAKS:
0 DETECTED IN PERSISTED DATA / VISUAL CHECK PENDING

MISLEADING FIXTURES:
0 DETECTED IN CONTRACT / VISUAL CHECK PENDING

PRODUCTION RUNTIME ERRORS:
0 DETECTED

GEMINI DEFAULT:
PASS

ANTHROPIC FALLBACK:
PASS

LLM LIVE CALL:
NOT_EXECUTED_COST_CONTROL

P0:
0

P1:
0

P2:
0

P3:
1 — homologação visual autenticada pendente por ausência de sessão/credencial de teste
```

## 9. Gate final

```text
TERRITORIOS 1.0 PRODUCTION:
WITH RESERVATIONS

RELEASE STATUS:
DEPLOYED / TECHNICALLY HEALTHY / AUTHENTICATED VISUAL SMOKE PENDING

READY FOR TERRITORIOS 2.0:
NO
```

Bloqueador remanescente para encerramento formal do gate: executar o smoke visual com uma sessão autenticada de produção, sem qualquer alteração de código ou banco. Até essa evidência ser concluída, a fundação 1.0 permanece congelada e a 2.0 não deve ser iniciada.
