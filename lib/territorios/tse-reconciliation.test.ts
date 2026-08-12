import { describe, expect, it } from 'vitest';
import { readAllExistingTseIndicators, reconcileIndicatorRows } from './tse-collector';

function row(index: number, value = index) {
  return { id: `id-${index}`, indicador: `indicador_${index}`, source_dataset: 'dataset', periodo_inicio: '2024-01-01', periodo_fim: '2024-12-31', valor: value, unidade: 'votos' };
}

async function readInventory(size: number) {
  const inventory = Array.from({ length: size }, (_, index) => row(index));
  const calls: Array<[number, number]> = [];
  const result = await readAllExistingTseIndicators(async (start, end) => {
    calls.push([start, end]);
    return { data: inventory.slice(start, end + 1), error: null };
  });
  return { ...result, calls };
}

describe.each([999, 1000, 1001, 1201])('reconciliação TSE com %i existentes', (size) => {
  it('lê o inventário completo sem limite implícito', async () => {
    const result = await readInventory(size);
    expect(result.rows).toHaveLength(size);
    expect(result.pagesRead).toBe(Math.floor(size / 1000) + 1);
    expect(result.calls.at(-1)?.[0]).toBe(Math.floor(size / 1000) * 1000);
  });
});

it('localiza chave após a posição 1000 e preserva insert/update/skip', async () => {
  const { rows } = await readInventory(1201);
  const unchanged = { ...row(1100) };
  const changed = { ...row(1050), valor: 9999 };
  const fresh = { ...row(1300), id: undefined };
  const result = reconcileIndicatorRows(rows, [unchanged, changed, fresh]);
  expect(result.skips).toBe(1);
  expect(result.toUpdate).toEqual([{ id: 'id-1050', row: changed }]);
  expect(result.toInsert).toEqual([fresh]);
});
