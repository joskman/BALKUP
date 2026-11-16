// Privremeni vizualni stil prototipa: tamna, sportska paleta.
// Pravi vizualni identitet definira se u Fazi E.

import type { Rarity } from '@/domain/items';

export const colors = {
  bg: '#0E0F12',
  card: '#181A20',
  cardHigh: '#22252D',
  border: '#2C303A',
  text: '#F4F5F7',
  textDim: '#A0A6B2',
  textFaint: '#6B7180',
  accent: '#FF5A36',
  accentDim: '#5A2618',
  success: '#2FCB7A',
  warning: '#F2B33D',
  danger: '#F0525B',
  xp: '#FFC23D',
} as const;

export const rarityColors: Record<Rarity, string> = {
  common: '#9AA0A6',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F5B301',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
