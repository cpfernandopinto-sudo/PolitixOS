/**
 * INTEL-03C.2 — Testes da V3 do prompt (Etapa 2/3 do gate).
 *
 * V3 é reforço complementar (defesa em profundidade) — a correção estrutural é
 * `deriveKnownEntitiesFromContext` (ver `indicator-labels.test.ts`), testado
 * separadamente. Aqui só se prova que V3 herda tudo da V2 e nunca editou V1/V2.
 */

import { describe, expect, it } from 'vitest';
import { INTERPRETATION_SYSTEM_PROMPT_V3 } from './prompt-v3';
import { INTERPRETATION_SYSTEM_PROMPT_V2 } from './prompt-v2';
import { INTERPRETATION_SYSTEM_PROMPT_V1 } from './prompt';
import { resolvePromptModule } from './prompt-registry';

describe('INTERPRETATION_SYSTEM_PROMPT_V3 — Etapa 2 do gate INTEL-03C.2', () => {
  it('contém integralmente o texto da V2 (herda todas as 18 regras, nunca reescreve)', () => {
    expect(INTERPRETATION_SYSTEM_PROMPT_V3.startsWith(INTERPRETATION_SYSTEM_PROMPT_V2)).toBe(true);
  });

  it('adiciona a regra 19 (preferir siglas a nomes por extenso)', () => {
    expect(INTERPRETATION_SYSTEM_PROMPT_V3).toMatch(/19\. PREFIRA SIGLAS A NOMES POR EXTENSO/);
    expect(INTERPRETATION_SYSTEM_PROMPT_V2).not.toMatch(/PREFIRA SIGLAS/);
  });

  it('V1 e V2 nunca foram editados in-place', () => {
    expect(/17\. |18\. |19\. /.test(INTERPRETATION_SYSTEM_PROMPT_V1)).toBe(false);
    expect(/19\. /.test(INTERPRETATION_SYSTEM_PROMPT_V2)).toBe(false);
  });

  it('registry resolve "v3" corretamente e mantém v1/v2 intactos', () => {
    expect(resolvePromptModule('v3').promptVersion).toBe('v3');
    expect(resolvePromptModule('v2').promptVersion).toBe('v2');
    expect(resolvePromptModule('v1').promptVersion).toBe('v1');
  });
});
