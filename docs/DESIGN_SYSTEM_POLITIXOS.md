# Design System — PolitixOS (Sprint 5)

Este documento consolida os padrões visuais introduzidos/formalizados no Sprint 5 — Executive Experience. Não é um design system genérico: é a documentação da identidade **já existente** do PolitixOS (dark, densa, executiva), com os tokens e a hierarquia que passam a ser reutilizados entre módulos.

## Princípios

- **Identidade escura preservada.** Nenhuma cor de fundo, tipografia base ou paleta foi trocada — só formalizada.
- **Cor nunca é o único indicador.** Todo estado (severidade, sentimento, disponibilidade) combina cor + ícone + rótulo em texto. Ver `RiskOpportunityBoard`, `OverviewTimeline` (severidade sempre com badge de texto, nunca só um ponto colorido).
- **Sem glassmorphism exagerado, sem gradientes decorativos sem propósito.** O único gradiente do produto é o hero da Leitura Analítica Assistida (`from-[#1A1A1A] to-[#151b2e]`), já existente antes deste sprint e mantido por já ter função (destacar o bloco de IA do restante da tela).
- **Sem animações longas.** Transições existentes usam `transition-colors`/`transition-all duration-200-300`; nenhuma nova biblioteca de animação foi adicionada.
- **Três níveis de hierarquia**, não seis cards iguais (ver seção abaixo).

## Cores semânticas

Definidas em `app/globals.css` (`@theme`), como CSS variables — usadas via classes Tailwind (`text-*`, `border-*`, `bg-*`) já existentes no projeto, não como uma paleta nova e paralela:

| Token | Valor | Uso |
|---|---|---|
| `--color-severity-critical` | `#F87171` (red-400) | Risco crítico, alerta crítico |
| `--color-severity-high` | `#FB923C` (orange-400) | Risco alto |
| `--color-severity-attention` | `#FACC15` (yellow-400) | Atenção / severidade média |
| `--color-severity-stable` | `#22C55E` (green-500) | Estado estável, confiança alta |
| `--color-opportunity` | `#2DD4BF` (teal-400) | Oportunidade — matiz distinto de "estável" para nunca confundir "ausência de risco" com "sinal ativo de oportunidade" |
| `--color-info` | `#38BDF8` (sky-400) | Informação neutra |
| `--color-neutral` | `#9CA3AF` (gray-400) | Texto secundário, metadata |
| `--color-unavailable` | `#6B7280` (gray-500) | Estados indisponíveis/desabilitados |

**Regra**: reduzir vermelho quando há excesso de alertas simultâneos. Em `RiskOpportunityBoard`, badges de severidade usam borda + texto (sem preenchimento sólido) e um resumo de contagem (`SeverityCountStrip`, ex. "3 críticos · 1 alto") substitui a repetição de 3 badges vermelhos idênticos como única informação.

## Hierarquia de superfícies (3 níveis)

Utilitários em `app/globals.css`, reutilizáveis via classe (`surface-hero`, `surface-primary`, `surface-muted`):

| Nível | Classe | Uso | Exemplo |
|---|---|---|---|
| **1 — Hero executivo** | `.surface-hero` (`#161B22`, borda 8% branco, radius 14px) | Narrativa, síntese do cenário, estado político, risco crítico | `ExecutiveNarrative`, wrapper de `ExecutiveScenarioSummary` |
| **2 — Informação principal** | `.surface-primary` (`#1A1A1A`, borda 5% branco, radius 12px) | Mudanças, oportunidades, entidades, temas, riscos | `RiskOpportunityBoard`, `AttentionEntitiesThemes`, `KeyChanges` |
| **3 — Análise complementar** | `.surface-muted` (branco 3%, radius 8px) | Gráficos, distribuições, tabelas técnicas, detalhes por canal | Conteúdo dentro de "Análises Complementares" (`CollapsibleSection`) |

Dentro do Nível 1, um segundo sub-nível existe na própria `ExecutiveScenarioSummary`: **tiles primários** (Estado Geral, Principal Risco — `bg-white/[0.04]`, tipografia `text-lg font-bold`) vs. **tiles secundários** (Oportunidade, Tema, Exposição, Mudança — `bg-white/[0.02]`, `text-sm`), para não repetir 6 cards do mesmo peso visual (problema #3 da auditoria).

## Tipografia

Sem escala nova — formalização da escala já em uso:

| Uso | Classe |
|---|---|
| Título de página | `text-3xl font-bold` (ex. "Visão Geral") |
| Subtítulo de identidade | `text-cyan-400/80 text-sm font-semibold uppercase tracking-widest` |
| Narrativa (frase executiva) | `.text-narrative` (1rem, line-height 1.6, `max-width: 68ch` — nunca uma linha infinita) |
| Valor/estado em destaque | `text-lg font-bold` (tile primário) / `text-2xl font-black` (score) |
| Rótulo curto (uppercase) | `.text-label` (0.625rem, tracking 0.12em) — **só para rótulos curtos**, nunca parágrafos |
| Texto de corpo | `text-sm text-gray-300`/`text-gray-400` |
| Metadata/legenda | `text-[10px]`–`text-xs text-gray-500`/`text-gray-600` |

Uppercase é usado exclusivamente em rótulos curtos (`PRINCIPAL RISCO`, `ENTENDA O CÁLCULO`) — nunca em frases longas (a narrativa executiva, por exemplo, usa capitalização normal).

## Componentes e uso correto

- **`ExecutiveNarrative`** — sempre no topo da Visão Geral, antes da síntese. Nunca gerado por IA. Ações são links reais (`#riscos-oportunidades`, `?candidate=...`), nunca botões decorativos.
- **`RiskOpportunityBoard`** — cada risco separa `descricao` (linguagem executiva, de `formatExecutiveRisk`) de `evidencia` (título original da notícia/post, rotulado "Evidência principal", nunca usado como nome do risco).
- **Avatares de entidade** (`lib/ui/avatar.ts`) — iniciais determinísticas (nunca busca foto externa), cor estável por hash do nome. Entidades com risco alto/crítico recebem acento de borda vermelha.
- **Estados vazios** — sempre explicam o motivo quando derivável de uma regra real (`explainOpportunityAbsence`); nunca inventam um motivo fora das regras conhecidas.

## Acessibilidade

- Contraste AA mantido (texto branco/cinza-300 sobre `#0D0D0D`/`#1A1A1A`).
- Todo elemento clicável é um `<button>` ou `<a>` real (nunca `<div onClick>`).
- Drawers (`Drawer.tsx`, overlay mobile da `Sidebar`) fecham com Esc, fazem focus trap e devolvem o foco ao elemento que os abriu.
- `prefers-reduced-motion`: nenhuma animação contínua foi introduzida; as únicas transições (`transition-colors`, `animate-in slide-in-from-*`) são de entrada única, não contínuas.
- Overlay mobile do menu tem `role="dialog"` + `aria-modal="true"` + `aria-label`.

## O que NÃO fazer

- Não introduzir uma segunda paleta de cores paralela à existente.
- Não usar `bg-red-500` sólido em áreas grandes — severidade é badge + borda, nunca preenchimento total.
- Não criar um novo componente de card para cada bloco — reutilizar `surface-hero`/`surface-primary`/`surface-muted`.
- Não adicionar biblioteca de animação (Framer Motion, GSAP etc.) — CSS/Tailwind é suficiente para as microinterações do produto.
