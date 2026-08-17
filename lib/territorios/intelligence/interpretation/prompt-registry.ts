/**
 * INTEL-03C — Registry de prompts versionados (seção 5-7 do gate).
 *
 * Ponto único que resolve qual prompt (V1 ou V2) um provider deve usar — nenhum
 * provider importa `./prompt`/`./prompt-v2` diretamente para montar sua chamada; todos
 * passam por `resolvePromptModule()`. O schema de output (`buildInterpretationOutputSchema`)
 * é o MESMO entre V1 e V2 (a diferença entre versões está no texto de sistema e na
 * mensagem de usuário, não na forma estrutural da saída) — reusado de `./prompt` sem
 * duplicação, seção 9 do gate ("preservar todas as regras da V1").
 */

import {
  buildInterpretationOutputSchema,
  buildInterpretationUserMessage,
  buildSchemaRetryMessage,
  buildSemanticRetryMessage,
  INTEL_INTERPRETATION_PROMPT_ID,
  INTEL_INTERPRETATION_PROMPT_VERSION,
  INTERPRETATION_SYSTEM_PROMPT_V1,
} from './prompt';
import {
  buildInterpretationUserMessageV2,
  buildSchemaRetryMessageV2,
  buildSemanticRetryMessageV2,
  INTEL_INTERPRETATION_PROMPT_V2_ID,
  INTEL_INTERPRETATION_PROMPT_V2_VERSION,
  INTERPRETATION_SYSTEM_PROMPT_V2,
} from './prompt-v2';
import {
  buildInterpretationUserMessageV3,
  buildSchemaRetryMessageV3,
  buildSemanticRetryMessageV3,
  INTEL_INTERPRETATION_PROMPT_V3_ID,
  INTEL_INTERPRETATION_PROMPT_V3_VERSION,
  INTERPRETATION_SYSTEM_PROMPT_V3,
} from './prompt-v3';
import type { InterpretationInputContext } from './types';
import type { ThresholdFamily } from '../economy/thresholds';
import type { SerializedInterpretationContext } from './serializer';

export type InterpretationPromptVersion = 'v1' | 'v2' | 'v3';

export interface InterpretationPromptModule {
  promptId: string;
  promptVersion: string;
  systemPrompt: string;
  buildUserMessage(familyContext: InterpretationInputContext, family: ThresholdFamily): { message: string; serialized: SerializedInterpretationContext };
  buildOutputSchema(familyContext: InterpretationInputContext): Record<string, unknown>;
  buildSchemaRetryMessage(): string;
  buildSemanticRetryMessage(errorCodes: string[]): string;
}

const PROMPT_MODULES: Record<InterpretationPromptVersion, InterpretationPromptModule> = {
  v1: {
    promptId: INTEL_INTERPRETATION_PROMPT_ID,
    promptVersion: INTEL_INTERPRETATION_PROMPT_VERSION,
    systemPrompt: INTERPRETATION_SYSTEM_PROMPT_V1,
    buildUserMessage: buildInterpretationUserMessage,
    buildOutputSchema: buildInterpretationOutputSchema,
    buildSchemaRetryMessage,
    buildSemanticRetryMessage,
  },
  v2: {
    promptId: INTEL_INTERPRETATION_PROMPT_V2_ID,
    promptVersion: INTEL_INTERPRETATION_PROMPT_V2_VERSION,
    systemPrompt: INTERPRETATION_SYSTEM_PROMPT_V2,
    buildUserMessage: buildInterpretationUserMessageV2,
    buildOutputSchema: buildInterpretationOutputSchema,
    buildSchemaRetryMessage: buildSchemaRetryMessageV2,
    buildSemanticRetryMessage: buildSemanticRetryMessageV2,
  },
  v3: {
    promptId: INTEL_INTERPRETATION_PROMPT_V3_ID,
    promptVersion: INTEL_INTERPRETATION_PROMPT_V3_VERSION,
    systemPrompt: INTERPRETATION_SYSTEM_PROMPT_V3,
    buildUserMessage: buildInterpretationUserMessageV3,
    buildOutputSchema: buildInterpretationOutputSchema,
    buildSchemaRetryMessage: buildSchemaRetryMessageV3,
    buildSemanticRetryMessage: buildSemanticRetryMessageV3,
  },
};

const DEFAULT_PROMPT_VERSION: InterpretationPromptVersion = 'v3';

export function isValidPromptVersion(value: string | undefined): value is InterpretationPromptVersion {
  return value === 'v1' || value === 'v2' || value === 'v3';
}

/** Único ponto de resolução de prompt (seção 5-7 do gate) — providers nunca leem `INTEL_LLM_PROMPT` diretamente. */
export function resolvePromptModule(version: string | undefined): InterpretationPromptModule {
  return PROMPT_MODULES[isValidPromptVersion(version) ? version : DEFAULT_PROMPT_VERSION];
}
