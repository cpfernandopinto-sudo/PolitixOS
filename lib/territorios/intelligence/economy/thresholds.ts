/**
 * INTEL-02/02B/02C — Catálogo centralizado de thresholds do Motor de Inteligência Econômica.
 *
 * Nenhum "magic number" deve existir fora deste arquivo. Todo threshold é
 * estatístico/econômico — nunca eleitoral, ideológico, partidário ou persuasivo.
 *
 * INTEL-02C (calibração multi-municipal, Contagem+Betim+Belo Horizonte, dados reais
 * 2002-2023): todo threshold calibrado neste gate carrega `calibrationSample`
 * machine-readable (seção 49 do gate) e status `THRESHOLD_PILOT_CALIBRATED` — nunca
 * "CALIBRATED" simples, porque 3 municípios de MG não são o Brasil (seção 40 do gate).
 */

export type ThresholdFamily = 'FISCAL' | 'PIB_VAB_MONETARY' | 'OFFICIAL_SHARE' | 'GENERAL';
export type CalibrationStatus = 'CALIBRATED' | 'THRESHOLD_PRELIMINARY' | 'THRESHOLD_PILOT_CALIBRATED';

export interface CalibrationSample {
  municipalities: readonly string[];
  observationCount: number;
  periodRange: string;
  method: string;
}

export interface Threshold {
  name: string;
  value: number;
  unit: '%' | 'pp' | 'count' | 'ratio';
  domain: 'economia';
  family: ThresholdFamily;
  calibration: CalibrationStatus;
  calibrationSample?: CalibrationSample;
  justification: string;
  version: string;
}

