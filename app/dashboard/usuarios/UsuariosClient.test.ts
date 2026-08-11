import { describe, it, expect } from 'vitest';
import { ALL_SCREENS } from '@/lib/auth/types';
import { SCREEN_LABELS } from './UsuariosClient';

describe('SCREEN_LABELS — rótulo amigável na tela de gerenciamento de usuários', () => {
  it('"territorios" tem rótulo amigável "Territórios" (não cai no fallback cru)', () => {
    expect(SCREEN_LABELS.territorios).toBe('Territórios');
  });

  it('toda screen_key em ALL_SCREENS tem um rótulo amigável correspondente', () => {
    const semRotulo = ALL_SCREENS.filter((key) => !SCREEN_LABELS[key]);
    expect(semRotulo).toEqual([]);
  });
});
