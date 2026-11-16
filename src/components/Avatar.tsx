import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { composeAvatarSvg, composeItemPreviewSvg } from '@/art/character';
import type { ItemDef, Slot } from '@/domain/items';
import { itemById } from '@/domain/items';

/** Opremljeni predmeti po slotu, iz retka inventara. */
export function equippedMap(inventory: { itemId: string; equipped: boolean }[]): Partial<Record<Slot, ItemDef>> {
  const out: Partial<Record<Slot, ItemDef>> = {};
  for (const row of inventory) {
    const item = itemById(row.itemId);
    if (row.equipped && item) out[item.slot] = item;
  }
  return out;
}

/** Lik s opremom: SVG slojevi iz src/art/character.ts složeni jedan na drugi. */
export function Avatar({ size = 200, equipped }: { size?: number; equipped: Partial<Record<Slot, ItemDef>> }) {
  const ids: Partial<Record<Slot, string>> = {};
  for (const [slot, item] of Object.entries(equipped) as [Slot, ItemDef | undefined][]) {
    if (item) ids[slot] = item.id;
  }
  const xml = composeAvatarSvg(ids);
  return (
    <View style={{ width: size, height: size }} accessibilityLabel="Lik">
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}

/** Sličica predmeta za inventar. */
export function ItemPreview({ item, size = 72 }: { item: ItemDef; size?: number }) {
  const xml = composeItemPreviewSvg(item.id, item.slot);
  return <SvgXml xml={xml} width={size} height={size} />;
}
