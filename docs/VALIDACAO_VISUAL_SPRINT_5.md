# Validação Visual — Sprint 5

Ambiente: `npm run dev` local (`http://127.0.0.1:3000`), autenticação via `app/api/dev-login` (dev-only), dados reais do Supabase configurado em `.env.local`. Branch: `claude/politixos-audit-enhancement-f4d793`. Screenshots capturados via Playwright (Chromium) em `docs/screenshots/sprint-5/before/` (antes de qualquer alteração de código) e `docs/screenshots/sprint-5/after/` (depois, mesma sessão de dados).

## Metodologia

Cada comparação abaixo usa a mesma URL, o mesmo viewport e a mesma sessão (dados reais idênticos — nenhum dado foi alterado entre as capturas, só o código de apresentação). "Antes" e "depois" foram capturados na mesma janela de tempo da sessão para minimizar variação de dados subjacentes (volume de menções, alertas etc. podem variar minimamente entre capturas por serem dados ao vivo do Supabase, não fixtures).

## Comparações obrigatórias

### 1. Primeira dobra (desktop 1600px)

| Antes | Depois |
|---|---|
| `before/overview-desktop-1600-top.png` | `after/overview-desktop-1600-top.png` |

**Antes**: cabeçalho → direto para "Síntese do Cenário" com 6 cards de peso visual idêntico. "Principal Risco" mostra o título bruto da notícia ("Flávio Bolsonaro: Motivos para as desculpas de Flávio - blogs.correiobraziliense.com.br").

**Depois**: nova camada `ExecutiveNarrative` no topo (3 frases + 4 ações reais: "Ver riscos", "Ver mudanças", "Filtrar Flávio Bolsonaro", "Ver evidências"). Síntese reorganizada em 2 tiles primários maiores (Estado Geral, Principal Risco) + 4 tiles secundários menores. "Principal Risco" agora mostra "Notícia de risco crítico envolvendo Flávio Bolsonaro" (linguagem executiva da regra), nunca o título da notícia.

**Resultado**: ✅ hierarquia perceptível em poucos segundos, sem rolar a página.

### 2. Mobile (390px)

| Antes | Depois |
|---|---|
| `before/overview-mobile-390-top.png` | `after/overview-mobile-390-top.png` |
| — | `after/mobile-menu-open.png` |

**Antes**: sidebar fixa (`w-20`, ~80px) sempre visível, consumindo permanentemente ~20% dos 390px de largura — conteúdo comprimido mesmo sem o menu em uso.

**Depois**: sidebar fixa oculta abaixo de `lg` (`hidden lg:flex`); conteúdo usa 100% da largura. Botão de menu (`HeaderMenuButton`) no cabeçalho abre um overlay em tela cheia (`mobile-menu-open.png`) com toda a navegação, fecha com Esc, clique no backdrop, ou ao navegar.

**Resultado**: ✅ mobile não perde largura para sidebar fixa; menu funciona como overlay real.

### 3. Timeline (modo agrupado)

| Antes | Depois |
|---|---|
| `before/overview-desktop-1600-full.png` (seção timeline) | `after/timeline-grouped.png` |

**Antes**: grupos mostravam apenas tema + contagem + sentimento; todos com o mesmo peso visual, ponto colorido sem rótulo de texto.

**Depois**: cada grupo mostra severidade em texto (ALTA/MÉDIA, não só cor), ícones de canal presentes no grupo, entidades associadas, acento de borda colorido por severidade máxima — grupos deixam de parecer todos iguais.

**Resultado**: ✅ feed executivo escaneável, severidade nunca depende só de cor.

### 4. Entidades em Atenção

| Antes | Depois |
|---|---|
| `before/overview-desktop-1600-full.png` (seção entidades) | `after/overview-desktop-1600-full.png` (seção entidades) |

**Antes**: linhas de texto empilhadas, sem identidade visual — indistinguível de uma tabela HTML.

