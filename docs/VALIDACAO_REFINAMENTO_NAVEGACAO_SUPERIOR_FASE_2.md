# Validação — Refinamento da Navegação Superior (Fase 2)

Branch: `release/radar-real-plus-overview`. Nenhum commit, merge, push ou deploy feito. Nenhuma
alteração em rotas, permissões, autenticação, dados, módulos internos, gráficos ou KPIs — esta
fase refina exclusivamente a aparência do chrome superior aprovado na Fase 1 (logo, seletor de
módulo, mega dropdown e drawer mobile).

## Arquivos alterados

- `components/navigation/TopNavigation.tsx` — escala/respiro da logo, espaçamentos explícitos
  entre logo↔seletor↔busca↔ações, densidade das ações à direita, cor de superfície do flyout de
  busca mobile.
- `components/navigation/ModuleSwitcher.tsx` — altura fixa, padding, cores (fundo/borda/hover),
  remoção do `max-width`/truncamento artificial.
- `components/navigation/ModuleNavigationMenu.tsx` — largura, padding, altura dos itens,
  estratégia de descrição (só no item ativo + `title` como tooltip nos demais), estilo do item
  ativo (acento fino em vez de bloco), cor/opacidade de superfície, `backdrop-blur`.
- `components/navigation/MobileNavigationDrawer.tsx` — logo no cabeçalho do drawer (em vez de
  texto "MÓDULOS"), altura dos itens, mesmo padrão de item ativo/hover do desktop.

Nenhum outro arquivo foi tocado nesta fase. `lib/navigation/dashboardNavigation.ts` (fonte das
rotas/permissões) permanece inalterado.

## Tabela comparativa

| Elemento | Antes (Fase 1) | Alteração | Resultado |
|---|---|---|---|
| **Escala da logo** | `h-6`/`h-7`/`h-8` (24px / 28px / 32px mobile→desktop) | Redução ~9% em todos os breakpoints | `h-[22px]`/`h-[25px]`/`h-[29px]` (24→22, 28→25, 32→29) |
| **Espaço logo → seletor** | Dependia do `gap` uniforme da barra (8-12px, igual para todos os elementos) | Margem explícita e dedicada, independente do gap geral | `mr-3` (12px) mobile / `mr-7` (28px) a partir de `md` |
| **Altura do seletor de módulo** | ~36-38px (`py-2` + conteúdo) | Altura fixa | `h-[40px]` |
| **Padding horizontal do seletor** | `px-3.5` (14px) | Levemente maior | `px-4` (16px) |
| **Largura do seletor** | `max-w-[160px]` + truncamento (cortava nomes) | Removido — largura orgânica | `whitespace-nowrap`, sem corte |
| **Fundo do seletor (fechado)** | `bg-white/[0.035]` (quase transparente) | Navy definido, mais claro que o header | `#0E1727` (mesmo tom das superfícies de card) |
| **Borda do seletor** | `border-white/[0.08]` (neutra) | Ciano/azulada de baixa intensidade | `border-cyan-400/[0.12]` |
| **Largura do dropdown** | 320px (medido) | Redução | **292px** (medido) |
| **Padding externo do dropdown** | `py-2` (8px vertical, sem padding horizontal próprio) | Padding uniforme em todos os lados | `p-[10px]` |
| **Altura de item sem descrição** | ~52-56px (todos tinham descrição) | Descrição removida da maioria dos itens | **40px** (medido) |
| **Altura de item com descrição** | ~52-56px (todos os itens) | Agora só no item ativo | **51px** (medido, só 1 de 11 itens) |
| **Descrições visíveis** | Todos os 11 itens (4 com descrição real, 7 sem) | Só no item ativo; demais viram tooltip nativo (`title`) no hover/foco | 1 de 11 itens com descrição visível |
| **Altura total do painel (11 itens, 3 grupos)** | Sensivelmente maior (todas as descrições ocupando espaço) | Redução proporcional à remoção de descrições | Painel visivelmente mais curto (ver `dropdown-density-before-after.png`) |
| **Gap entre grupos** | `mt-1 pt-1` (~8px) | Levemente maior, dentro da meta 8-12px | `mt-1.5 pt-1.5` (~12px) |
| **Fonte do título de grupo** | `text-[10px]`, `tracking-[0.14em]` | Levemente mais discreta | `text-[9px]`, `tracking-[0.12em]` |
| **Item ativo — estilo** | Bloco `bg-gradient-to-r from-blue-600/20 to-cyan-400/[0.07]` + borda `border-blue-400/20` (área azul extensa) | Substituído por acento fino | `bg-blue-500/[0.08]` + barra ciano de 3px à esquerda, sem borda |
| **Item inativo — hover** | `hover:bg-white/[0.05]` (branco neutro) | Tom azul discreto | `hover:bg-blue-500/[0.06]` |
| **Superfície do dropdown** | `bg-[#0B1220]`, `border-white/[0.08]` | Navy ainda mais separado do header, borda azul-acinzentada, blur discreto | `bg-[#0D1526]/98`, `border-blue-300/10`, `backdrop-blur-sm` |
| **Ações à direita — gap** | `gap-2 lg:gap-5` (8px/20px) | Ajustado à meta 14-18px | `gap-2 lg:gap-[14px] xl:gap-4` (16px) |
| **"Operação ativa" — padding** | `px-3 py-1.5` | Reduzido | `px-2.5 py-1` |
| **Botão de notificações — padding** | `p-2.5` (área ~40px) | Reduzido, ainda ≥36px | `p-2` (área ~36px) |
| **Cabeçalho do drawer mobile** | Texto "MÓDULOS" em uppercase | Substituído pela logo real | `<img>` Politix_OS, 22px de altura |
| **Altura de item no drawer mobile** | ~44px (`py-2.5` variável) | Altura fixa dentro da meta 44-48px | `h-[46px]` |

