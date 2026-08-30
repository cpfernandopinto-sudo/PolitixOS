import 'server-only';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { getSession } from '@/lib/auth/session';

function errorResponse(code: string, message: string, status: number, requestId: string) {
  return NextResponse.json({ error: { code, message, request_id: requestId } }, { status });
}

export function successResponse<T>(data: T) {
  return NextResponse.json({ data, meta: { generated_at: new Date().toISOString() } });
}

/**
 * Resolve o client_id da sessao para o modulo WhatsApp Intelligence.
 * admin ve todos os clientes (clientId null = sem filtro); demais usuarios ficam
 * restritos ao proprio client_id (nunca aceito via query param, so da sessao).
 */
export async function resolveWhatsappSessionScope(requestId: string): Promise<
  { ok: true; clientId: string | null } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: errorResponse('UNAUTHENTICATED', 'Sessao ausente ou expirada.', 401, requestId) };
  }
  if (session.role === 'admin') {
    return { ok: true, clientId: null };
  }
  if (!session.permissions.includes('whatsapp')) {
    return { ok: false, response: errorResponse('FORBIDDEN', 'Usuario sem permissao para WhatsApp Intelligence.', 403, requestId) };
  }
  if (!session.clientId) {
    return { ok: false, response: errorResponse('FORBIDDEN', 'Usuario sem cliente associado.', 403, requestId) };
  }
  return { ok: true, clientId: session.clientId };
}

export { errorResponse as whatsappErrorResponse };

// ---------------------------------------------------------------------------
// WhatsApp Intelligence V1 (Sprint 13) — camada de leitura server-side.
// Contrato: docs/SPRINT_13_WHATSAPP_INTELLIGENCE_V1_ARQUITETURA_MESTRE.md, secao 5.
// Toda query aqui e escopada por client_id (sessao) e nunca expoe raw_payload/raw_response.
// ---------------------------------------------------------------------------

const SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED', 'UNKNOWN'] as const;
const RISK_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE', 'UNKNOWN'] as const;
const RELEVANCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW', 'NONE'] as const;

const DEFAULT_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 90;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const AGGREGATION_ROW_CAP = 5000;
const MAX_SEARCH_LENGTH = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CommonFilters {
  from: string;
  to: string;
  chatId: string | null;
  sentiment: string | null;
  riskLevel: string | null;
  relevance: string | null;
  q: string | null;
}

export type FilterParseResult = { ok: true; filters: CommonFilters } | { ok: false; code: string; message: string };

function isValidIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export function parseCommonFilters(searchParams: URLSearchParams): FilterParseResult {
  const now = new Date();
  const toRaw = searchParams.get('to');
  const fromRaw = searchParams.get('from');

  const to = toRaw ?? now.toISOString();
  if (!isValidIsoDate(to)) {
    return { ok: false, code: 'INVALID_FILTER', message: 'Parametro "to" invalido (esperado ISO 8601).' };
  }
  const toDate = new Date(to);

  const from = fromRaw ?? new Date(toDate.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  if (!isValidIsoDate(from)) {
    return { ok: false, code: 'INVALID_FILTER', message: 'Parametro "from" invalido (esperado ISO 8601).' };
  }
  const fromDate = new Date(from);

  if (fromDate >= toDate) {
    return { ok: false, code: 'INVALID_FILTER', message: 'Parametro "from" deve ser anterior a "to".' };
  }
  const windowDays = (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000);
  if (windowDays > MAX_WINDOW_DAYS) {
    return { ok: false, code: 'INVALID_FILTER', message: `Intervalo maximo permitido e de ${MAX_WINDOW_DAYS} dias.` };
  }

  const chatId = searchParams.get('chat_id');
  if (chatId && !UUID_RE.test(chatId)) {
    return { ok: false, code: 'INVALID_FILTER', message: 'Parametro "chat_id" deve ser um UUID valido.' };
  }

  const sentiment = searchParams.get('sentiment');
  if (sentiment && !SENTIMENTS.includes(sentiment as (typeof SENTIMENTS)[number])) {
    return { ok: false, code: 'INVALID_FILTER', message: `Parametro "sentiment" invalido. Valores aceitos: ${SENTIMENTS.join(', ')}.` };
  }

  const riskLevel = searchParams.get('risk_level');
  if (riskLevel && !RISK_LEVELS.includes(riskLevel as (typeof RISK_LEVELS)[number])) {
    return { ok: false, code: 'INVALID_FILTER', message: `Parametro "risk_level" invalido. Valores aceitos: ${RISK_LEVELS.join(', ')}.` };
  }

  const relevance = searchParams.get('relevance');
  if (relevance && !RELEVANCE_LEVELS.includes(relevance as (typeof RELEVANCE_LEVELS)[number])) {
    return { ok: false, code: 'INVALID_FILTER', message: `Parametro "relevance" invalido. Valores aceitos: ${RELEVANCE_LEVELS.join(', ')}.` };
  }

  const qRaw = searchParams.get('q');
  const q = qRaw?.trim() || null;
  if (q && (q.length > MAX_SEARCH_LENGTH || /[\u0000-\u001f\u007f]/.test(q))) {
    return { ok: false, code: 'INVALID_FILTER', message: `Parametro "q" invalido ou maior que ${MAX_SEARCH_LENGTH} caracteres.` };
  }

  return {
    ok: true,
    filters: { from, to, chatId: chatId ?? null, sentiment: sentiment ?? null, riskLevel: riskLevel ?? null, relevance: relevance ?? null, q },
  };
}

function hasAnalysisFilters(filters: CommonFilters): boolean {
  return Boolean(filters.sentiment || filters.riskLevel || filters.relevance);
}

/**
 * Valores de filtros `.or()` usam a forma quoted do PostgREST. Isso impede que
 * virgulas/parenteses do texto do usuario sejam interpretados como operadores.
 */
export function buildTextSearchOrFilter(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `text.ilike."%${escaped}%",caption.ilike."%${escaped}%"`;
}

async function fetchMatchingAnalysisMessageIds(clientId: string | null, filters: CommonFilters): Promise<string[] | null> {
  if (!hasAnalysisFilters(filters)) return null;

  const admin = createAdminClient();
  let query = admin
    .from('whatsapp_analysis')
    .select('message_id')
    .eq('status', 'COMPLETED')
    .limit(AGGREGATION_ROW_CAP);

  if (clientId) query = query.eq('client_id', clientId);
  if (filters.sentiment) query = query.eq('sentiment', filters.sentiment);
  if (filters.riskLevel) query = query.eq('risk_level', filters.riskLevel);
  if (filters.relevance) query = query.eq('relevance', filters.relevance);

  const { data, error } = await query;
  if (error) throw new Error('WHATSAPP_QUERY_FAILED');
  return Array.from(new Set((data ?? []).map((row) => row.message_id).filter(Boolean)));
}

interface MessageRowForAggregation {
  id: string;
  chat_id: string;
  sender_provider_id: string | null;
  analysis_status: string;
  occurred_at: string;
  message_type: string;
}

async function fetchMessageRowsForAggregation(clientId: string | null, filters: CommonFilters) {
  const matchingAnalysisMessageIds = await fetchMatchingAnalysisMessageIds(clientId, filters);
  if (matchingAnalysisMessageIds?.length === 0) return [] as MessageRowForAggregation[];

  const admin = createAdminClient();
  let query = admin
    .from('whatsapp_messages')
    .select('id, chat_id, sender_provider_id, analysis_status, occurred_at, message_type')
    .gte('occurred_at', filters.from)
    .lt('occurred_at', filters.to)
    .order('occurred_at', { ascending: false })
    .limit(AGGREGATION_ROW_CAP);

  if (clientId) query = query.eq('client_id', clientId);
  if (filters.chatId) query = query.eq('chat_id', filters.chatId);
  if (matchingAnalysisMessageIds) query = query.in('id', matchingAnalysisMessageIds);
  if (filters.q) query = query.or(buildTextSearchOrFilter(filters.q));

  const { data, error } = await query;
  if (error) throw new Error('WHATSAPP_QUERY_FAILED');
  return (data ?? []) as MessageRowForAggregation[];
}

interface AnalysisRowForAggregation {
  message_id: string;
  theme: string | null;
  sentiment: string | null;
  risk_level: string | null;
  relevance: string | null;
  analyzed_at: string;
}

async function fetchAnalysisRowsForMessages(clientId: string | null, messageIds: string[], filters: CommonFilters) {
  if (messageIds.length === 0) return [] as AnalysisRowForAggregation[];
  const admin = createAdminClient();
  let query = admin
    .from('whatsapp_analysis')
    .select('message_id, theme, sentiment, risk_level, relevance, analyzed_at')
    .eq('status', 'COMPLETED')
    .in('message_id', messageIds);

  if (clientId) query = query.eq('client_id', clientId);
  if (filters.sentiment) query = query.eq('sentiment', filters.sentiment);
  if (filters.riskLevel) query = query.eq('risk_level', filters.riskLevel);
  if (filters.relevance) query = query.eq('relevance', filters.relevance);

  const { data, error } = await query;
  if (error) throw new Error('WHATSAPP_QUERY_FAILED');
  return (data ?? []) as AnalysisRowForAggregation[];
}

function distributionOf(values: (string | null)[]): { key: string; count: number; percentage: number }[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
    total += 1;
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count, percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

export async function getSummary(clientId: string | null, filters: CommonFilters) {
  const messages = await fetchMessageRowsForAggregation(clientId, filters);
  const messageIds = messages.map((m) => m.id);
  const analysis = await fetchAnalysisRowsForMessages(clientId, messageIds, filters);

  const chatIds = Array.from(new Set(messages.map((m) => m.chat_id)));
  const admin = createAdminClient();
  let groupsQuery = admin.from('whatsapp_chats').select('id').eq('chat_type', 'GROUP').in('id', chatIds);
  if (clientId) groupsQuery = groupsQuery.eq('client_id', clientId);
  const { data: groupRows, error: groupsError } = chatIds.length ? await groupsQuery : { data: [], error: null };
  if (groupsError) throw new Error('WHATSAPP_QUERY_FAILED');

  const uniqueSenders = new Set(messages.map((m) => m.sender_provider_id).filter(Boolean));
  const analyzed = messages.filter((m) => m.analysis_status === 'COMPLETED').length;
  const pending = messages.filter((m) => m.analysis_status === 'PENDING' || m.analysis_status === 'PROCESSING').length;
  const failed = messages.filter((m) => m.analysis_status === 'FAILED').length;
  const highOrCriticalRisk = analysis.filter((a) => a.risk_level === 'HIGH' || a.risk_level === 'CRITICAL').length;

  const themeCounts = new Map<string, number>();
  for (const a of analysis) {
    if (!a.theme) continue;
    themeCounts.set(a.theme, (themeCounts.get(a.theme) ?? 0) + 1);
  }
  const topThemes = Array.from(themeCounts.entries())
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const lastMessageAt = messages.length > 0 ? messages[0].occurred_at : null;
  const lastAnalysisAt = analysis.reduce<string | null>((max, a) => (!max || a.analyzed_at > max ? a.analyzed_at : max), null);

  return {
    totals: {
      messages: messages.length,
      groups: groupRows?.length ?? 0,
      unique_senders: uniqueSenders.size,
      analyzed,
      pending,
      failed,
      high_or_critical_risk: highOrCriticalRisk,
    },
    sentiment: distributionOf(analysis.map((a) => a.sentiment)),
    risk: distributionOf(analysis.map((a) => a.risk_level)),
    relevance: distributionOf(analysis.map((a) => a.relevance)),
    top_themes: topThemes,
    freshness: {
      last_message_at: lastMessageAt,
      last_analysis_at: lastAnalysisAt,
    },
  };
}

export async function getFilters(clientId: string | null, filters: CommonFilters) {
  const messages = await fetchMessageRowsForAggregation(clientId, filters);
  const messageIds = messages.map((m) => m.id);
  const analysis = await fetchAnalysisRowsForMessages(clientId, messageIds, { ...filters, sentiment: null, riskLevel: null, relevance: null });

  const admin = createAdminClient();
  const chatIds = Array.from(new Set(messages.map((m) => m.chat_id)));
  let chatsQuery = admin.from('whatsapp_chats').select('id, name, chat_type').in('id', chatIds).eq('chat_type', 'GROUP');
  if (clientId) chatsQuery = chatsQuery.eq('client_id', clientId);
  const { data: chats, error: chatsError } = chatIds.length ? await chatsQuery : { data: [], error: null };
  if (chatsError) throw new Error('WHATSAPP_QUERY_FAILED');

  const messageTypeCounts = new Map<string, number>();
  for (const m of messages) messageTypeCounts.set(m.message_type, (messageTypeCounts.get(m.message_type) ?? 0) + 1);

  return {
    groups: (chats ?? []).map((c) => ({ value: c.id, label: c.name ?? 'Sem nome' })),
    sentiments: distributionOf(analysis.map((a) => a.sentiment)).map((d) => ({ value: d.key, count: d.count })),
    risk_levels: distributionOf(analysis.map((a) => a.risk_level)).map((d) => ({ value: d.key, count: d.count })),
    relevance_levels: distributionOf(analysis.map((a) => a.relevance)).map((d) => ({ value: d.key, count: d.count })),
    themes: distributionOf(analysis.map((a) => a.theme)).map((d) => ({ value: d.key, count: d.count })),
    message_types: Array.from(messageTypeCounts.entries()).map(([value, count]) => ({ value, count })),
  };
}

export async function getGroups(clientId: string | null, filters: CommonFilters, opts: { activeOnly?: boolean } = {}) {
  const messages = await fetchMessageRowsForAggregation(clientId, filters);
  const byChat = new Map<string, { messageCount: number; senders: Set<string>; lastMessageAt: string }>();
  for (const m of messages) {
    const entry = byChat.get(m.chat_id) ?? { messageCount: 0, senders: new Set<string>(), lastMessageAt: m.occurred_at };
    entry.messageCount += 1;
    if (m.sender_provider_id) entry.senders.add(m.sender_provider_id);
    if (m.occurred_at > entry.lastMessageAt) entry.lastMessageAt = m.occurred_at;
    byChat.set(m.chat_id, entry);
  }

  const chatIds = Array.from(byChat.keys());
  const admin = createAdminClient();
  let chatQuery = admin.from('whatsapp_chats').select('id, name, chat_type, is_active').eq('chat_type', 'GROUP');
  if (clientId) chatQuery = chatQuery.eq('client_id', clientId);
  if (chatIds.length > 0) chatQuery = chatQuery.in('id', chatIds);
  else chatQuery = chatQuery.eq('id', '00000000-0000-0000-0000-000000000000');
  if (opts.activeOnly) chatQuery = chatQuery.eq('is_active', true);
  if (filters.q) chatQuery = chatQuery.ilike('name', `%${filters.q}%`);

  const { data: chats, error } = await chatQuery;
  if (error) throw new Error('WHATSAPP_QUERY_FAILED');

  return {
    items: (chats ?? [])
      .map((c) => {
        const agg = byChat.get(c.id);
        return {
          id: c.id,
          name: c.name ?? 'Sem nome',
          type: c.chat_type,
          is_active: c.is_active,
          message_count: agg?.messageCount ?? 0,
          unique_senders: agg?.senders.size ?? 0,
          last_message_at: agg?.lastMessageAt ?? null,
        };
      })
      .sort((a, b) => b.message_count - a.message_count),
  };
}

function encodeCursor(occurredAt: string, id: string): string {
  return Buffer.from(`${occurredAt}|${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { occurredAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parts = raw.split('|');
    if (parts.length !== 2) return null;
    const [occurredAt, id] = parts;
    if (!occurredAt || !id || !isValidIsoDate(occurredAt) || !UUID_RE.test(id)) return null;
    return { occurredAt, id };
  } catch {
    return null;
  }
}

export interface MessagesFeedParams {
  filters: CommonFilters;
  cursor: string | null;
  pageSize: number;
}

export function clampPageSize(raw: string | null): number {
  if (!raw) return DEFAULT_PAGE_SIZE;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(n, 1), MAX_PAGE_SIZE);
}

export async function getMessagesFeed(clientId: string | null, params: MessagesFeedParams) {
  const admin = createAdminClient();
  const { filters, cursor, pageSize } = params;
  const matchingAnalysisMessageIds = await fetchMatchingAnalysisMessageIds(clientId, filters);

  if (matchingAnalysisMessageIds?.length === 0) {
    return { items: [], next_cursor: null, has_more: false };
  }

  let query = admin
    .from('whatsapp_messages')
    .select(
      'id, occurred_at, chat_id, sender_provider_id, sender_name, message_type, text, caption, media_url, media_mime_type, from_me, analysis_status'
    )
    .gte('occurred_at', filters.from)
    .lt('occurred_at', filters.to)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(pageSize + 1);

  if (clientId) query = query.eq('client_id', clientId);
  if (filters.chatId) query = query.eq('chat_id', filters.chatId);
  if (matchingAnalysisMessageIds) query = query.in('id', matchingAnalysisMessageIds);
  if (filters.q) query = query.or(buildTextSearchOrFilter(filters.q));

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (!decoded) throw new Error('INVALID_CURSOR');
    query = query.or(`occurred_at.lt.${decoded.occurredAt},and(occurred_at.eq.${decoded.occurredAt},id.lt.${decoded.id})`);
  }

  const { data: messageRows, error } = await query;
  if (error) throw new Error('WHATSAPP_QUERY_FAILED');

  const hasMore = (messageRows ?? []).length > pageSize;
  const pageRows = (messageRows ?? []).slice(0, pageSize);

  const chatIds = Array.from(new Set(pageRows.map((m) => m.chat_id)));
  const messageIds = pageRows.map((m) => m.id);

  let chatsQuery = admin.from('whatsapp_chats').select('id, name, chat_type').in('id', chatIds);
  if (clientId) chatsQuery = chatsQuery.eq('client_id', clientId);
  let fullAnalysisQuery = admin
    .from('whatsapp_analysis')
    .select('message_id, theme, subtheme, sentiment, sentiment_score, relevance, ai_summary, intent, risk_level, mentioned_candidates, mentioned_entities, mentioned_locations')
    .eq('status', 'COMPLETED')
    .in('message_id', messageIds);
  if (clientId) fullAnalysisQuery = fullAnalysisQuery.eq('client_id', clientId);

  const [{ data: chats, error: chatsError }, { data: fullAnalysis, error: analysisError }] = await Promise.all([
    chatIds.length ? chatsQuery : Promise.resolve({ data: [], error: null }),
    messageIds.length ? fullAnalysisQuery : Promise.resolve({ data: [], error: null }),
  ]);
  if (chatsError || analysisError) throw new Error('WHATSAPP_QUERY_FAILED');

  const chatById = new Map((chats ?? []).map((c) => [c.id, c]));
  const analysisByMessageId = new Map((fullAnalysis ?? []).map((a) => [a.message_id, a]));

  const items = pageRows
    .map((m) => {
      const chat = chatById.get(m.chat_id);
      const a = analysisByMessageId.get(m.id);
      return {
        id: m.id,
        occurred_at: m.occurred_at,
        chat: { id: m.chat_id, name: chat?.name ?? null, type: chat?.chat_type ?? 'UNKNOWN' },
        sender: { id: m.sender_provider_id, name: m.sender_name },
        message_type: m.message_type,
        text: m.text,
        caption: m.caption,
        media: m.media_url ? { url: m.media_url, mime_type: m.media_mime_type } : null,
        from_me: m.from_me,
        analysis_status: m.analysis_status,
        analysis: a
          ? {
              theme: a.theme,
              subtheme: a.subtheme,
              sentiment: a.sentiment,
              sentiment_score: a.sentiment_score,
              relevance: a.relevance,
              summary: a.ai_summary,
              intent: a.intent,
              risk_level: a.risk_level,
              mentioned_candidates: a.mentioned_candidates,
              mentioned_entities: a.mentioned_entities,
              mentioned_locations: a.mentioned_locations,
            }
          : null,
      };
    });

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && lastRow ? encodeCursor(lastRow.occurred_at, lastRow.id) : null;

  return { items, next_cursor: nextCursor, has_more: hasMore };
}
