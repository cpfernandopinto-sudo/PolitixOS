import PageLoading from '@/components/ui/PageLoading';

export default function InvestigacoesLoading() {
  return (
    <PageLoading
      message="Carregando investigações..."
      hint="Aguarde enquanto consolidamos os dados."
    />
  );
}
