import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, Loading, T } from '@/components/ui';
import { addExerciseToWorkout, listExercises } from '@/db/repo';
import { EQUIPMENT_LABELS, matchesSearch, MUSCLE_LABELS } from '@/domain/exercises';
import type { MuscleGroup } from '@/domain/types';
import { setRoutinePick } from '@/lib/pickerBus';
import { colors, radius, space } from '@/lib/theme';
import { useFocusLoad } from '@/lib/useFocusLoad';

const FILTERS: (MuscleGroup | 'all')[] = [
  'all',
  'chest',
  'upper_back',
  'lower_back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'cardio',
];

export default function ExercisePicker() {
  const { target, workoutId } = useLocalSearchParams<{ target: 'workout' | 'routine'; workoutId?: string }>();
  const { data: exercises, db } = useFocusLoad(listExercises);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [busy, setBusy] = useState(false);

  if (!exercises) return <Loading />;

  const filtered = exercises.filter(
    (e) => matchesSearch(e, query) && (muscle === 'all' || e.muscle === muscle || (muscle === 'upper_back' && e.muscle === 'traps')),
  );

  const pick = async (exerciseId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      if (target === 'workout' && workoutId) {
        await addExerciseToWorkout(db, workoutId, exerciseId, 3);
      } else {
        setRoutinePick(exerciseId);
      }
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Traži (engleski ili hrvatski)…"
          placeholderTextColor={colors.textFaint}
          autoCorrect={false}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {FILTERS.map((f) => (
            <Chip key={f} label={f === 'all' ? 'Sve' : MUSCLE_LABELS[f]} active={muscle === f} onPress={() => setMuscle(f)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, gap: space.sm }}
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]} onPress={() => pick(item.id)}>
            <T style={{ fontWeight: '700' }}>{item.nameEn}</T>
            <T variant="small">{item.nameHr}</T>
            <T variant="small" style={{ color: colors.textFaint }}>
              {MUSCLE_LABELS[item.muscle]} · {EQUIPMENT_LABELS[item.equipment]}
              {item.isCustom ? ' · vlastita' : ''}
            </T>
          </Pressable>
        )}
        ListEmptyComponent={<T variant="dim">Nema vježbi za ovu pretragu.</T>}
        ListFooterComponent={
          <Button
            kind="secondary"
            title="+ Nova vlastita vježba"
            style={{ marginTop: space.md }}
            onPress={() => router.push('/exercise-new')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { padding: space.lg, paddingBottom: space.sm, gap: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  search: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    minHeight: 48,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
});
