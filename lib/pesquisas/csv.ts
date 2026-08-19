import iconv from 'iconv-lite';
import { parse } from 'csv-parse/sync';
import unzipper from 'unzipper';

/**
 * Utilitário de parsing GENÉRICO — não assume nenhum nome de coluna do TSE
 * (ver PESQUISAS-01A: "não assumir nomes"). Convenções de formato (delimiter
 * `;`, encoding latin1) foram herdadas de `lib/territorios/tse-client.ts`,
 * que já baixa/parseia outro dataset do mesmo Portal de Dados Abertos do TSE
 * com sucesso — é uma convenção de PORTAL confirmada, não um palpite sobre
 * este dataset específico.
 */

export interface ParsedCsvResource {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
}

function normalizeHeader(value: string): string {
  return value.replace(/^﻿/, '').trim();
}

export function parseCsvText(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows = parse(csvText, {
    columns: (headers: string[]) => headers.map(normalizeHeader),
    delimiter: ';',
    quote: '"',
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

/** Extrai e parseia todo `.csv` dentro do ZIP — sem presumir nomes de arquivo. */
export async function parseZipCsvResources(zipBuffer: Buffer): Promise<ParsedCsvResource[]> {
  const directory = await unzipper.Open.buffer(zipBuffer);
  const csvEntries = directory.files.filter(
    (file) => file.type === 'File' && file.path.toLowerCase().endsWith('.csv')
  );

  const results: ParsedCsvResource[] = [];
  for (const entry of csvEntries) {
    const raw = await entry.buffer();
    const csvText = iconv.decode(raw, 'latin1');
    const { headers, rows } = parseCsvText(csvText);
    results.push({ fileName: entry.path, headers, rows });
  }
  return results;
}
