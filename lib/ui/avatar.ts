/**
 * Identidade visual determinística para entidades sem foto (Sprint 5).
 * Nunca busca imagem externa — apenas deriva iniciais e uma cor de um nome
 * já conhecido. Mesma entrada sempre produz a mesma saída (nenhuma
 * aleatoriedade), para que a mesma entidade tenha sempre o mesmo avatar.
 */

/** Extrai até 2 iniciais em maiúsculo a partir do nome (primeira + última palavra). */
export function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

const AVATAR_PALETTE = [
  'bg-blue-500/20 text-blue-300',
  'bg-purple-500/20 text-purple-300',
  'bg-teal-500/20 text-teal-300',
  'bg-orange-500/20 text-orange-300',
  'bg-pink-500/20 text-pink-300',
  'bg-cyan-500/20 text-cyan-300',
  'bg-amber-500/20 text-amber-300',
  'bg-emerald-500/20 text-emerald-300',
];

/** Hash simples e determinístico (sem dependência externa) para escolher uma cor estável por nome. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Classe Tailwind (bg + texto) estável para o avatar de uma entidade, derivada do nome. */
export function getAvatarColorClass(name: string): string {
  return AVATAR_PALETTE[hashString(name) % AVATAR_PALETTE.length];
}
