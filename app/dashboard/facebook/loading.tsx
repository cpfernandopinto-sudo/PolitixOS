import PageLoading from '@/components/ui/PageLoading';

export default function FacebookLoading() {
  return (
    <PageLoading
      message="Carregando inteligência do Facebook..."
      hint="Aguarde enquanto consolidamos os dados."
    />
  );
}
