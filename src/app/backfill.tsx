import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Chip, Screen, T } from '@/components/ui';
import { discardBackfillDrafts, startWorkout } from '@/db/repo';
import { formatDate } from '@/domain/format';
import { colors, radius, space } from '@/lib/theme';

const DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6];

export default function BackfillScreen() {
  const db = useSQLiteContext();
  const [daysAgo, setDaysAgo] = useState(1);
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState('60');

  const dayLabel = (d: number) => (d === 0 ? 'Danas' : d === 1 ? 'Jučer' : `Prije ${d} dana`);

  const next = async () => {
    const m = /^(\d{1,2})[:.](\d{2})$/.exec(time.trim());
    const durMin = Number(duration);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return Alert.alert('Vrijeme', 'Upiši vrijeme početka, npr. 18:30.');
    if (!Number.isFinite(durMin) || durMin < 5 || durMin > 240) return Alert.alert('Trajanje', 'Trajanje mora biti između 5 i 240 minuta.');
    const start = new Date();
    start.setDate(start.getDate() - daysAgo);
    start.setHours(Number(m[1]), Number(m[2]), 0, 0);
    if (start.getTime() + durMin * 60000 > Date.now()) {
      return Alert.alert('Vrijeme', 'Naknadni unos mora biti trening koji je već završio.');
    }
    await discardBackfillDrafts(db);
    const id = await startWorkout(db, { backfillStartedAt: start.getTime() });
    router.replace({ pathname: '/workout/active', params: { id, dur: String(Math.round(durMin)) } });
  };

  const preview = new Date();
  preview.setDate(preview.getDate() - daysAgo);

  return (
    <Screen edges={['bottom']}>
      <Card>
        <T variant="heading">Zaboravio si zabilježiti trening?</T>
        <T variant="dim">
          Naknadni unos ulazi u povijest, statistiku i tjedni niz, ali ne donosi XP. XP donose samo treninzi odrađeni uživo u
          aplikaciji.
        </T>
      </Card>

      <T variant="label">Dan</T>
      <View style={styles.wrap}>
        {DAY_OPTIONS.map((d) => (
          <Chip key={d} label={dayLabel(d)} active={daysAgo === d} onPress={() => setDaysAgo(d)} />
        ))}
      </View>
      <T variant="small">{formatDate(preview.getTime())}</T>

      <T variant="label">Početak (HH:MM)</T>
      <TextInput style={styles.input} value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />

      <T variant="label">Trajanje (minute)</T>
      <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" />

      <Button title="Nastavi na unos vježbi" onPress={next} style={{ marginTop: space.md }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    minHeight: 48,
    fontSize: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
