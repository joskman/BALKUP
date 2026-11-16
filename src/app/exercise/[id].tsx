import { useLocalSearchParams } from 'expo-router';

import { Card, Loading, Screen, T } from '@/components/ui';
import { exerciseHistory, getExercise } from '@/db/repo';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/domain/exercises';
import { formatDate } from '@/domain/format';
import { formatSetValues } from '@/domain/prefill';
import { colors } from '@/lib/theme';
import { useFocusLoad } from '@/lib/useFocusLoad';

export default function ExerciseHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useFocusLoad(async (db) => {
    const [exercise, history] = await Promise.all([getExercise(db, id), exerciseHistory(db, id)]);
    return { exercise, history };
  });

  if (!data) return <Loading />;
  const { exercise, history } = data;
  if (!exercise) {
    return (
      <Screen edges={['bottom']}>
        <T variant="dim">Vježba nije pronađena.</T>
      </Screen>
    );
  }

  const maxWeight = Math.max(0, ...history.flatMap((h) => h.sets.map((s) => s.weightKg ?? 0)));
  const maxReps = Math.max(0, ...history.flatMap((h) => h.sets.map((s) => s.reps ?? 0)));

  return (
    <Screen edges={['bottom']}>
      <T variant="title">{exercise.nameEn}</T>
      <T variant="dim">{exercise.nameHr}</T>
      <T variant="small">
        {MUSCLE_LABELS[exercise.muscle]} · {EQUIPMENT_LABELS[exercise.equipment]}
      </T>

      {history.length > 0 && (
        <Card>
          <T variant="label">Osobni rekordi</T>
          {exercise.logType === 'weight_reps' && <T variant="heading">Najveća težina: {String(maxWeight).replace('.', ',')} kg</T>}
          {(exercise.logType === 'weight_reps' || exercise.logType === 'reps') && (
            <T variant="dim">Najviše ponavljanja u seriji: {maxReps}</T>
          )}
          <T variant="small" style={{ color: colors.textFaint }}>
            Treninga s ovom vježbom: {history.length}
          </T>
        </Card>
      )}

      {history.length === 0 && <T variant="dim">Još nisi radio ovu vježbu.</T>}

      {history.map((h) => (
        <Card key={h.workoutId}>
          <T variant="heading">{formatDate(h.startedAt)}</T>
          {h.sets.map((s, i) => (
            <T key={i} variant="dim">
              {i + 1}. {formatSetValues(s, exercise.logType)}
            </T>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
