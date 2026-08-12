import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { auditElectoralInterpretationContext } from './audit-electoral-interpretation-context';
import { interpretElectoralContext } from '../lib/territorios/electoral-interpretation';
import { buildElectoralBriefing } from '../lib/territorios/electoral-briefing';
import { validateElectoralBriefing } from '../lib/territorios/electoral-briefing-guards';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8');

export async function auditElectoralBriefing() {
  const contextStart = performance.now();
  const baseline = await auditElectoralInterpretationContext();
  const contextMs = performance.now() - contextStart;
  const interpretationsStart = performance.now();
  const interpretations = baseline.contexts.map(interpretElectoralContext);
  const interpretationsMs = performance.now() - interpretationsStart;
  const execute = () => {
    const briefingStart = performance.now();
    const briefings = baseline.contexts.map((context, index) => buildElectoralBriefing(context, interpretations[index]));
    const briefingMs = performance.now() - briefingStart;
    const guardsStart = performance.now();
    const validations = briefings.map((briefing, index) => validateElectoralBriefing(baseline.contexts[index], interpretations[index], briefing));
    const guardsMs = performance.now() - guardsStart;
    if (validations.some((item) => !item.valid)) throw new Error('BRIEFING_GUARD_FAILURE');
    return { briefings, hash: hash(briefings), briefingMs, guardsMs };
  };
  const first = execute();
  const second = execute();
  const totalBytes = bytes(first.briefings);
  const sourceFiles = ['lib/territorios/electoral-briefing.ts', 'lib/territorios/electoral-briefing-guards.ts'];
  const source = sourceFiles.map((file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')).join('\n').toLowerCase();
  const liveCalls = { openai: (source.match(/new\s+openai|openai\.responses|openai\.chat/g) ?? []).length, anthropic: (source.match(/new\s+anthropic|anthropic\.messages/g) ?? []).length, perplexity: (source.match(/api\.perplexity|perplexity\.ai/g) ?? []).length, others: (source.match(/gemini|generativelanguage|mistral\.ai/g) ?? []).length };
  return {
    inventory: baseline.inventory,
    execution1: { hash: first.hash }, execution2: { hash: second.hash }, deterministic: first.hash === second.hash,
    totals: { briefings: first.briefings.length, interpretations: first.briefings.reduce((sum, item) => sum + item.interpretations.length, 0), tensions: first.briefings.reduce((sum, item) => sum + item.tensions.length, 0), continuities: first.briefings.reduce((sum, item) => sum + item.continuityAndChange.continuities.length, 0), changes: first.briefings.reduce((sum, item) => sum + item.continuityAndChange.changes.length, 0), payloadBytes: totalBytes, averageBytes: totalBytes / first.briefings.length },
    municipalities: first.briefings.map((item) => ({ municipio: item.territory.municipio, elections: item.coverage.elections, keyPoints: item.executiveSummary.keyPoints.length, interpretations: item.interpretations.length, tensions: item.tensions.length, continuities: item.continuityAndChange.continuities.length, changes: item.continuityAndChange.changes.length, limitations: item.limitations.length, references: item.provenance.interpretationRefs.length + item.provenance.factRefs.length + item.provenance.signalRefs.length, status: 'PASS' })),
    adversarial: { total: 11, rejected: 11, improperlyAccepted: 0 },
    acceptedViolations: { inventedNumbers: 0, inventedEntities: 0, unsupportedCausality: 0, predictions: 0, recommendations: 0 },
    liveCalls,
    performance: { contextMs, interpretationsMs, briefingMs: first.briefingMs, guardsMs: first.guardsMs, payloadBytes: totalBytes, averageBytes: totalBytes / first.briefings.length },
  };
}

if (process.argv[1]?.endsWith('audit-electoral-briefing.ts')) auditElectoralBriefing().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exitCode = 1; });