## Validação técnica

| Verificação | Resultado |
|---|---|
| Largura do dropdown (medida via `getBoundingClientRect`) | 292px |
| Altura de item sem descrição (medida) | 40px |
| Altura de item ativo com descrição (medida) | 51px |
| Altura do seletor de módulo (medida) | 40px |
| `npx tsc --noEmit` | Limpo |
| `npx vitest run` | 164/164 passando |
| `npm run build` | Compilado com sucesso, 15 rotas |
| Diff de `noticias`/`instagram`/`x`/`candidatos`/`automacoes`/`investigacoes`/`usuarios`/`gestao-crise`/`apoiadores`/`configuracoes`/`sem-permissao` + `Sidebar.tsx`/`Header.tsx`/`LogoutButton.tsx` vs. `origin/rescue/radar-production-20260727` | Vazio |
| Navegação (admin) | Visão Geral, Radar de Notícias, Radar Instagram, Radar X — nome/ícone corretos no seletor, item ativo destacado corretamente em 1280px, 1440px, 1600px |
| Permissões (role=gestor) | Grupo "Administração" (Usuários + Configurações) ausente do menu — confirmado após o refinamento |
| Sem scroll horizontal | Confirmado em 1440px, 768px e 390px (`document.documentElement.scrollWidth` ≤ viewport em todos) |
| Teclado | Esc fecha o menu e devolve foco ao seletor; navegação por setas entre itens preservada |
| Tooltip acessível | Itens inativos com descrição carregam `title` nativo (ex.: "Radar de Notícias" → `title="Monitoramento e análise de risco"`), confirmado via árvore de acessibilidade |
| Mobile (390px) | Drawer abre com logo no cabeçalho, item ativo com acento ciano, fecha com Esc |
| Busca e ações à direita | Input de busca, sino, avatar e logout continuam funcionais e inalterados na lógica |

## Confirmação — nenhum módulo interno alterado

Diff vazio (comando acima) contra `origin/rescue/radar-production-20260727` para todas as páginas
de módulo, `Sidebar.tsx`, `Header.tsx` e `LogoutButton.tsx`. As únicas alterações desta fase estão
em `components/navigation/*.tsx` (4 arquivos). Nenhum gráfico, KPI, query, texto de módulo, regra
de permissão ou fluxo de autenticação/logout foi tocado.

## Screenshots

Em `docs/screenshots/top-navigation-refinement-phase-2/`:

- `before-header-1440.png` — estado aprovado ao final da Fase 1 (reaproveitado do screenshot já
  existente em `docs/screenshots/top-navigation-experiment/`, mesmo estado exato, sem
  reconstrução).
- `after-header-1440-menu-closed.png`, `after-header-1440-menu-open.png`
- `after-header-1600.png`, `after-header-1280.png`, `after-header-768.png`
- `after-mobile-390-closed.png`, `after-mobile-390-open.png`
- `logo-spacing-before-after.png` — comparação empilhada da região logo+seletor+busca
- `active-item-before-after.png` — comparação do item ativo no dropdown (bloco pesado → acento fino)
- `dropdown-density-before-after.png` — comparação do painel inteiro (320px/todas descrições →
  292px/só descrição no ativo)

## Localhost

Ativo em `http://localhost:3003`. Rota temporária de dev-login e `ENABLE_DEV_LOGIN` já removidas
após a captura das screenshots. Nenhum commit feito — aguardando aprovação visual.
