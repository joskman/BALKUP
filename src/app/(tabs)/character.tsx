import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, equippedMap } from '@/components/Avatar';
import { Card, Loading, Row, Screen, T } from '@/components/ui';
import { computeProgress } from '@/db/progress';
import { setEquipped } from '@/db/repo';
import type { Slot } from '@/domain/items';
import { ITEMS, RARITY_LABELS, SLOT_LABELS } from '@/domain/items';
import { colors, rarityColors, radius, space } from '@/lib/theme';
import { useFocusLoad } from '@/lib/useFocusLoad';

const SLOT_ORDER: Slot[] = ['head', 'torso', 'legs', 'feet', 'hand', 'aura'];

export default function CharacterScreen() {
  // Otvaranje ekrana „Lik“ ujedno sinkronizira otključane predmete s levelom.
  const { data, reload, db } = useFocusLoad((db) => computeProgress(db, { persist: true }));
  if (!data) return <Loading />;

  const owned = new Map(data.inventory.map((i) => [i.itemId, i]));
  const equipped = equippedMap(data.inventory);

  const toggle = async (itemId: string) => {
    const item = ITEMS.find((i) => i.id === itemId);
    const row = owned.get(itemId);
    if (!item || !row) return;
    const sameSlot = ITEMS.filter((i) => i.slot === item.slot && i.id !== item.id).map((i) => i.id);
    await setEquipped(db, itemId, !row.equipped, sameSlot);
    await reload();
  };

  return (
    <Screen>
      <T variant="title">Lik</T>
      <Card style={{ alignItems: 'center' }}>
        <Avatar size={240} equipped={equipped} />
        <T variant="heading">Level {data.level.level}</T>
        <T variant="small">Privremeni lik. Prava grafika dolazi nakon testa AI opreme (H2).</T>
      </Card>

      <Card>
        <T variant="heading">Opremljeno</T>
        {SLOT_ORDER.map((slot) => (
          <Row key={slot} style={{ justifyContent: 'space-between' }}>
            <T variant="dim">{SLOT_LABELS[slot]}</T>
            <T style={{ color: equipped[slot] ? rarityColors[equipped[slot].rarity] : colors.textFaint }}>
              {equipped[slot]?.name ?? '—'}
            </T>
          </Row>
        ))}
      </Card>

      <T variant="heading">Inventar</T>
      <T variant="small">Dodirni otključani predmet da ga opremiš ili skineš.</T>
      <View style={styles.grid}>
        {ITEMS.map((item) => {
          const row = owned.get(item.id);
          const unlocked = row != null;
          return (
            <Pressable
              key={item.id}
              disabled={!unlocked}
              onPress={() => toggle(item.id)}
              style={[
                styles.item,
                { borderColor: unlocked ? rarityColors[item.rarity] : colors.border },
                row?.equipped && { backgroundColor: colors.cardHigh },
              ]}>
              <View style={[styles.swatch, { backgroundColor: unlocked ? rarityColors[item.rarity] : colors.cardHigh }]} />
              <T style={{ fontWeight: '700', color: unlocked ? colors.text : colors.textFaint }} numberOfLines={2}>
                {unlocked ? item.name : '???'}
              </T>
              <T variant="small">
                {SLOT_LABELS[item.slot]} · {RARITY_LABELS[item.rarity]}
              </T>
              <T variant="small" style={{ color: unlocked ? (row?.equipped ? colors.success : colors.textDim) : colors.textFaint }}>
                {unlocked ? (row?.equipped ? 'Opremljeno' : 'Otključano') : `🔒 Level ${item.unlockLevel}`}
              </T>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  item: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: space.md,
    gap: 4,
  },
  swatch: { height: 36, borderRadius: radius.sm, marginBottom: 4 },
});
