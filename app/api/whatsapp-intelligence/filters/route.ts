import 'server-only';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  getFilters,
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

  try {
    const data = await getFilters(scope.clientId, parsed.filters);
    return successResponse(data);
  } catch {
    return whatsappErrorResponse('WHATSAPP_QUERY_FAILED', 'Falha ao consultar dados do WhatsApp Intelligence.', 500, requestId);
  }
}
