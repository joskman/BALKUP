import { StyleSheet, View } from 'react-native';

import type { ItemDef, Slot } from '@/domain/items';
import { itemById } from '@/domain/items';
import { colors, rarityColors } from '@/lib/theme';

/** Opremljeni predmeti po slotu, iz retka inventara. */
export function equippedMap(inventory: { itemId: string; equipped: boolean }[]): Partial<Record<Slot, ItemDef>> {
  const out: Partial<Record<Slot, ItemDef>> = {};
  for (const row of inventory) {
    const item = itemById(row.itemId);
    if (row.equipped && item) out[item.slot] = item;
  }
  return out;
}

// PRIVREMENI lik nacrtan jednostavnim oblicima. Kad AI grafika bude gotova (test H2),
// zamjenjuje se PNG slojevima iste veličine (npr. 1024 × 1024, prozirna pozadina)
// koji se samo slažu jedan na drugi: osnovni lik, pa predmeti po slotovima.

const BODY = '#3A3F4B';
const BODY_EDGE = '#4A5060';

export function Avatar({ size = 200, equipped }: { size?: number; equipped: Partial<Record<Slot, ItemDef>> }) {
  const u = size / 100;
  const box = (left: number, top: number, width: number, height: number, color: string, r = 2) => ({
    position: 'absolute' as const,
    left: left * u,
    top: top * u,
    width: width * u,
    height: height * u,
    backgroundColor: color,
    borderRadius: r * u,
  });
  const c = (slot: Slot) => (equipped[slot] ? rarityColors[equipped[slot].rarity] : null);

  const aura = c('aura');
  const head = c('head');
  const torso = c('torso');
  const legs = c('legs');
  const feet = c('feet');
  const hand = c('hand');
  const handItem = equipped.hand;

  return (
    <View style={{ width: size, height: size }} accessibilityLabel="Lik">
      {aura && (
        <>
          <View style={[box(10, 4, 80, 92, aura, 40), { opacity: 0.18 }]} />
          <View style={[box(20, 10, 60, 80, aura, 30), { opacity: 0.22 }]} />
        </>
      )}
      {/* Noge */}
      <View style={box(38, 58, 10, 32, legs ?? BODY, 3)} />
      <View style={box(52, 58, 10, 32, legs ?? BODY, 3)} />
      {/* Obuća */}
      <View style={box(35, 88, 14, 7, feet ?? BODY_EDGE, 3)} />
      <View style={box(51, 88, 14, 7, feet ?? BODY_EDGE, 3)} />
      {/* Ruke */}
      <View style={box(24, 26, 8, 30, BODY, 4)} />
      <View style={box(68, 26, 8, 30, BODY, 4)} />
      {/* Predmet u ruci */}
      {hand && (
        <>
          <View style={box(73, 30, 4, 40, colors.textFaint, 1)} />
          {handItem?.rarity === 'legendary' || handItem?.rarity === 'epic' ? (
            <View style={box(67, 22, 16, 12, hand, 3)} />
          ) : (
            <View style={box(71, 26, 8, 8, hand, 4)} />
          )}
        </>
      )}
      {/* Torzo */}
      <View style={box(33, 24, 34, 36, torso ?? BODY, 6)} />
      {torso && <View style={[box(36, 27, 28, 3, '#FFFFFF', 1), { opacity: 0.25 }]} />}
      {/* Glava */}
      <View style={box(41, 5, 18, 18, BODY_EDGE, 9)} />
      {head && <View style={box(40, 9, 20, 4, head, 2)} />}
      <View style={[StyleSheet.absoluteFill, { borderRadius: 8 * u }]} pointerEvents="none" />
    </View>
  );
}
