import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Loading, Row, Screen, T } from '@/components/ui';
import type { ExerciseWithRest, RoutineItem } from '@/db/repo';
import { deleteRoutine, getRoutine, listExercises, saveRoutine } from '@/db/repo';
import { formatClock } from '@/domain/format';
import { takeRoutinePick } from '@/lib/pickerBus';
import { colors, radius, space } from '@/lib/theme';

export default function RoutineEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const db = useSQLiteContext();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [exMap, setExMap] = useState<Map<string, ExerciseWithRest>>(new Map());

  useEffect(() => {
    (async () => {
      const exercises = await listExercises(db);
      setExMap(new Map(exercises.map((e) => [e.id, e])));
      if (!isNew) {
        const r = await getRoutine(db, id);
        if (r) {
          setName(r.name);
          setItems(r.items);
        }
      }
      setLoaded(true);
    })();
  }, [db, id, isNew]);

  // Preuzmi vježbu odabranu u modalnom ekranu.
  useFocusEffect(
    useCallback(() => {
      const picked = takeRoutinePick();
      if (picked) {
        listExercises(db).then((ex) => setExMap(new Map(ex.map((e) => [e.id, e]))));
        setItems((prev) => [...prev, { exerciseId: picked, plannedSets: 3, restSec: null }]);
      }
    }, [db]),
  );

  if (!loaded) return <Loading />;

  const update = (i: number, patch: Partial<RoutineItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) =>
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    if (!name.trim()) return Alert.alert('Naziv', 'Upiši naziv rutine.');
    if (items.length === 0) return Alert.alert('Vježbe', 'Dodaj barem jednu vježbu.');
    await saveRoutine(db, { id: isNew ? undefined : id, name: name.trim(), items });
    router.back();
  };

  const remove = () =>
    Alert.alert('Obriši rutinu?', 'Povijest treninga ostaje sačuvana.', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Obriši',
        style: 'destructive',
        onPress: async () => {
          await deleteRoutine(db, id);
          router.back();
        },
      },
    ]);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: isNew ? 'Nova rutina' : 'Uredi rutinu' }} />
      <T variant="label">Naziv</T>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="npr. Push dan"
        placeholderTextColor={colors.textFaint}
      />

      {items.map((it, i) => {
        const ex = exMap.get(it.exerciseId);
        return (
          <Card key={`${it.exerciseId}-${i}`}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T variant="heading">{ex?.nameEn ?? '?'}</T>
                <T variant="small">{ex?.nameHr}</T>
              </View>
              <Pressable onPress={() => move(i, -1)} hitSlop={8} style={styles.icon}>
                <T>▲</T>
              </Pressable>
              <Pressable onPress={() => move(i, 1)} hitSlop={8} style={styles.icon}>
                <T>▼</T>
              </Pressable>
              <Pressable onPress={() => setItems((p) => p.filter((_, idx) => idx !== i))} hitSlop={8} style={styles.icon}>
                <T style={{ color: colors.danger }}>✕</T>
              </Pressable>
            </Row>
            <Stepper
              label="Serije"
              value={String(it.plannedSets)}
              onMinus={() => update(i, { plannedSets: Math.max(1, it.plannedSets - 1) })}
              onPlus={() => update(i, { plannedSets: Math.min(10, it.plannedSets + 1) })}
            />
            <Stepper
              label="Pauza"
              value={it.restSec == null ? `zapamćena${ex?.restSec ? ` (${formatClock(ex.restSec)})` : ''}` : formatClock(it.restSec)}
              onMinus={() => update(i, { restSec: Math.max(15, (it.restSec ?? ex?.restSec ?? 90) - 15) })}
              onPlus={() => update(i, { restSec: Math.min(600, (it.restSec ?? ex?.restSec ?? 90) + 15) })}
            />
          </Card>
        );
      })}

      <Button
        kind="secondary"
        title="+ Dodaj vježbu"
        onPress={() => router.push({ pathname: '/exercise-picker', params: { target: 'routine' } })}
      />
      <Button title="Spremi rutinu" onPress={save} />
      {!isNew && <Button kind="ghost" title="Obriši rutinu" onPress={remove} />}
    </Screen>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T variant="dim">{label}</T>
      <Row>
        <Button small kind="secondary" title="−" onPress={onMinus} />
        <T style={{ minWidth: 90, textAlign: 'center', fontWeight: '700' }}>{value}</T>
        <Button small kind="secondary" title="+" onPress={onPlus} />
      </Row>
    </Row>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    minHeight: 48,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { paddingHorizontal: 6 },
});
