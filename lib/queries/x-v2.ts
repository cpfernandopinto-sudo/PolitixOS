import type { XOrigin } from '@/lib/x/v2-contract';

export interface XV2Filters {
  clientId: string;
  allowedTargetIds: string[];
  targetIds?: string[];
  from?: string;
  to?: string;
  origin?: XOrigin;
  matchedTerm?: string;
  risk?: string;
  sentiment?: string;
  topic?: string;
  offset?: number;
  limit?: number;
}

export const X_V2_CAPABILITIES = {
  target: true,
  client: true,
  period: true,
  risk: true,
  sentiment: true,
  topic: true,
  origin: true,
  matchedTerm: true,
  multiTargetAssociation: true,
  replyHierarchy: true,
  replyTenantColumn: true,
} as const;

export interface XV2QueryPlan {
  clientId: string;
  targetIds: string[];
  from: string | null;
  to: string | null;
  offset: number;
  limit: number;
  unsupportedFilters: [];
}

/** Builds a tenant-safe plan. Persistence-dependent filters are explicit, never silently ignored. */
export function planXV2Query(filters: XV2Filters): XV2QueryPlan {
  const requested = filters.targetIds ?? filters.allowedTargetIds;
  const allowed = new Set(filters.allowedTargetIds);
  const targetIds = [...new Set(requested.filter(id => allowed.has(id)))];
  const unsupportedFilters: XV2QueryPlan['unsupportedFilters'] = [];

  return {
    clientId: filters.clientId,
    targetIds,
    from: filters.from ?? null,
    to: filters.to ?? null,
    offset: Math.max(0, filters.offset ?? 0),
    limit: Math.min(100, Math.max(1, filters.limit ?? 25)),
    unsupportedFilters,
  };
}
