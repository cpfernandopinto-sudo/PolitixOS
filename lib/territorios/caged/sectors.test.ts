import { describe, expect, it } from 'vitest';
import { CAGED_CAPABILITIES, CAGED_OFFICIAL_SECTORS, classifyCagedSection } from './methods';
import { CagedSectorAccumulator, canonicalSectorAggregateHash, mergeCagedSectorAggregates } from './sectors';
import { resolveCagedEventEffect } from './core';

describe('Novo CAGED — cinco grandes grupamentos oficiais', () => {
  it('mapeia as 21 seções CNAE 2.0 sem taxonomia alternativa', () => {
    expect(classifyCagedSection('A')).toBe('agropecuaria');
    for (const section of ['B', 'C', 'D', 'E']) expect(classifyCagedSection(section)).toBe('industria_geral');
    expect(classifyCagedSection('F')).toBe('construcao');
    expect(classifyCagedSection('G')).toBe('comercio');
    for (const section of 'HIJKLMNOPQRSTU') expect(classifyCagedSection(section)).toBe('servicos');
    for (const section of ['', '0', 'ZZ']) expect(classifyCagedSection(section)).toBe('nao_classificado');
  });

  it('preserva as semânticas MOV, FOR e EXC por setor', () => {
    const accumulator = new CagedSectorAccumulator();
    const mov = resolveCagedEventEffect({ referenceMonth: '202606', cagedMunicipality: '311860', movementBalance: 1 }, 'MOV');
    const out = resolveCagedEventEffect({ referenceMonth: '202606', cagedMunicipality: '311860', movementBalance: -1 }, 'FOR');
    const exc = resolveCagedEventEffect({ referenceMonth: '202606', cagedMunicipality: '311860', movementBalance: 1 }, 'EXC');
    for (const effect of [mov, out, exc]) {
      const sector = accumulator.addNational('C', effect);
      accumulator.addMunicipal(sector, '3118601', effect);
    }
    expect(accumulator.summary().aggregates[0]).toMatchObject({ sector: 'industria_geral', admissions: 0, dismissals: 1, balance: -1, rowsRead: 3 });
  });

  it('reconcilia, mescla e produz hash determinístico revision-aware', () => {
    const first = new CagedSectorAccumulator();
    const effect = resolveCagedEventEffect({ referenceMonth: '202606', cagedMunicipality: '310670', movementBalance: 1 }, 'MOV');
    first.addMunicipal(first.addNational('G', effect), '3106705', effect);
    const merged = mergeCagedSectorAggregates([first.summary()]);
    expect(merged[0].balance).toBe(merged[0].admissions - merged[0].dismissals);
    expect(canonicalSectorAggregateHash(merged[0], ['MOV:b', 'FOR:a'])).toBe(canonicalSectorAggregateHash(merged[0], ['FOR:a', 'MOV:b']));
  });

  it('expõe estoque, variação relativa e salário somente como metodologia pendente', () => {
    expect(CAGED_OFFICIAL_SECTORS).toHaveLength(6);
    expect(CAGED_CAPABILITIES.fiveSectors.status).toBe('AVAILABLE');
    expect(CAGED_CAPABILITIES.employmentStock.status).toBe('METHODOLOGY_PENDING');
    expect(CAGED_CAPABILITIES.relativeStockVariation.status).toBe('METHODOLOGY_PENDING');
    expect(CAGED_CAPABILITIES.averageAdmissionSalary.status).toBe('METHODOLOGY_PENDING');
  });

  it('não inclui campos individuais na materialização setorial', () => {
    const accumulator = new CagedSectorAccumulator();
    const effect = resolveCagedEventEffect({ referenceMonth: '202606', cagedMunicipality: '310620', movementBalance: 1 }, 'MOV');
    accumulator.addMunicipal(accumulator.addNational('P', effect), '3106200', effect);
    const serialized = JSON.stringify(accumulator.summary().aggregates);
    for (const forbidden of ['idade', 'sexo', 'raçacor', 'cbo2002ocupação', 'salário', 'subclasse']) expect(serialized).not.toContain(forbidden);
  });
});
