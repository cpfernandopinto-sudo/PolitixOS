import 'server-only';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  getGroups,
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

  const activeOnlyRaw = request.nextUrl.searchParams.get('active_only');
  const activeOnly = activeOnlyRaw === 'true';

  try {
    const data = await getGroups(scope.clientId, parsed.filters, { activeOnly });
    return successResponse(data);
  } catch {
    return whatsappErrorResponse('WHATSAPP_QUERY_FAILED', 'Falha ao consultar dados do WhatsApp Intelligence.', 500, requestId);
  }
}
