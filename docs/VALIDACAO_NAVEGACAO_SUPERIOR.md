# Validação — Menu Superior com Área Analítica Ampliada

Branch: `release/radar-real-plus-overview`. Nenhum commit, merge, push ou deploy feito. Nenhuma
alteração em dados, queries, cálculos, regras de negócio, permissões ou conteúdo dos módulos —
apenas o chrome de navegação (sidebar lateral → menu superior).

## O que mudou

A sidebar lateral fixa (`components/Sidebar.tsx`) e o header antigo (`components/Header.tsx`)
pararam de ser renderizados por `app/dashboard/layout.tsx` — os arquivos continuam no repositório
(não foram apagados), apenas não são mais importados, para permitir rollback trivial se necessário.
Em seu lugar, uma única barra superior compacta (`TopNavigation`, 64px de altura) concentra logo,
seletor de módulo (mega dropdown), busca, status "Operação ativa", notificações e identidade do
usuário/logout.

### Arquivos criados

- `lib/navigation/dashboardNavigation.ts` — fonte única das rotas (`NAV_GROUPS`), função de
  permissão (`canSeeNavItem`) e resolução do módulo atual (`findCurrentNavItem`). Inclui os ícones
  dedicados de Instagram/X (mesmo desenho do Sidebar anterior).
- `components/navigation/TopNavigation.tsx` — barra principal (logo, seletor, busca, ações).
- `components/navigation/ModuleSwitcher.tsx` — botão + estado aberto/fechado do mega dropdown.
- `components/navigation/ModuleNavigationMenu.tsx` — conteúdo do mega dropdown (3 grupos, navegação
  por teclado, `role="menu"`/`role="menuitem"`).
- `components/navigation/MobileNavigationDrawer.tsx` — drawer mobile (mesmos grupos/rotas).
- `components/navigation/UserMenu.tsx` — nome/papel/avatar/logout, responsivo.

### Arquivos alterados

- `app/dashboard/layout.tsx` — troca `<Sidebar>+<Header>` (wrapper `flex` horizontal) por
  `<TopNavigation>` (wrapper `flex-col` vertical). `.dashboard-main` não precisou de nenhuma
  alteração — já era um container `width:100%` independente da sidebar.
- `app/globals.css` — apenas adição (3 `@keyframes` novos para abertura do menu/drawer,
  `navmenu-in`/`navdrawer-in`/`navmenu-fade-in`); nada removido ou alterado. Já respeitam
  `prefers-reduced-motion` via a regra global existente (linha ~167 do arquivo).

Nenhum outro arquivo de módulo (Notícias, Instagram, X, Candidatos, Automação, Investigações,
Usuários) foi tocado — confirmado por diff vazio contra `origin/rescue/radar-production-20260727`
(ver seção Testes).

## Tabela comparativa

| Critério | Sidebar atual (antes) | Menu superior (depois) | Resultado |
|---|---|---|---|
| **Espaço horizontal permanente** | 80px (recolhida, padrão) ou 256px (expandida) + 1px de borda, sempre presente | 0px — o menu é uma barra horizontal de 64px de altura, sem ocupar largura | Sidebar liberada por completo |
| **Largura real de conteúdo** (`.dashboard-main`, viewport 1440px) | ~1291px (colapsada) / ~1116px (expandida) | ~1372px | **+81px (+6,3%)** vs. colapsada · **+256px (+22,9%)** vs. expandida |
| **Largura de cada card do Panorama Analítico** (4 gráficos, `gap-6`) | ~305px (colapsada) / ~261px (expandida) | 325px (medido) | **+20px (+6,6%)** vs. colapsada · **+64px (+24,5%)** vs. expandida |
| **Todas as rotas acessíveis** | Sim, na lateral | Sim, no mega dropdown (desktop) e drawer (mobile) — mesmas 11 rotas, mesma fonte de dados | Preservado |
| **Identificação do módulo atual** | Item destacado na lista lateral | Ícone + nome no seletor (desktop/tablet); no mobile, o próprio `<h1>` da página já identifica o módulo (rótulo compacto no botão foi descartado — ver Riscos) | Preservado, forma adaptada |
| **Abertura/fechamento do menu** | N/A (sempre visível) | Abre sem deslocar conteúdo (`position: absolute`), fecha em clique fora, Esc, seleção de item ou navegação de rota | Novo comportamento, funcional |
| **Permissões respeitadas** | `canSee()` inline no Sidebar | `canSeeNavItem()` centralizado, mesma lógica (admin vê tudo; demais por `screen_key`; Usuários só admin) | Preservado, validado com `role=admin` e `role=gestor` |
| **Mobile** | Sidebar sempre `w-20`/`w-64`, sem responsividade | Drawer dedicado, 85% de largura (máx. 320px), bloqueia scroll do fundo, fecha em Esc/clique fora/seleção/gesto (botão X) | Novo, funcional |
| **Tablet (768px)** | Sidebar ocupava 80-256px também aqui | Barra compacta sem overflow horizontal (busca e ações reduzidas nesta faixa) | Sem regressão, sem scroll horizontal |
| **Acessibilidade** | Nenhum `aria-*` dedicado no Sidebar | `aria-haspopup`, `aria-expanded`, `aria-current`, `role="menu"`/`menuitem`, navegação por setas/Home/End, foco visível, Esc fecha e devolve foco ao botão | Adicionado |
| **Animações** | Nenhuma | 160-180ms, fade + leve deslocamento vertical, neutralizadas por `prefers-reduced-motion` (regra global já existente) | Adicionado, discreto |
| **Duas navegações simultâneas** | N/A | Nunca — sidebar não renderiza mais | Confirmado |