export const ECON_THRESHOLDS = {
  TREND_MIN_CONSECUTIVE_PERIODS: {
    name: 'TREND_MIN_CONSECUTIVE_PERIODS',
    value: 3,
    unit: 'count',
    domain: 'economia',
    family: 'GENERAL',
    calibration: 'CALIBRATED',
    justification: 'Duas observações comparáveis não distinguem tendência de ruído; três intervalos consecutivos no mesmo sentido são o mínimo para descrever uma trajetória persistente. Metodológico, não específico de família.',
    version: 'v1',
  },
  CHANGE_YOY_THRESHOLD_PCT_FISCAL: {
    name: 'CHANGE_YOY_THRESHOLD_PCT_FISCAL',
    value: 15,
    unit: '%',
    domain: 'economia',
    family: 'FISCAL',
    calibration: 'CALIBRATED',
    justification: 'Variação nominal interanual acima de 15 pontos percentuais é atipicamente alta para contas fiscais municipais correntes (ver ECO-01: variações observadas em Contagem 2020-2025 variam entre 4,2% e 19%); usado apenas como limiar de destaque, não de causalidade. Específico da família FISCAL — não reutilizado para PIB/VAB.',
    version: 'v1',
  },

  // --- INTEL-02C: PIB/VAB deixou de ter um único threshold — a distribuição real
  // multi-municipal (Contagem+Betim+BH, N=57-63 por indicador, 2002-2023) mostrou
  // volatilidade muito diferente entre subgrupos (seção 10/11/12/13 do gate).
  CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_STANDARD: {
    name: 'CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_STANDARD',
    value: 20,
    unit: '%',
    domain: 'economia',
    family: 'PIB_VAB_MONETARY',
    calibration: 'THRESHOLD_PILOT_CALIBRATED',
    calibrationSample: { municipalities: ['3118601', '3106705', '3106200'], observationCount: 63, periodRange: '2002-2023', method: 'P90 da variação nominal interanual combinada dos 3 municípios' },
    justification: 'Aplica-se a pib_municipal_precos_correntes, pib_per_capita_precos_correntes, vab_total_precos_correntes e vab_servicos_exceto_setor_publico_ampliado_precos_correntes. P90 empírico da variação interanual combinada (Contagem+Betim+BH) ficou entre 20,6% e 21,4% para esses 4 indicadores — 20% captura o decil superior (top 10% mais atípico), substituindo o antigo threshold único de 15% (que capturava ~25-30% das observações, pouco seletivo).',
    version: 'v2',
  },
  CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_VOLATILE: {
    name: 'CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_VOLATILE',
    value: 30,
    unit: '%',
    domain: 'economia',
    family: 'PIB_VAB_MONETARY',
    calibration: 'THRESHOLD_PILOT_CALIBRATED',
    calibrationSample: { municipalities: ['3118601', '3106705', '3106200'], observationCount: 57, periodRange: '2002-2021', method: 'P90 da variação nominal interanual combinada dos 3 municípios' },
    justification: 'Aplica-se a vab_agropecuaria_precos_correntes, vab_industria_precos_correntes e impostos_liquidos_subsidios_produtos_precos_correntes — empiricamente muito mais voláteis (P90 combinado entre 27,7% e 33,8%; agropecuária chegou a P75=21% sozinha). Usar o threshold PADRÃO de 20% aqui dispararia CHANGE em mais de 25% das observações — pouco seletivo. Seção 12/13 do gate: agropecuária e impostos não devem calibrar (nem ser calibrados por) o restante do PIB/VAB.',
    version: 'v2',
  },
  CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_ADMIN_PUBLIC: {
    name: 'CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_ADMIN_PUBLIC',
    value: 15,
    unit: '%',
    domain: 'economia',
    family: 'PIB_VAB_MONETARY',
    calibration: 'THRESHOLD_PILOT_CALIBRATED',
    calibrationSample: { municipalities: ['3118601', '3106705', '3106200'], observationCount: 57, periodRange: '2002-2021', method: 'P90/P95 da variação nominal interanual combinada dos 3 municípios' },
    justification: 'Aplica-se exclusivamente a vab_administracao_defesa_educacao_saude_publicas_seguridade_precos_correntes — o mais estável dos 8 indicadores monetários PIB/VAB (P90 combinado 15,3%, P95 16,1%, máximo observado 17,9%). O valor antigo de 15% já estava, por coincidência, bem calibrado para este indicador especificamente — mantido, mas agora com amostra real e status pilot-calibrado em vez de herdado do threshold fiscal.',
    version: 'v2',
  },

  CHANGE_PP_THRESHOLD_OFFICIAL_SHARE: {
    name: 'CHANGE_PP_THRESHOLD_OFFICIAL_SHARE',
    value: 3,
    unit: 'pp',
    domain: 'economia',
    family: 'OFFICIAL_SHARE',
    calibration: 'THRESHOLD_PILOT_CALIBRATED',
    calibrationSample: { municipalities: ['3118601', '3106705', '3106200'], observationCount: 228, periodRange: '2002-2021', method: 'P95 da mudança em pontos percentuais, 4 setores x 3 municípios combinados' },
    justification: 'Mantido em 3 p.p. — a distribuição real combinada (228 observações: 4 setores x 3 municípios x até 19 intervalos) mostrou P95=3,89pp, muito próximo do valor já em uso, confirmando-o como um corte razoável do "top 5%" de mudanças estruturais anuais. Ressalva honesta: por setor, o comportamento diverge — agropecuária quase nunca atinge 3pp (setor residual, <0,1% do VAB nos 3 municípios) e administração pública raramente ultrapassa 1,1pp (P95), enquanto indústria/serviços o cruzam com mais frequência (P90 entre 3 e 4pp). Avaliada e descartada a divisão em subthresholds por setor neste gate (o corte combinado em P95 já é defensável e evita complexidade sem ganho claro — seção 11 do gate).',
    version: 'v2',
  },

  CONCENTRATION_SHARE_THRESHOLD_PCT_FISCAL: {
    name: 'CONCENTRATION_SHARE_THRESHOLD_PCT_FISCAL',
    value: 80,
    unit: '%',
    domain: 'economia',
    family: 'FISCAL',
    calibration: 'CALIBRATED',
    justification: 'Quando um componente fiscal responde por 80% ou mais de sua categoria agregadora, a categoria está estruturalmente concentrada nesse componente. Específico de FISCAL (ex.: investimento/despesa de capital, tipicamente 85-91% em Contagem) — não reutilizado para estrutura produtiva.',
    version: 'v1',
  },
  CONCENTRATION_SHARE_THRESHOLD_PCT_OFFICIAL_SHARE: {
    name: 'CONCENTRATION_SHARE_THRESHOLD_PCT_OFFICIAL_SHARE',
    value: 50,
    unit: '%',
    domain: 'economia',
    family: 'OFFICIAL_SHARE',
    calibration: 'THRESHOLD_PILOT_CALIBRATED',
    calibrationSample: { municipalities: ['3118601', '3106705', '3106200'], observationCount: 60, periodRange: '2002-2021', method: 'Contagem direta de anos com participação setorial >=50%, 3 municípios' },
    justification: 'Mantido o nível de 50% (maioria simples) — porém achado empírico relevante e não escondido (seção 16/17 do gate): serviços ultrapassa 50% em 18/20 anos em Contagem e 20/20 anos em Belo Horizonte, tornando o sinal quase permanente nesses casos. A correção metodológica aplicada não foi subir o número (proibido pela seção 17: "não aumentar threshold arbitrariamente"), e sim adicionar a condição de distância ao segundo maior setor (ver CONCENTRATION_GAP_TO_SECOND_PCT_OFFICIAL_SHARE) — validado empiricamente: reduz o disparo em Betim/2021 (indústria 53,0% vs serviços 38,5%, gap=14,5pp, ABAIXO do novo requisito), preservando o disparo em Contagem e BH onde a dominância é inequívoca (gaps de 28,3pp e 51,2pp respectivamente). Ainda assim, permanece quase permanente para BH especificamente — limitação reconhecida, não resolvida neste gate (ver seção "riscos").',
    version: 'v2',
  },
  CONCENTRATION_GAP_TO_SECOND_PCT_OFFICIAL_SHARE: {
    name: 'CONCENTRATION_GAP_TO_SECOND_PCT_OFFICIAL_SHARE',
    value: 15,
    unit: 'pp',
    domain: 'economia',
    family: 'OFFICIAL_SHARE',
    calibration: 'THRESHOLD_PILOT_CALIBRATED',
    calibrationSample: { municipalities: ['3118601', '3106705', '3106200'], observationCount: 3, periodRange: '2021', method: 'Distância share_1o - share_2o no ano mais recente disponível, 3 municípios' },
    justification: 'Refinamento metodológico introduzido nesta calibração (seção 17 do gate: "share >= threshold E/OU distância relevante para o segundo maior setor"). CONCENTRATION agora exige tanto share>=50% quanto uma distância de pelo menos 15pp ao segundo colocado. Validado com os 3 municípios em 2021: Contagem (gap 28,3pp) e BH (gap 51,2pp) mantêm o sinal; Betim (gap 14,5pp — indústria e serviços em disputa próxima) deixa de disparar, corretamente capturando que sua estrutura produtiva não tem um setor claramente hegemônico.',
    version: 'v1',
  },

  PRESSURE_MIN_PERSISTENT_INTERVALS: {
    name: 'PRESSURE_MIN_PERSISTENT_INTERVALS',
    value: 2,
    unit: 'count',
    domain: 'economia',
    family: 'FISCAL',
    calibration: 'CALIBRATED',
    justification: 'Despesa corrente crescendo acima da receita corrente em um único intervalo pode ser sazonal; exigir pelo menos 2 dos últimos 3 intervalos comparáveis reduz falso-positivo de pressão fiscal pontual.',
    version: 'v1',
  },
  ANOMALY_IQR_MULTIPLIER: {
    name: 'ANOMALY_IQR_MULTIPLIER',
    value: 1.5,
    unit: 'ratio',
    domain: 'economia',
    family: 'GENERAL',
    calibration: 'CALIBRATED',
    justification: 'Multiplicador de IQR (Tukey) padrão para detecção de outlier — robusto tanto para séries fiscais curtas (6 observações) quanto para séries PIB mais longas (22 observações), pois se ajusta à dispersão observada em cada série individualmente. Comportamento comparado nos 3 municípios: Contagem 6/57 (10,5%), Betim 3/57 (5,3%), BH 2/57 (3,5%) variações classificadas como anomalia — proporção razoável e sem disparada desproporcional. Metodológico, não específico de família.',
    version: 'v1',
  },
  ATTENTION_BELOW_HISTORICAL_MIN: {
    name: 'ATTENTION_BELOW_HISTORICAL_MIN',
    value: 0,
    unit: 'pp',
    domain: 'economia',
    family: 'GENERAL',
    calibration: 'CALIBRATED',
    justification: 'Qualquer valor abaixo do mínimo histórico da própria série (janela definida em BASELINE_WINDOW_YEARS) já é, por definição, uma condição inédita na série disponível, merecendo acompanhamento — não é threshold de magnitude, é threshold posicional. Aplica-se igualmente a participações fiscais e setoriais.',
    version: 'v1',
  },
  BASELINE_WINDOW_YEARS: {
    name: 'BASELINE_WINDOW_YEARS',
    value: 3,
    unit: 'count',
    domain: 'economia',
    family: 'GENERAL',
    calibration: 'CALIBRATED',
    justification: 'Janela de baseline histórico de 3 anos válidos anteriores ao período avaliado, equilibrando robustez estatística e disponibilidade de dados municipais anuais curtos.',
    version: 'v1',
  },
  MIN_OBSERVATIONS_FOR_SHARE: {
    name: 'MIN_OBSERVATIONS_FOR_SHARE',
    value: 1,
    unit: 'count',
    domain: 'economia',
    family: 'GENERAL',
    calibration: 'CALIBRATED',
    justification: 'Uma participação percentual (razão entre duas evidências do mesmo período) é calculável com uma única observação de cada componente, desde que ambas existam no mesmo período.',
    version: 'v1',
  },
} as const satisfies Record<string, Threshold>;

export type ThresholdName = keyof typeof ECON_THRESHOLDS;

/** Compatibilidade retroativa (INTEL-02) — mesma constante, novo nome canônico é CHANGE_YOY_THRESHOLD_PCT_FISCAL. */
export const CHANGE_YOY_THRESHOLD_PCT_LEGACY_ALIAS = ECON_THRESHOLDS.CHANGE_YOY_THRESHOLD_PCT_FISCAL;

/** Seleciona o threshold PIB/VAB correto por indicador (INTEL-02C — seção 11 do gate). */
export function pibVabChangeThresholdFor(indicator: string): number {
  if (indicator === 'vab_agropecuaria_precos_correntes' || indicator === 'vab_industria_precos_correntes' || indicator === 'impostos_liquidos_subsidios_produtos_precos_correntes') {
    return ECON_THRESHOLDS.CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_VOLATILE.value;
  }
  if (indicator === 'vab_administracao_defesa_educacao_saude_publicas_seguridade_precos_correntes') {
    return ECON_THRESHOLDS.CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_ADMIN_PUBLIC.value;
  }
  return ECON_THRESHOLDS.CHANGE_YOY_THRESHOLD_PCT_PIB_VAB_STANDARD.value;
}
