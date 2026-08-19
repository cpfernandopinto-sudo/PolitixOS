import { describe, it, expect } from 'vitest';
import type { ElectoralPoll } from './types';
import {
  parsePollMetadata,
  extractMarginOfError,
  extractConfidenceLevel,
  extractGenderDistribution,
  extractAgeDistribution,
  extractEducationDistribution,
  extractIncomeDistribution,
  extractCollectionType,
  extractSamplingMethod,
  extractQualityControl,
  extractTerritorialCoverage,
} from './parser';

function mockPoll(overrides: Partial<ElectoralPoll> = {}): ElectoralPoll {
  return {
    id: 'test-id',
    tseRegistrationNumber: 'MG068972026',
    source: 'TSE/PesqEle',
    sourceUrl: 'https://tse.jus.br',
    sourceDataset: 'pesquisas-eleitorais-2026',
    electionYear: 2026,
    uf: 'MG',
    municipio: null,
    cargo: 'Governador, Senador',
    abrangencia: 'MINAS GERAIS',
    instituto: 'DATA TEMPO LIMITADA',
    contratante: null,
    pagante: null,
    valor: 170000,
    metodologia: 'Survey quantitativo com entrevistas pessoais em domicílio.',
    dataRegistro: '2026-03-13',
    campoInicio: '2026-03-14',
    campoFim: '2026-03-18',
    amostra: 2000,
    margemErro: null,
    nivelConfianca: null,
    rawSourceRow: {
      DS_PLANO_AMOSTRAL: 'Amostra de 2.000 entrevistas. Margem de erro estimada em 2,19% para mais ou para menos e nível de confiança de 95%. Sexo: Masculino (48,2%) e Feminino (51,8%). Idade: 16 a 24 anos (14%), 25 a 34 anos (20%), 35 a 44 anos (22%), 45 a 59 anos (24%), 60 anos ou mais (20%). Fundamental: 35%, Médio: 45%, Superior: 20%. Até 2 SM: 40%, 2 a 5 SM: 35%.',
      DS_METODOLOGIA_PESQUISA: 'Pesquisa quantitativa presencial com questionário estruturado.',
      DS_SISTEMA_CONTROLE: 'Supervisão de 20% das entrevistas por fiscalização telefônica. Entrevistadores treinados.',
      DS_DADO_MUNICIPIO: 'Conforme Resolução TSE nº 23.600/2019 art. 2º §7º, a relação de bairros será anexada em até 1 dia útil.',
      ST_PESQUISA_PROPRIA: 'N',
      DT_DIVULGACAO: '2026-03-19 00:00:00',
    },
    ingestedAt: '2026-08-19T12:00:00Z',
    createdAt: '2026-08-19T12:00:00Z',
    updatedAt: '2026-08-19T12:00:00Z',
    ...overrides,
  };
}

describe('parser.ts — Extração conservadora de metadados TSE', () => {
  it('retorna valor estruturado se margemErro e nivelConfianca já existirem no banco', () => {
    const poll = mockPoll({ margemErro: 2.2, nivelConfianca: 95 });
    const me = extractMarginOfError(poll);
    const nc = extractConfidenceLevel(poll);

    expect(me).toEqual({
      value: 2.2,
      isExtracted: false,
      confidence: 'high',
      sourceField: 'STRUCTURED_TSE',
    });
    expect(nc).toEqual({
      value: 95,
      isExtracted: false,
      confidence: 'high',
      sourceField: 'STRUCTURED_TSE',
    });
  });

  it('extrai margem de erro e nível de confiança de DS_PLANO_AMOSTRAL quando ausentes na estrutura', () => {
    const poll = mockPoll();
    const me = extractMarginOfError(poll);
    const nc = extractConfidenceLevel(poll);

    expect(me?.isExtracted).toBe(true);
    expect(me?.value).toBe(2.19);
    expect(nc?.isExtracted).toBe(true);
    expect(nc?.value).toBe(95);
  });

  it('extrai distribuição de sexo/gênero de DS_PLANO_AMOSTRAL', () => {
    const text = 'Sexo: Masculino (48,2%) e Feminino (51,8%).';
    const res = extractGenderDistribution(text);

    expect(res).not.toBeNull();
    expect(res?.value).toEqual([
      { label: 'Masculino', percentage: 48.2 },
      { label: 'Feminino', percentage: 51.8 },
    ]);
  });

  it('retorna null para gênero quando o texto é ambíguo ou sem percentual', () => {
    const text = 'Amostra representativa da população masculina e feminina sem cotas fixas.';
    expect(extractGenderDistribution(text)).toBeNull();
  });

  it('extrai distribuição de faixa etária quando há múltiplos grupos', () => {
    const text = '16 a 24 anos (14%), 25 a 34 anos (20%), 35 a 44 anos (22%), 45 a 59 anos (24%), 60 anos ou mais (20%).';
    const res = extractAgeDistribution(text);

    expect(res).not.toBeNull();
    expect(res?.value.length).toBe(5);
    expect(res?.value[0]).toEqual({ label: '16 a 24 anos', percentage: 14 });
  });

  it('extrai escolaridade e renda quando presentes', () => {
    const poll = mockPoll();
    const edu = extractEducationDistribution(poll.rawSourceRow?.DS_PLANO_AMOSTRAL ?? null);
    const income = extractIncomeDistribution(poll.rawSourceRow?.DS_PLANO_AMOSTRAL ?? null);

    expect(edu).not.toBeNull();
    expect(edu?.value.length).toBe(3);
    expect(income).not.toBeNull();
    expect(income?.value.length).toBe(2);
  });

  it('extrai tipo de coleta e método amostral de DS_METODOLOGIA_PESQUISA', () => {
    const poll = mockPoll();
    const type = extractCollectionType(poll.rawSourceRow?.DS_METODOLOGIA_PESQUISA ?? null);
    const method = extractSamplingMethod(poll.rawSourceRow?.DS_METODOLOGIA_PESQUISA ?? null, poll.rawSourceRow?.DS_PLANO_AMOSTRAL ?? null);

    expect(type?.value).toBe('Presencial');
    expect(method).toBeNull();
  });

  it('extrai checagem e percentual auditado de DS_SISTEMA_CONTROLE', () => {
    const text = 'Supervisão de 20% das entrevistas por checagem telefônica.';
    const res = extractQualityControl(text);

    expect(res).not.toBeNull();
    expect(res?.value.auditPercentage).toBe(20);
    expect(res?.value.checkpoints).toContain('Checagem e auditoria de 20% das entrevistas');
  });

  it('reconhece pendência regimental de cobertura territorial em DS_DADO_MUNICIPIO', () => {
    const text = 'Resolução TSE nº 23.600/2019 art. 2º §7º — a lista de bairros será informada no prazo legal.';
    const res = extractTerritorialCoverage(text);

    expect(res?.value.status).toBe('pending');
    expect(res?.value.details).toBeNull();
  });

  it('retorna o objeto completo de metadados via parsePollMetadata', () => {
    const poll = mockPoll();
    const meta = parsePollMetadata(poll);

    expect(meta.marginError?.value).toBe(2.19);
    expect(meta.confidenceLevel?.value).toBe(95);
    expect(meta.genderDistribution?.value.length).toBe(2);
    expect(meta.qualityControl?.value.auditPercentage).toBe(20);
    expect(meta.territorialCoverage?.value.status).toBe('pending');
  });
});
