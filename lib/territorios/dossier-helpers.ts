/**
 * Helper de utilidades e contexto do Dossiê Territorial — PolitixOS.
 * Centraliza a resolução de disponibilidade e tratamento dos estados de dados.
 */

import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import type { TerritoryDossier } from '@/lib/territorios/types';

/**
 * Constante legada temporária para MVP: Contagem (3118601) possui inteligência pré-carregada.
 * Marcada explicitamente como LEGACY/TEMPORARY para substituição transparente quando
 * as queries do banco/Supabase retornarem briefings para outros municípios.
 */
export const LEGACY_PRELOADED_IBGE = '3118601';

export type DossierDataStatus =
  | 'LOADING'
  | 'SEM_DADOS'
  | 'COLETA_NECESSARIA'
  | 'COLETANDO'
  | 'PROCESSANDO'
  | 'ANALISANDO'
  | 'PARCIAL'
  | 'CONCLUIDO'
  | 'ERRO';

export interface NotebookStatusMeta {
  code: DossierDataStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

export const DATA_STATUS_MAP: Record<DossierDataStatus, NotebookStatusMeta> = {
  LOADING: {
    code: 'LOADING',
    label: 'Carregando...',
    badgeBg: 'bg-[#12192A]',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/20',
    description: 'Carregando informações da base de inteligência territorial.',
  },
  SEM_DADOS: {
    code: 'SEM_DADOS',
    label: 'Aguardando coleta',
    badgeBg: 'bg-white/5',
    badgeText: 'text-slate-400',
    badgeBorder: 'border-white/10',
    description: 'Este caderno ainda não possui dados consolidados para o município selecionado.',
  },
  COLETA_NECESSARIA: {
    code: 'COLETA_NECESSARIA',
    label: 'Primeira análise necessária',
    badgeBg: 'bg-[#12192A]',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/30',
    description: 'Os motores territoriais coletarão e estruturarão as informações na primeira análise.',
  },
  COLETANDO: {
    code: 'COLETANDO',
    label: 'Coletando fontes',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/30',
    description: 'Os dados estão sendo consultados nas fontes oficiais primárias.',
  },
  PROCESSANDO: {
    code: 'PROCESSANDO',
    label: 'Normalizando dados',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/30',
    description: 'Estruturando indicadores e séries históricas do município.',
  },
  ANALISANDO: {
    code: 'ANALISANDO',
    label: 'Sintetizando inteligência',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/30',
    description: 'A camada de inteligência política está gerando os diagnósticos e leitura de cenário.',
  },
  PARCIAL: {
    code: 'PARCIAL',
    label: 'Parcialmente disponível',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/30',
    description: 'Algumas fontes deste caderno foram consolidadas; outras aguardam próxima atualização.',
  },
  CONCLUIDO: {
    code: 'CONCLUIDO',
    label: 'Consolidado',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    description: 'Inteligência territorial pronta e atualizada.',
  },
  ERRO: {
    code: 'ERRO',
    label: 'Indisponível no momento',
    badgeBg: 'bg-red-500/10',
    badgeText: 'text-red-400',
    badgeBorder: 'border-red-500/30',
    description: 'Não foi possível carregar as informações deste caderno. Tente atualizar a análise.',
  },
};

/**
 * Retorna o dossiê do município se disponível (ex: Contagem) ou null.
 */
export function getTerritoryDossierContext(ibgeCode: string): TerritoryDossier | null {
  if (ibgeCode === LEGACY_PRELOADED_IBGE) {
    return CONTAGEM_DEMO;
  }
  return null;
}
