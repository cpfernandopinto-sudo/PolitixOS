import { createClient } from '@supabase/supabase-js';
import { scrypt, Buffer, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

async function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const derivedKey = await scryptAsync(password, salt, KEYLEN);
    const storedBuf = Buffer.from(hash, 'hex');
    if (derivedKey.length !== storedBuf.length) return false;
    return timingSafeEqual(derivedKey, storedBuf);
  } catch (err) {
    console.error('Erro na verificação de senha:', err.message);
    return false;
  }
}

async function debug() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = 'admin@politixos.com';
  const password = 'Admin@2025!';

  console.log('--- DIAGNÓSTICO DE AUTENTICAÇÃO ---');
  console.log('URL:', url ? 'OK' : 'NÃO DEFINIDA');
  console.log('Service Role Key:', key ? 'OK' : 'NÃO DEFINIDA');

  if (!url || !key) {
    console.error('Erro: Variáveis de ambiente faltando.');
    return;
  }

  const supabase = createClient(url, key);

  console.log(`Buscando usuário: ${email}...`);
  const { data: user, error } = await supabase
    .from('app_users')
    .from('app_users')
    .select('id, email, password_hash, is_active, role')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Erro ao buscar usuário:', error.message);
    if (error.code === 'PGRST116') {
      console.log('DICA: Usuário não encontrado no banco.');
    }
    return;
  }

  console.log('Usuário encontrado: SIM');
  console.log('Ativo:', user.is_active ? 'SIM' : 'NÃO');
  console.log('Role:', user.role);
  
  const hashValido = user.password_hash && user.password_hash.includes(':');
  console.log('Formato do hash compatível:', hashValido ? 'SIM' : 'NÃO');

  if (hashValido) {
    const isMatch = await verifyPassword(password, user.password_hash);
    console.log('Senha Admin@2025! válida:', isMatch ? 'SIM' : 'NÃO');
    
    if (!isMatch) {
      console.log('\n--- DICA PARA CORREÇÃO ---');
      console.log('Se a senha estiver correta mas o hash não bater, rode o seguinte SQL no Supabase para resetar a senha do admin:');
      
      // Gerar um novo hash para a senha Admin@2025! para mostrar no log (seguro, é o hash, não a senha)
      const salt = 'debug_salt_123';
      const derivedKey = await scryptAsync(password, salt, KEYLEN);
      const newHash = `${salt}:${derivedKey.toString('hex')}`;
      
      console.log(`UPDATE app_users SET password_hash = '${newHash}' WHERE email = '${email}';`);
      console.log('(Nota: O hash acima usa um salt fixo apenas para exemplo no script. Em produção, o sistema gera salts aleatórios.)');
    }
  } else {
    console.log('Atenção: O password_hash no banco não parece estar no formato "salt:hash".');
  }
}

debug();
