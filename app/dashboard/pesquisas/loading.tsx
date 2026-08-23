import PageLoading from '@/components/ui/PageLoading';

export default function PesquisasLoading() {
  return (
    <PageLoading
      message="Carregando pesquisas..."
      hint="Aguarde enquanto consolidamos os dados."
    />
  );
}
