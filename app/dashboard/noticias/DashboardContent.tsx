import React from 'react';
import { fetchMencoes } from '@/lib/queries/noticias';
import type { NoticiasFilters } from '@/lib/types/noticias';
import NoticiasDashboardClient from './NoticiasDashboardClient';

interface Props {
  filters: NoticiasFilters;
}

export default async function DashboardContent({ filters }: Props) {
  // Busca a base de dados filtrada APENAS pelos filtros globais e permissões
  const rows = await fetchMencoes(filters);

  // Delega a inteligência de visualização e filtros locais para o Client Component
  return <NoticiasDashboardClient initialRows={rows} />;
}
