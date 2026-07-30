import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    // Testes de componente (*.test.tsx) precisam de DOM — usam a pragma
    // `// @vitest-environment jsdom` no topo do arquivo para trocar de
    // ambiente individualmente, mantendo os testes de função pura (*.test.ts)
    // rápidos no ambiente node padrão.
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    setupFiles: ['lib/test/setup-jsdom.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': path.resolve(__dirname, 'lib/test/server-only-stub.ts'),
    },
  },
});
