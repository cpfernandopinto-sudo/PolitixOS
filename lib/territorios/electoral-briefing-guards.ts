import type { ElectoralInterpretationContext } from './electoral-interpretation-context';
import type { ElectoralInterpretationResult } from './electoral-interpretation';
import type { ElectoralBriefing } from './electoral-briefing';
import { validateElectoralInterpretations } from './electoral-interpretation-guards';

export type ElectoralBriefingGuard = 'SCHEMA' | 'TERRITORY' | 'REFERENCE' | 'LIMITATION' | 'BENCHMARK' | 'ASSERTION_CLASS' | 'RECOMMENDATION' | 'PREDICTION' | 'CAUSALITY' | 'IDEOLOGY' | 'VOTER_OPINION' | 'NUMBER' | 'ENTITY';

export function validateElectoralBriefing(context: ElectoralInterpretationContext, interpretation: ElectoralInterpretationResult, briefing: ElectoralBriefing): { valid: boolean; errors: Array<{ guard: ElectoralBriefingGuard; value: string }> } {
  const errors: Array<{ guard: ElectoralBriefingGuard; value: string }> = [];
  const sourceItems = new Map(interpretation.interpretations.map((item) => [item.id, item]));
  if (briefing.schemaVersion !== 'electoral-briefing-v1') errors.push({ guard: 'SCHEMA', value: briefing.schemaVersion });
  if (briefing.territory.codigoIbge !== context.territory.codigoIbge || briefing.territory.municipio !== context.territory.municipio) errors.push({ guard: 'TERRITORY', value: briefing.territory.codigoIbge });
  const refs = [...briefing.executiveSummary.references, ...briefing.continuityAndChange.continuities, ...briefing.continuityAndChange.changes, ...briefing.tensions, ...briefing.benchmark.map((item) => item.interpretationRef)];
  for (const ref of refs) if (!sourceItems.has(ref)) errors.push({ guard: 'REFERENCE', value: ref });
  for (const item of briefing.interpretations) {
    const source = sourceItems.get(item.id);
    if (!source || JSON.stringify(source) !== JSON.stringify(item)) errors.push({ guard: 'REFERENCE', value: item.id });
  }
  if (briefing.executiveSummary.headlineRef !== 'executive-reading:0' || briefing.executiveSummary.headline !== (interpretation.executiveReading[0] ?? 'Contexto insuficiente para síntese executiva.')) errors.push({ guard: 'REFERENCE', value: briefing.executiveSummary.headlineRef });
  for (const point of briefing.executiveSummary.keyPoints) if (sourceItems.get(point.interpretationRef)?.statement !== point.text) errors.push({ guard: 'REFERENCE', value: point.interpretationRef });
  for (const limitation of [...context.limitations, ...interpretation.limitations]) if (!briefing.limitations.includes(limitation)) errors.push({ guard: 'LIMITATION', value: limitation });
  for (const item of briefing.benchmark) if (item.comparisonUniverse !== 'homologated-six-municipality-sample' || item.comparisonUniverseLabel !== 'amostra homologada de seis municípios') errors.push({ guard: 'BENCHMARK', value: item.comparisonUniverseLabel });
  if (briefing.guardrails.assertionClasses.join('|') !== 'FACT|SIGNAL|INTERPRETATION') errors.push({ guard: 'ASSERTION_CLASS', value: briefing.guardrails.assertionClasses.join('|') });
  if (briefing.guardrails.recommendations.length > 0) errors.push({ guard: 'RECOMMENDATION', value: 'recommendations' });
  const semantic = validateElectoralInterpretations(context, briefing.interpretations);
  for (const error of semantic.errors) errors.push({ guard: error.guard === 'TRACEABILITY' ? 'REFERENCE' : error.guard, value: error.value });
  const texts = [briefing.executiveSummary.headline, ...briefing.executiveSummary.keyPoints.map((item) => item.text)].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/o eleitor (quer|prefere|rejeita|apoia)|intencao do eleitor/.test(texts)) errors.push({ guard: 'VOTER_OPINION', value: 'opinião do eleitor' });
  if (/media da rmbh|benchmark (estadual|brasileiro)|media de minas gerais/.test(texts)) errors.push({ guard: 'BENCHMARK', value: 'universo territorial indevido' });
  return { valid: errors.length === 0, errors };
}

export function assertValidElectoralBriefing(context: ElectoralInterpretationContext, interpretation: ElectoralInterpretationResult, briefing: ElectoralBriefing): void {
  const result = validateElectoralBriefing(context, interpretation, briefing);
  if (!result.valid) throw new Error(`ELECTORAL_BRIEFING_REJECTED:${JSON.stringify(result.errors)}`);
}
