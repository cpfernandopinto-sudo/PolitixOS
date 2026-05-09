import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/dal';
import { listUsers } from '@/lib/auth/actions';
import { fetchTargets } from '@/lib/queries/candidatos';
import UsuariosClient from './UsuariosClient';

export const metadata = { title: 'Gestão de Usuários' };

export default async function UsuariosPage() {
  const session = await requireAuth();

  // Apenas admin acessa esta tela
  if (session.role !== 'admin') {
    redirect('/dashboard/sem-permissao');
  }

  const [users, targets] = await Promise.all([listUsers(), fetchTargets()]);

  const targetOptions = targets.map((t) => ({
    id: t.id,
    name: t.candidate_name,
  }));

  return <UsuariosClient initialUsers={users} targets={targetOptions} />;
}
