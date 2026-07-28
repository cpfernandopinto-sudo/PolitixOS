'use client';

import { Component, ReactNode, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RotateCw } from 'lucide-react';

function SectionErrorFallback({ label, minHeight }: { label?: string; minHeight?: number }) {
  const router = useRouter();
  return (
    <div
      className="bg-[#1A1A1A] border border-red-500/20 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center"
      style={{ minHeight: minHeight ?? 140 }}
    >
      <AlertTriangle className="text-red-500" size={20} />
      <p className="text-sm text-gray-300">
        Não foi possível carregar {label ? `"${label}"` : 'este bloco'} agora. Os demais dados da tela continuam disponíveis.
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <RotateCw size={12} /> TENTAR NOVAMENTE
      </button>
    </div>
  );
}

interface BoundaryState {
  hasError: boolean;
}

class SectionErrorBoundary extends Component<{ children: ReactNode; label?: string; minHeight?: number }, BoundaryState> {
  constructor(props: { children: ReactNode; label?: string; minHeight?: number }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[SectionBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error);
  }

  render() {
    if (this.state.hasError) {
      return <SectionErrorFallback label={this.props.label} minHeight={this.props.minHeight} />;
    }
    return this.props.children;
  }
}

/**
 * Envolve um bloco independente de dashboard (Server Component assíncrono)
 * com loading (Suspense), erro isolado (ErrorBoundary) e possibilidade de
 * "tentar novamente" via router.refresh() — sem derrubar o restante da tela.
 */
export default function SectionBoundary({
  children,
  fallback,
  label,
  minHeight,
}: {
  children: ReactNode;
  fallback: ReactNode;
  label?: string;
  minHeight?: number;
}) {
  return (
    <SectionErrorBoundary label={label} minHeight={minHeight}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </SectionErrorBoundary>
  );
}
