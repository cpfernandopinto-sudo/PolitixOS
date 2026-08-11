# RELATÓRIO UX — ETAPA 2C
## Global Context Bar + Otimização do Shell Executivo
### PolitixOS — Migração Visual Google Stitch

**Data:** 2026-08-10
**Commit:** `47bc66e` — `feat(ux): etapa 2C - global context bar + shell executivo otimizado`
**Status:** ⏸ AGUARDANDO GATE DE HOMOLOGAÇÃO VISUAL

---

## 1. Diagnóstico Inicial

### Problemas identificados antes da etapa
| Problema | Impacto |
|---|---|
| Header com `flex-1` vazio no centro | Espaço desperdiçado, sem contexto |
| Título "Visão Geral" + subtítulo + descrição + "Período analisado" na página | ~120–140px gastos antes dos KPIs |
| Botão colapso da sidebar na Brand Area | Ambiguidade visual: parece controle da marca |
| Filtros candidato/período isolados em cada página | Sem contexto persistente entre módulos |
| Horário de atualização em linha própria | Ocupa linha separada desnecessariamente |
| Radar de Notícias, Instagram, X com h1/h2 redundantes | Repetição de informação já no menu lateral |

---

## 2. Arquitetura Anterior

```
Header [72px]
  ├── [hamburger mobile]
  ├── [div flex-1 VAZIO]
  └── [Operação Ativa] [UserMenu]

overview/page.tsx
  ├── OverviewHeader
  │     ├── "Visão Geral" (h1 28px)
  │     ├── "Centro Executivo de Inteligência Política"
  │     ├── "Consolidação estratégica..."
  │     ├── "Período analisado: Todo período"
  │     ├── [Select Candidato]
  │     ├── [Select Período]
  │     └── "Última atualização: HH:MM [Atualizar]"
  └── KPIs ...
```

---

## 3. Nova Arquitetura

```
Header [72px]
  ├── [hamburger mobile]
  ├── GlobalContextBar ← NOVO
  │     ├── "|" separador
  │     ├── "Visão Geral" (nome do módulo via usePathname)
  │     ├── "·" separador
  │     ├── [Select Candidato ▼] (só em páginas suportadas)
  │     ├── [Select Período ▼]  (só em páginas suportadas)
  │     ├── [flex-1 spacer]
  │     └── [↻ HH:MM] (refresh compacto com tooltip)
  ├── [Operação Ativa]
  └── [UserMenu]

Sidebar
  ├── Brand Area (absoluta, w-60 sempre)
  │     └── Logo PolitixOS APENAS ← botão removido daqui
  └── Navigation Area
        ├── [← Recolher / → Expandir] ← MOVIDO PARA AQUI
        └── [grupos de menu...]

overview/page.tsx
  └── KPIs (imediatamente, sem header de página)
```

---

## 4. Arquivos Alterados

| Arquivo | Tipo de alteração |
|---|---|
| `components/GlobalContextBar.tsx` | [NOVO] Componente da barra de contexto global |
| `components/Header.tsx` | Integra GlobalContextBar, recebe `candidates` e `generatedAt` |
| `components/Sidebar.tsx` | Botão colapso movido para topo da Navigation Area |
| `app/dashboard/layout.tsx` | Busca `candidates` e `generatedAt`; passa ao Header |
| `app/dashboard/overview/page.tsx` | Remove `OverviewHeader`, `getOverviewFiltersOptions`, `generatedAt` |
| `app/dashboard/noticias/page.tsx` | Remove bloco h1/subtitle/description |
| `app/dashboard/noticias/NewsGlobalFilters.tsx` | Remove selects de Candidato e Período (agora globais) |
| `app/dashboard/instagram/page.tsx` | Remove bloco h2/description |
| `app/dashboard/x/page.tsx` | Remove bloco h2/description |

---

## 5. Matriz de Suporte dos Filtros

| Módulo | Candidato | Período | Param URL | Tradução necessária |
|---|---|---|---|---|
| Visão Geral | ✅ | ✅ | `candidate` / `period` (1/7/30/all) | — |
| Radar Notícias | ✅ | ✅ | `candidateId` / `period` (24h/7d/30d) | ✅ GlobalContextBar traduz automaticamente |
| Instagram | ✅ | ✅ | `candidate` / `period` | — |
| X | ✅ | ✅ | `candidate` / `period` | — |
| Investigações | ❌ | ❌ | — | n/a |
| Candidatos/Entidades | ❌ | ❌ | — | n/a |
| Automação/Operação | ❌ | ❌ | — | n/a |
| Usuários | ❌ | ❌ | — | n/a |

