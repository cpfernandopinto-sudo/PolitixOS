import PageLoading from '@/components/ui/PageLoading';

export default function NoticiasLoading() {
  return (
    <PageLoading
      message="Carregando notícias..."
      hint="Aguarde enquanto consolidamos os dados."
    />
  );
}