**Depois**: avatar de iniciais determinístico (`FB`, `LS`, `CL`...) com cor estável por entidade; entidades com risco alto/crítico (ex. Celina Leão) recebem acento de borda vermelha.

**Resultado**: ✅ identidade visual por entidade, sem busca de imagem externa.

### 5. Estado vazio de Oportunidades

| Antes | Depois |
|---|---|
| `before/overview-desktop-1600-full.png` (seção oportunidades) | `after/assisted-insight-unavailable.png` (seção oportunidades visível abaixo) |

**Antes**: "Nenhuma oportunidade com regra objetiva identificada no período." — sem explicar por quê.

**Depois**: mesma frase + lista de motivos reais (derivados de `explainOpportunityAbsence`, nunca fabricados): "Não houve melhora relevante de sentimento...", "Não houve crescimento relevante de sentimento positivo...", "Nenhuma das entidades com maior exposição no período está livre de alertas ou risco alto/crítico."

**Resultado**: ✅ ausência de oportunidade explicada com motivos derivados de regras reais.

### 6. Leitura Analítica Assistida (indisponível)

| Antes | Depois |
|---|---|
| `before/overview-desktop-1600-full.png` (leitura assistida, estado inicial) | `after/assisted-insight-unavailable.png` |

**Antes**: ao gerar sem `ANTHROPIC_API_KEY`, a mensagem técnica ("Provedor de IA não configurado neste ambiente (ANTHROPIC_API_KEY ausente)") era exibida para qualquer usuário.

**Depois**: mensagem amigável ("Leitura analítica assistida ainda não está configurada neste ambiente"), explica o benefício, confirma que o resto da tela funciona; detalhe técnico (`ANTHROPIC_API_KEY ausente`) só aparece para admin, em caixa secundária rotulada "Detalhe técnico (visível só para admin)".

**Resultado**: ✅ estado "indisponível" não parece mais uma falha técnica para usuários comuns.

### 7. Menu (desktop vs. mobile)

| Antes | Depois |
|---|---|
| `before/overview-mobile-390-top.png` | `after/mobile-menu-open.png` |

Ver item 2 acima — mesma comparação, focada no comportamento do menu em si (overlay com `role="dialog"`, `aria-modal`, foco gerenciado).

### 8. Estado Político — drawer "Entenda o cálculo"

`after/political-status-drawer.png` — comportamento preservado do Sprint 3/4 (não alterado neste sprint), capturado novamente para confirmar que a mudança de layout do hero não quebrou o drawer.

### 9. Análises Complementares (recolhida/expandida)

`after/analyses-collapsed.png`, `after/analyses-expanded.png` — comportamento preservado (Nível 3, recolhível por padrão), capturado novamente para confirmar que a nova hierarquia de superfícies (`surface-muted`) não alterou a função.

## Viewports validados

Desktop 1600px, notebook 1280px, tablet 768px, mobile 390px — todos capturados antes e depois (`overview-<viewport>-top.png` e `-full.png` em ambas as pastas). Em 768px (tablet), o menu também passa a usar o overlay mobile (abaixo do breakpoint `lg` = 1024px do Tailwind) — comportamento intencional, não um bug: a sidebar fixa só faz sentido em telas largas o suficiente para não competir por espaço com o conteúdo.

## Pendências

- Não foi possível medir Lighthouse formalmente nesta sessão (ambiente sem acesso ao Chrome DevTools headless com throttling); a ausência de novas consultas e de bibliotecas de animação foi verificada por inspeção de código e pelo `npm run build` (ver relatório final para o resumo de bundle).
- Validação com papéis restritos (`gestor`/`visualizador`) não realizada neste sprint — mesma pendência já registrada no Sprint 4.
- Screenshots foram capturados com dados reais ao vivo do Supabase; pequenas variações numéricas (ex. contagem de alertas) entre "antes" e "depois" refletem o estado do banco no momento da captura, não uma mudança de comportamento do código.
