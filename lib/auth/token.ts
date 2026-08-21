import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '@/lib/auth/types';

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  allowedTargetIds: string[];
  /**
   * Bloco 2 (multi-tenant). `null` = admin global (todos os clientes).
   * Não-admin: id do único cliente ao qual o usuário pertence (Modelo A).
   * Calculado no login (loginAction), igual a allowedTargetIds — não é
   * recalculado a cada request.
   */
  clientId: string | null;
  expiresAt: string;
}

function getEncodedSessionSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;

  if (!raw) {
    throw new Error('[PolitixOS] SESSION_SECRET não configurado. Adicione ao .env.local');
  }

  return new TextEncoder().encode(raw);
}

export async function encryptSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getEncodedSessionSecret());
}

export async function decryptSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getEncodedSessionSecret(), {
      algorithms: ['HS256'],
    });

    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
