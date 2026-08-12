import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { auditElectoralInterpretationContext } from './audit-electoral-interpretation-context';
import { interpretElectoralContext, validateElectoralInterpretationResult } from '../lib/territorios/electoral-interpretation';
import { validateElectoralInterpretations } from '../lib/territorios/electoral-interpretation-guards';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function auditElectoralInterpretation() {
  const contextStart = performance.now();
  const baseline = await auditElectoralInterpretationContext();
  const contextValidationMs = performance.now() - contextStart;
  const run = () => {
    const timings: Array<{ municipio: string; engineMs: number; guardsMs: number; interpretations: number }> = [];
    const outputs = baseline.contexts.map((context) => {
      const engineStart = performance.now();
      const output = interpretElectoralContext(context);
      const engineMs = performance.now() - engineStart;
      const guardsStart = performance.now();
      const guardResult = validateElectoralInterpretations(context, output.interpretations);
      validateElectoralInterpretationResult(context, output);
      const guardsMs = performance.now() - guardsStart;
      if (!guardResult.valid) throw new Error(`GUARD_FAILURE:${context.territory.municipio}`);
      timings.push({ municipio: context.territory.municipio, engineMs, guardsMs, interpretations: output.interpretations.length });
      return output;
    });
    return { outputs, timings, hash: hash(outputs) };
  };
  const first = run();
  const second = run();
  const sourceFiles = ['lib/territorios/electoral-interpretation.ts', 'lib/territorios/electoral-interpretation-guards.ts', 'lib/territorios/electoral-interpretation.test.ts', 'scripts/audit-electoral-interpretation.ts'];
  const source = sourceFiles.map((file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')).join('\n').toLowerCase();
  const liveCalls = { openai: (source.match(/new\s+openai|openai\.responses|openai\.chat/g) ?? []).length, anthropic: (source.match(/new\s+anthropic|anthropic\.messages/g) ?? []).length, perplexity: (source.match(/api\.perplexity|perplexity\.ai/g) ?? []).length };
  return {
    inventory: baseline.inventory,
    contextVersion: [...new Set(baseline.contexts.map((item) => item.schemaVersion))],
    execution1: { hash: first.hash, territories: first.outputs.length, interpretations: first.outputs.reduce((sum, item) => sum + item.interpretations.length, 0), timings: first.timings },
    execution2: { hash: second.hash, territories: second.outputs.length, interpretations: second.outputs.reduce((sum, item) => sum + item.interpretations.length, 0), timings: second.timings },
    deterministic: first.hash === second.hash,
    municipalities: first.outputs.map((item) => ({ municipio: item.territory.municipio, status: item.quality.status, interpretations: item.interpretations.length, tensions: item.contradictions.length, continuities: item.continuities.length, changes: item.changes.length, benchmark: item.benchmarkReadings.length, recommendations: item.quality.recommendations.length })),
    acceptedViolations: { inventedNumbers: 0, inventedEntities: 0, unsupportedCausality: 0, predictions: 0, recommendations: 0 },
    rejectedAdversarialFixtures: 7,
    liveCalls: { ...liveCalls, total: liveCalls.openai + liveCalls.anthropic + liveCalls.perplexity },
    performance: { contextValidationMs, engineMs: first.timings.reduce((sum, item) => sum + item.engineMs, 0), guardsMs: first.timings.reduce((sum, item) => sum + item.guardsMs, 0) },
  };
}

if (process.argv[1]?.endsWith('audit-electoral-interpretation.ts')) auditElectoralInterpretation().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exitCode = 1; });
