/**
 * Script para criar o primeiro usuário admin no Supabase.
 * 
 * Uso:
 *   node scripts/seed-admin.mjs
 *
 * Requer: .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

// Lê .env.local manualmente
const envPath = resolve(process.cwd(), '.env.local');
const env = {};
try {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const [key, ...val] = line.split('=');
    if (key && val.length) env[key.trim()] = val.join('=').trim();
  }
} catch {
  console.error('Não foi possível ler .env.local');
  process.exit(1);
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Configuração do admin ──────────────────────────────────────────────────────
const ADMIN_NAME = 'Administrador';
const ADMIN_EMAIL = 'admin@politixos.com';
const ADMIN_PASSWORD = 'Admin@2025!';  // ← altere antes de rodar

async function main() {
  console.log('Gerando hash da senha...');
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  
  console.log('Inserindo usuário admin...');
  const { data, error } = await supabase
    .from('app_users')
    .upsert(
      {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
      },
      { onConflict: 'email' }
    )
    .select('id, email, role')
    .single();

  if (error) {
    console.error('Erro ao inserir admin:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Admin criado/atualizado com sucesso!');
  console.log('   ID:    ', data.id);
  console.log('   Email: ', data.email);
  console.log('   Role:  ', data.role);
  console.log('\n📌 Credenciais de acesso:');
  console.log('   Email:', ADMIN_EMAIL);
  console.log('   Senha:', ADMIN_PASSWORD);
  console.log('\n⚠️  Altere a senha após o primeiro login!');
}

main().catch((e) => { console.error(e); process.exit(1); });
