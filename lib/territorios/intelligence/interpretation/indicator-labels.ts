/**
 * INTEL-03C.2 — Nomes amigáveis, por extenso, dos indicadores econômicos (Etapa 2 do
 * gate: correção mínima para o falso positivo `UNKNOWN_SOURCE`).
 *
 * Mapa FECHADO e AUDITÁVEL — cobre exatamente os 19 indicadores definidos em
 * `../economy/engine.ts` (`ECO01_MONETARY_INDICATORS` [7] + `ECO02B_ACTIVITY_MONETARY_INDICATORS`
 * [8] + `ECO02B_OFFICIAL_SHARE_INDICATORS` [4]), nunca um indicador inventado. Cada
 * entrada é uma tradução literal do slug para português legível — nunca uma fonte,
 * instituição ou entidade externa.
 *
 * Uso: `deriveKnownEntitiesFromContext()` (`guards.ts`) usa este mapa para popular
 * `GuardrailContext.knownEntities` com APENAS os nomes dos indicadores realmente
 * presentes nas unidades selecionadas do contexto — nunca a lista inteira, nunca algo
 * fora deste catálogo fechado. Uma entidade fabricada (ex.: "Instituto Fiscal
 * Independente") nunca aparece aqui porque não é um indicador do motor.
 */

export const INDICATOR_FRIENDLY_NAMES: Record<string, string> = {
  // FISCAL — ECO-01/SICONFI
  receita_total_bruta_realizada: 'Receita Total Bruta Realizada',
  receita_corrente_bruta_realizada: 'Receita Corrente Bruta Realizada',
  receita_tributaria_bruta_realizada: 'Receita Tributária Bruta Realizada',
  transferencias_correntes_brutas_realizadas: 'Transferências Correntes Brutas Realizadas',
  despesa_corrente_empenhada: 'Despesa Corrente Empenhada',
  despesa_capital_empenhada: 'Despesa de Capital Empenhada',
  investimento_empenhado: 'Investimento Empenhado',

  // PIB_VAB_MONETARY — ECO-02B/IBGE
  pib_municipal_precos_correntes: 'Produto Interno Bruto',
  impostos_liquidos_subsidios_produtos_precos_correntes: 'Impostos Líquidos de Subsídios sobre Produtos',
  vab_total_precos_correntes: 'Valor Adicionado Bruto',
  vab_agropecuaria_precos_correntes: 'Valor Adicionado Bruto da Agropecuária',
  vab_industria_precos_correntes: 'Valor Adicionado Bruto da Indústria',
  vab_servicos_exceto_setor_publico_ampliado_precos_correntes: 'Valor Adicionado Bruto de Serviços, exceto setor público ampliado',
  vab_administracao_defesa_educacao_saude_publicas_seguridade_precos_correntes: 'Administração, Defesa, Educação, Saúde Públicas e Seguridade Social',
  pib_per_capita_precos_correntes: 'Produto Interno Bruto per capita',

  // OFFICIAL_SHARE — ECO-02B/IBGE (participações setoriais oficiais)
  participacao_vab_agropecuaria: 'participação do Valor Adicionado Bruto da Agropecuária',
  participacao_vab_industria: 'participação do Valor Adicionado Bruto da Indústria',
  participacao_vab_servicos_exceto_setor_publico_ampliado: 'participação do Valor Adicionado Bruto de Serviços, exceto setor público ampliado',
  participacao_vab_administracao_defesa_educacao_saude_publicas_seguridade: 'participação da Administração, Defesa, Educação, Saúde Públicas e Seguridade Social',
};

export function friendlyNameForIndicator(indicatorId: string): string | null {
  return INDICATOR_FRIENDLY_NAMES[indicatorId] ?? null;
}
