import type { ComponentType } from 'react';

export type NavIconProps = { size?: number; className?: string };
export type NavIcon = ComponentType<NavIconProps>;

/**
 * Ícones dedicados de Instagram/X/Facebook — mesmo desenho usado no Sidebar/Navegação,
 * reaproveitado aqui para não duplicar estilos nem regredir a identidade visual.
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

export function FacebookNavIcon({ size = 20, className = '' }: NavIconProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md border border-current/35 font-bold leading-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.78), lineHeight: 1 }}
      aria-hidden="true"
    >
      f
    </span>
  );
}

export function WhatsAppNavIcon({ size = 20, className = '' }: NavIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7.02 8.48 7.02 9.68C7.02 10.88 7.89 12.04 8.01 12.2C8.13 12.37 9.72 14.81 12.16 15.86C12.74 16.11 13.19 16.26 13.55 16.37C14.13 16.56 14.66 16.53 15.08 16.47C15.55 16.4 16.52 15.88 16.72 15.31C16.92 14.75 16.92 14.27 16.86 14.17C16.8 14.07 16.64 14.01 16.4 13.89C16.16 13.77 14.98 13.19 14.76 13.11C14.54 13.03 14.38 12.99 14.22 13.23C14.06 13.47 13.6 14.01 13.46 14.17C13.32 14.33 13.18 14.35 12.94 14.23C12.7 14.11 11.93 13.86 11.01 13.04C10.3 12.4 9.81 11.62 9.69 11.38C9.57 11.14 9.68 11.01 9.8 10.89C9.91 10.78 10.05 10.6 10.17 10.46C10.29 10.32 10.33 10.22 10.41 10.06C10.49 9.9 10.45 9.76 10.39 9.64C10.33 9.52 9.87 8.38 9.68 7.91C9.49 7.46 9.3 7.52 9.15 7.51C9.02 7.51 8.86 7.51 8.7 7.51C8.54 7.51 8.37 7.33 8.53 7.33Z" />
    </svg>
  );
}
