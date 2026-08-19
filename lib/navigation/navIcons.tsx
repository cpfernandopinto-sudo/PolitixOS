import type { ComponentType } from 'react';

export type NavIconProps = { size?: number; className?: string };
export type NavIcon = ComponentType<NavIconProps>;

/**
 * Ícones dedicados de Instagram/X — mesmo desenho usado no Sidebar anterior
 * (components/Sidebar.tsx), reaproveitado aqui para não duplicar estilos
 * nem regredir a identidade visual dos itens de navegação.
 *
 * Vive em arquivo próprio (em vez de dashboardNavigation.tsx) porque tanto
 * `appScreens.ts` quanto `dashboardNavigation.tsx` precisam desses ícones —
 * mantê-los em dashboardNavigation.tsx criaria um import circular entre os
 * dois módulos.
 */
export function InstagramNavIcon({ size = 20, className = '' }: NavIconProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-md border-2 border-current ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="rounded-full border-2 border-current"
        style={{ width: Math.round(size * 0.42), height: Math.round(size * 0.42) }}
      />
      <span
        className="absolute rounded-full bg-current"
        style={{
          width: Math.max(3, Math.round(size * 0.14)),
          height: Math.max(3, Math.round(size * 0.14)),
          right: Math.round(size * 0.18),
          top: Math.round(size * 0.18),
        }}
      />
    </span>
  );
}

export function XNavIcon({ size = 20, className = '' }: NavIconProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md border border-current/35 font-black leading-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.78), lineHeight: 1 }}
      aria-hidden="true"
    >
      X
    </span>
  );
}
