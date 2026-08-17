import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CagedMunicipalityResolver } from './municipality-resolver';
import { mergeCagedAggregates, parseCagedFile } from './parser';

const resolver = CagedMunicipalityResolver.fromIbgeRows([{ id: 3118601 }, { id: 3106705 }]);
async function fixture(content: string) { const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'caged-test-')); const file = path.join(directory, 'input.txt'); await fs.writeFile(file, content); return { file, cleanup: () => fs.rm(directory, { recursive: true, force: true }) }; }

describe('parseCagedFile', () => {
  it('lê UTF-8, agrega e descarta município não mapeado', async () => {
    const input = await fixture('competênciamov;município;saldomovimentação;seção;salário\n202606;311860;1;G;2000,00\n202606;311860;-1;G;1000,00\n202606;999999;1;;0\n');
    try { const result = await parseCagedFile(input.file, 'MOV', resolver); expect(result.rowsRead).toBe(3); expect(result.invalidMunicipalities).toBe(0); expect(result.reservedMunicipalityEvents).toBe(1); expect(result.unresolvedMunicipalityEvents).toBe(0); expect(result.nationalTotals).toEqual({ admissions: 2, dismissals: 1, balance: 1 }); expect(result.aggregates[0]).toMatchObject({ admissions: 1, dismissals: 1, balance: 0 }); } finally { await input.cleanup(); }
  });
  it('falha imediatamente com layout incompatível', async () => { const input = await fixture('competênciamov;município\n202606;311860\n'); try { await expect(parseCagedFile(input.file, 'MOV', resolver)).rejects.toMatchObject({ code: 'CAGED_LAYOUT_MISMATCH' }); } finally { await input.cleanup(); } });
  it('aplica revisão FOR e EXC sem duplicar chave', async () => {
    const forInput = await fixture('competênciamov;município;saldomovimentação;seção\n202604;311860;1;C\n');
    const excInput = await fixture('competênciamov;município;saldomovimentação;seção\n202604;311860;-1;C\n');
    try { const merged = mergeCagedAggregates([await parseCagedFile(forInput.file, 'FOR', resolver), await parseCagedFile(excInput.file, 'EXC', resolver)]); expect(merged).toHaveLength(1); expect(merged[0]).toMatchObject({ referenceMonth: '202604', admissions: 1, dismissals: -1, balance: 2 }); } finally { await forInput.cleanup(); await excInput.cleanup(); }
  });
});
