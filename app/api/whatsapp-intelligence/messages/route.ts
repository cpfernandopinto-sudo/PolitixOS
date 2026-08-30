import 'server-only';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  clampPageSize,
  getMessagesFeed,
  parseCommonFilters,
  resolveWhatsappSessionScope,
  successResponse,
  whatsappErrorResponse,
} from '@/lib/queries/whatsappIntelligence';

export async function GET(request: NextRequest) {
  const requestId = randomUUID();

  const scope = await resolveWhatsappSessionScope(requestId);
  if (!scope.ok) return scope.response;

  const parsed = parseCommonFilters(request.nextUrl.searchParams);
  if (!parsed.ok) return whatsappErrorResponse(parsed.code, parsed.message, 400, requestId);

  const sort = request.nextUrl.searchParams.get('sort');
  if (sort && sort !== 'occurred_at_desc') {
    return whatsappErrorResponse('INVALID_FILTER', 'Unico valor de "sort" suportado: occurred_at_desc.', 400, requestId);
  }

  const cursor = request.nextUrl.searchParams.get('cursor');
  const pageSize = clampPageSize(request.nextUrl.searchParams.get('page_size'));

  try {
    const data = await getMessagesFeed(scope.clientId, { filters: parsed.filters, cursor, pageSize });
    return successResponse(data);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_CURSOR') {
      return whatsappErrorResponse('INVALID_CURSOR', 'Cursor invalido ou expirado.', 400, requestId);
    }
    return whatsappErrorResponse('WHATSAPP_QUERY_FAILED', 'Falha ao consultar dados do WhatsApp Intelligence.', 500, requestId);
  }
}
