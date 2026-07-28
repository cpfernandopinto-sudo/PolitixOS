import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Garante DOM limpo entre testes de componente (evita "found multiple
// elements" quando um teste anterior não desmonta).
afterEach(() => {
  cleanup();
});
