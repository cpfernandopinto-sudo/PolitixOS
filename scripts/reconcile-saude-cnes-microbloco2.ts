import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';

const CODIGO_IBGE = '3118601';
const OLD_INDICATOR = 'estabelecimentos_atendimento_sus';
const NEW_INDICATOR = 'estabelecimentos_atendimento_ambulatorial_sus';
const DEFINITION = 'Quantidade de estabelecimentos ativos do CNES com indicação de atendimento ambulatorial SUS.';

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

export async function reconcileHealthMicroblock2() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado em .env.local.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const territory = await client.from('territories').select('id,codigo_ibge,municipio').eq('codigo_ibge', CODIGO_IBGE).single();
  if (territory.error) throw new Error(territory.error.message);
  const scope = client.from('territory_indicators').select('id,indicador,valor,periodo_inicio,periodo_fim,source_record_id,metadata,metodologia').eq('territory_id', territory.data.id).eq('categoria', 'saude').eq('fonte', 'DATASUS').eq('source_dataset', 'CNES_ESTABELECIMENTOS');
  const before = await scope;
  if (before.error) throw new Error(before.error.message);
  const oldRows = (before.data ?? []).filter((row) => row.indicador === OLD_INDICATOR);
  const newRows = (before.data ?? []).filter((row) => row.indicador === NEW_INDICATOR);
  if (oldRows.length !== 1 || newRows.length !== 0) throw new Error(`RECONCILIATION_PREFLIGHT_FAILED old=${oldRows.length} new=${newRows.length}`);
  const old = oldRows[0];
  const updated = await client.from('territory_indicators').update({ indicador: NEW_INDICATOR, source_record_id: String((old as Record<string, unknown>).source_record_id ?? '').replace(OLD_INDICATOR, NEW_INDICATOR), metodologia: DEFINITION, metadata: { ...(old.metadata as Record<string, unknown>), definition: DEFINITION, semantic_rename_from: OLD_INDICATOR, semantic_rename_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', old.id).eq('indicador', OLD_INDICATOR).select('id,indicador,valor,periodo_inicio,periodo_fim').single();
  if (updated.error) throw new Error(updated.error.message);
  const after = await client.from('territory_indicators').select('id,indicador,periodo_inicio,periodo_fim').eq('territory_id', territory.data.id).eq('categoria', 'saude').eq('fonte', 'DATASUS').eq('source_dataset', 'CNES_ESTABELECIMENTOS');
  if (after.error) throw new Error(after.error.message);
  const evidence = await client.from('territory_evidence').select('id,source_hash,source_external_id,published_at,collected_at,metadata,raw_reference').eq('territory_id', territory.data.id).eq('tema', 'saude').eq('source_name', 'DATASUS/CNES');
  if (evidence.error) throw new Error(evidence.error.message);
  const result = { territory: territory.data, before: { total: before.data?.length ?? 0, old: oldRows.length, renamed: newRows.length }, updated: updated.data, after: { total: after.data?.length ?? 0, old: after.data?.filter((row) => row.indicador === OLD_INDICATOR).length ?? 0, renamed: after.data?.filter((row) => row.indicador === NEW_INDICATOR).length ?? 0 }, evidence: evidence.data };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.endsWith('reconcile-saude-cnes-microbloco2.ts')) reconcileHealthMicroblock2().catch((error) => { console.error(error); process.exitCode = 1; });