## Validação técnica

| Verificação | Resultado |
|---|---|
| Diff de `noticias`/`instagram`/`x`/`candidatos`/`automacoes`/`investigacoes`/`usuarios`/`gestao-crise`/`apoiadores`/`configuracoes`/`sem-permissao` + `Sidebar.tsx`/`Header.tsx`/`LogoutButton.tsx` vs. `origin/rescue/radar-production-20260727` | Vazio |
| `npx tsc --noEmit` | Limpo |
| `npx vitest run` | 164/164 passando |
| `npm run build` | Compilado com sucesso, 16 rotas |
| Navegação por todos os módulos (admin) | Visão Geral, Radar de Notícias, Radar Instagram, Radar X, Candidatos, Automação, Investigações, Usuários — todos renderizam corretamente, módulo atual destacado no seletor |
| Permissões (role=gestor, sem `configuracoes`) | Grupo "Administração" inteiro (Usuários + Configurações) ausente do menu — confirmado visualmente |
| Teclado | Esc fecha o mega dropdown e o drawer mobile; foco inicial vai para o primeiro item do menu |
| Mobile (390px) | Drawer abre em tela cheia (85% de largura), navega, fecha em Esc |
| Tablet (768px) | Sem scroll horizontal após ajuste de breakpoints (nome/papel só a partir de `lg`, busca mais estreita em `md`) |

## Riscos e decisões conscientes

- **Rótulo do módulo no botão de menu mobile**: a especificação original previa mostrar o nome do
  módulo ao lado do ícone de hambúrguer no mobile. Na prática, em viewports de 360-390px, o
  logotipo completo (não há símbolo isolado na marca — só um arquivo PNG com o wordmark inteiro,
  1413×276px) já ocupa boa parte da barra; adicionar o rótulo ao lado do ícone forçava o layout
  flex a colapsar o próprio texto a 0px (`flex-shrink` sem conteúdo mínimo) ou, alternativamente,
  causava overflow horizontal. Optou-se por manter só o ícone de menu no mobile (com
  `aria-label` dinâmico anunciando o módulo atual para leitores de tela) — o `<h1>` da própria
  página, sempre visível logo abaixo da barra, já cumpre "identificação do módulo atual" sem
  duplicar a informação.
- **`UserMenu` sem dropdown próprio**: a especificação permitia (não exigia) que o menu do usuário
  incluísse "perfil/configurações/sair". Como não existem rotas reais de perfil nesta base, o
  componente manteve fielmente o comportamento anterior (nome/papel/avatar/logout inline, sem
  menu-dentro-de-menu) — evita inventar itens que levariam a lugar nenhum.
- **Sidebar/Header não deletados**: os arquivos `components/Sidebar.tsx` e `components/Header.tsx`
  permanecem no repositório, apenas não são mais importados por `layout.tsx`. Rollback é uma
  reversão de 1 arquivo.
- **Gestão de Crise / Apoiadores / Configurações**: preservado o mesmo gap pré-existente do Sidebar
  anterior — os dois primeiros linkam para rotas sem `page.tsx` real (404 se navegados) e
  Configurações não tem link algum (`href` ausente), exatamente como no Sidebar antigo. Não é uma
  regressão desta fase; é fidelidade ao estado atual do produto.

## Screenshots

Em `docs/screenshots/top-navigation-experiment/`: `before-overview-1440.png` (sidebar colapsada,
estado anterior), `after-overview-1440-menu-closed.png`, `after-overview-1440-menu-open.png`,
`after-news-1440.png`, `after-instagram-1440.png`, `after-tablet-768.png`,
`after-mobile-390-menu-closed.png`, `after-mobile-390-menu-open.png`.

## Localhost

Ativo em `http://localhost:3003`. Rota temporária de dev-login (`/api/dev-login`) e variável
`ENABLE_DEV_LOGIN` já removidas após a captura das screenshots. Nenhum commit feito — aguardando
aprovação visual.
