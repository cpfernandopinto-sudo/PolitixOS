import PageLoading from '@/components/ui/PageLoading';

export default function OverviewLoading() {
  return (
    <PageLoading
      message="Carregando Visão Geral..."
      hint="Aguarde enquanto consolidamos os dados."
    />
  );
}
