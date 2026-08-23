import PageLoading from '@/components/ui/PageLoading';

export default function TerritoriosLoading() {
  return (
    <PageLoading
      message="Carregando territórios..."
      hint="Aguarde enquanto consolidamos os dados."
    />
  );
}
