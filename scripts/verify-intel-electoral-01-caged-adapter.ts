/**
 * INTEL-ELECTORAL-01 (Missão A) — verificação real, sem fixture: lê CAGED persistido
 * (homologado ECO-03B1..B3B) via `getCagedMunicipalSeries`, roda o adapter novo
 * (`caged-adapter.ts`) e atravessa o pipeline L4 real (selection -> serializer ->
 * RuleBasedMockProvider -> validator) para provar que valores reais/evidence/proveniência
 * chegam ao payload de interpretação — nunca `CONTAGEM_DEMO` nem qualquer outro fixture.
 *
 * Read-only: nenhuma escrita no banco. Não chama LLM real (usa o RuleBasedMockProvider,
 * já homologado no INTEL-03A, para provar a canalização do pipeline sem custo/rede).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { getCagedMunicipalSeries } from '../lib/territorios/caged/series-query';
import { buildCagedEconomicIntelligenceResult, type CagedAdapterPoint } from '../lib/territorios/intelligence/economy/caged-adapter';
import { runInterpretationPipeline } from '../lib/territorios/intelligence/interpretation/pipeline';
import { RuleBasedMockProvider } from '../lib/territorios/intelligence/interpretation/provider';
import { serializeInterpretationContext } from '../lib/territorios/intelligence/interpretation/serializer';
import { selectInterpretationInput } from '../lib/territorios/intelligence/interpretation/selection';

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const PILOTS = [
  { ibgeCode: '3118601', nome: 'Contagem' },
  { ibgeCode: '3106705', nome: 'Betim' },
  { ibgeCode: '3106200', nome: 'Belo Horizonte' },
];

async function main() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado em .env.local.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;

  const territories = await client.from('territories').select('id,codigo_ibge,municipio').in('codigo_ibge', PILOTS.map((p) => p.ibgeCode));
  if (territories.error) throw new Error(territories.error.message);

  const report: Record<string, unknown>[] = [];
  for (const territory of territories.data ?? []) {
    const series = await getCagedMunicipalSeries(client, { territoryId: String(territory.id), from: '202401', to: '202606' });
    const points: CagedAdapterPoint[] = series.points.map((point) => ({
      referenceMonth: point.referenceMonth, admissions: point.admissions, dismissals: point.dismissals, balance: point.balance,
      metadata: point.revisionMetadata,
    }));

    const result = buildCagedEconomicIntelligenceResult(String(territory.id), points);
    const context = selectInterpretationInput(result);
    const serialized = serializeInterpretationContext(context);
    const pipelineResult = await runInterpretationPipeline(result, new RuleBasedMockProvider());

    const juneEvidence = result.evidenceIndex[`db:${territory.id}:saldo_emprego_formal:NOVO_CAGED:202606`];
    const rolling12Jun = result.derivedIndicators.find((item) => item.indicator === 'saldo_emprego_formal_rolling12' && item.period === '202606');

    report.push({
      municipio: territory.municipio,
      territoryId: territory.id,
      cagedPointsRead: points.length,
      evidenceProduced: Object.keys(result.evidenceIndex).length,
      derivedIndicatorsProduced: result.derivedIndicators.length,
      signalsProduced: result.signals.length,
      selectionUnits: context.units.length,
      serializedUnits: serialized.units.length,
      pipelineStatus: pipelineResult.status,
      interpretationsAccepted: pipelineResult.status === 'COMPLETED' ? pipelineResult.accepted.length : 0,
      interpretationsRejected: pipelineResult.status === 'COMPLETED' ? pipelineResult.rejected.length : 0,
      // Provas de "dado real, não fixture":
      juneBalanceEvidenceValue: juneEvidence?.value ?? null,
      juneBalanceEvidenceHash: juneEvidence?.evidenceHash ?? null,
      juneBalanceEvidenceHistoryMethodVersion: (juneEvidence?.metadata as Record<string, unknown> | undefined)?.history_method_version ?? null,
      rolling12Jun2026: rolling12Jun?.result ?? null,
      firstAcceptedInterpretationEvidenceRefs: pipelineResult.status === 'COMPLETED' ? pipelineResult.accepted[0]?.evidenceRefs ?? [] : [],
    });
  }

  fs.writeFileSync('/private/tmp/intel-electoral-01-caged-adapter-verification.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