---

## 6. Estratégia de Persistência de Contexto

**Abordagem:** URL params existentes — sem store global, sem Context API.

**Mecanismo:**
- `GlobalContextBar` usa `useSearchParams()` + `usePathname()` para ler contexto atual
- Ao mudar filtro: `router.push(pathname?candidate=X&period=Y)` — preserva outros params locais da página
- Ao navegar entre módulos: os links do menu lateral propagam `candidate` e `period` da URL atual (via `GlobalContextBar` que relê da URL após navegação)
- Tradução automática: `candidate` → `candidateId` para `/dashboard/noticias`; `1/7/30` → `24h/7d/30d`

**Fallback:** Em páginas sem suporte (Investigações, Candidatos, etc.), os selects ficam ocultos — contexto não é perdido, apenas não exibido.

---

## 7. Testes Realizados

### Gate 1 — Técnico
| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erros |
| `npx vitest run` | ✅ 191/191 testes |
| `npm run build` | ✅ 15 rotas compiladas |

### Gate 2 — Visual Humana (PENDENTE)
Aguardando validação em `http://localhost:3000`:
- [ ] Visão Geral: KPIs imediatamente no topo (sem header de página)
- [ ] Header: módulo "Visão Geral" visível no centro
- [ ] Header: selects Candidato e Período funcionais
- [ ] Header: timestamp ↻ HH:MM com tooltip
- [ ] Sidebar: logo inteira em modo expandido e recolhido
- [ ] Sidebar: botão [←/→] junto ao início do menu (não junto à logo)
- [ ] Notícias: sem seletor de candidato/período duplicados
- [ ] Instagram: sem header redundante
- [ ] X: sem header redundante
- [ ] Persistência: candidato selecionado → navegar → candidato mantido

---

## 8. Limitações Conhecidas

- **`showDates` no NewsGlobalFilters:** O estado local `showDates` ainda existe mas não é acionado (o select de período foi removido). As datas customizadas ficam ocultas até o GlobalContextBar suportar período "custom" no futuro.
- **Responsive mobile:** Os selects globais ficam ocultos em `< sm` (abaixo de 640px). O comportamento mobile é preservado via hambúrguer menu.
- **`OverviewHeader.tsx`:** Arquivo mantido como legado (não deletado) para evitar quebra de testes existentes. Pode ser removido em limpeza futura.

---

## 9. Integridade

| Item | Status |
|---|---|
| SUPABASE | NÃO ALTERADO |
| SCHEMA | NÃO ALTERADO |
| QUERIES | NÃO ALTERADAS (exceto: `getOverviewFiltersOptions` chamada também no layout) |
| APIS | NÃO ALTERADAS |
| REGRAS DE NEGÓCIO | NÃO ALTERADAS |
| CÁLCULOS | NÃO ALTERADOS |
| N8N | NÃO ALTERADO |
| WORKFLOWS | NÃO ALTERADOS |
| PUSH | NÃO REALIZADO |
| PR | NÃO REALIZADO |
| DEPLOY | NÃO REALIZADO |

---

## 10. Impacto no Notion

**Sprint afetada:** Sprint 6 / UX Migration — Etapa 2C

**Itens executados:**
- ✅ Global Context Bar criada e integrada ao Header
- ✅ Botão colapso realocado para Navigation Area
- ✅ Header de página redundante removido de Overview, Notícias, Instagram, X
- ✅ Filtros globais (candidato + período) persistem entre módulos via URL params
- ✅ Tradução automática de params para Radar de Notícias
- ✅ Timestamp de refresh compacto no header

**Checkboxes recomendados para atualizar após homologação:**
- Sprint 6 / UX / Shell global: Global Context Bar → implementado
- Sprint 6 / UX / Sidebar: controle reposicionado → implementado
- Sprint 6 / UX / Overview: header redundante removido → implementado
- Sprint 6 / UX / Persistência de contexto → implementado

---

## 11. Próximos Passos (Pós-homologação)

- [ ] Etapa 3: Migração visual do Instagram
- [ ] Etapa 4: Migração visual do X
- [ ] Limpar `OverviewHeader.tsx` (agora obsoleto)
- [ ] Suporte a período "custom" no GlobalContextBar com date picker
