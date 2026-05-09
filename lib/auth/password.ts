/**
 * Password hashing using Node.js built-in crypto (scrypt).
 * Safe to use on the server only — no bcrypt dependency needed.
 */
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const derivedKey = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
    const storedBuf = Buffer.from(hash, 'hex');
    if (derivedKey.length !== storedBuf.length) return false;
    return timingSafeEqual(derivedKey, storedBuf);
  } catch {
    return false;
  }
}
