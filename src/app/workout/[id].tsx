import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Loading, Row, Screen, T } from '@/components/ui';
import { computeProgress } from '@/db/progress';
import { deleteWorkout, listExercises, loadWorkout, setWorkoutFeedback } from '@/db/repo';
import { formatDate, formatDuration, formatTime } from '@/domain/format';
import { itemById, RARITY_LABELS } from '@/domain/items';
import { formatSetValues } from '@/domain/prefill';
import type { XpSource } from '@/domain/types';
import { NOTE_TEXT } from '@/domain/xp';
import { colors, rarityColors, radius, space } from '@/lib/theme';
import { useFocusLoad } from '@/lib/useFocusLoad';

const SOURCE_LABELS: Record<XpSource, string> = {
  set: 'Serije',
  cardio: 'Kardio',
  completion: 'Završen trening',
  improvement: 'Bolje nego prošli put',
  pr: 'Osobni rekord',
  challenge: 'Tjedni izazov',
  weekly_goal: 'Tjedni cilj',
};

export default function WorkoutDetailScreen() {
  const params = useLocalSearchParams<{ id: string; summary?: string; lvlFrom?: string; lvlTo?: string; unlocked?: string }>();
  const isSummary = params.summary === '1';
  const { data, db } = useFocusLoad(async (db) => {
    const [workout, exercises, progress] = await Promise.all([loadWorkout(db, params.id), listExercises(db), computeProgress(db)]);
    return { workout, exMap: new Map(exercises.map((e) => [e.id, e])), progress };
  });
  const [motivation, setMotivation] = useState<number | null | undefined>(undefined);
  const [note, setNote] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  if (!data) return <Loading />;
  const { workout, exMap, progress } = data;
  if (!workout || workout.endedAt == null) {
    return (
      <Screen>
        <T variant="dim">Trening nije pronađen.</T>
      </Screen>
    );
  }

  const events = progress.replay.events.filter((e) => e.workoutId === workout.id);
  const notes = progress.replay.notes.filter((n) => n.workoutId === workout.id);
  const totalXp = events.reduce((s, e) => s + e.amount, 0);
  const sets = workout.exercises.flatMap((e) => e.sets).filter((s) => s.confirmedAt != null);
  const volume = sets.reduce((s, x) => s + (x.weightKg ?? 0) * (x.reps ?? 0), 0);
  const lvlFrom = Number(params.lvlFrom ?? 0);
  const lvlTo = Number(params.lvlTo ?? 0);
  const unlocked = (params.unlocked ?? '').split(',').map(itemById).filter((i) => i != null);

  const currentMotivation = motivation === undefined ? workout.motivation : motivation;
  const currentNote = note === undefined ? (workout.note ?? '') : note;

  const saveFeedback = async (m: number | null, n: string) => {
    await setWorkoutFeedback(db, workout.id, m, n.trim() || null);
    setSaved(true);
  };

  const remove = () => {
    Alert.alert('Obriši trening?', 'Trening i XP koji je donio bit će uklonjeni. Otključani predmeti ostaju.', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Obriši',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(db, workout.id);
          await computeProgress(db, { persist: true });
          router.back();
        },
      },
    ]);
  };

  // Grupiraj XP po izvoru.
  const bySource = new Map<XpSource, { amount: number; details: string[] }>();
  for (const e of events) {
    const g = bySource.get(e.source) ?? { amount: 0, details: [] };
    g.amount += e.amount;
    if ((e.source === 'improvement' || e.source === 'pr') && e.exerciseId) {
      g.details.push(exMap.get(e.exerciseId)?.nameEn ?? '');
    }
    bySource.set(e.source, g);
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: isSummary ? 'Sažetak treninga' : 'Trening' }} />

      {isSummary && (
        <Card style={{ borderColor: colors.xp, alignItems: 'center' }}>
          <T variant="label">{workout.isBackfilled ? 'Trening spremljen' : 'Trening završen'}</T>
          <T style={styles.bigXp}>{workout.isBackfilled ? 'Bez XP-a' : `+${totalXp} XP`}</T>
          {lvlTo > lvlFrom && (
            <T variant="heading" style={{ color: colors.xp }}>
              ⬆ LEVEL UP! {lvlFrom} → {lvlTo}
            </T>
          )}
        </Card>
      )}

      {isSummary &&
        unlocked.map((item) => (
          <Card key={item.id} style={{ borderColor: rarityColors[item.rarity] }}>
            <T variant="label">Novi predmet otključan</T>
            <T variant="heading" style={{ color: rarityColors[item.rarity] }}>
              {item.name}
            </T>
            <T variant="dim">{RARITY_LABELS[item.rarity]}</T>
            <Button small kind="secondary" title="Opremi lika" onPress={() => router.push('/character')} />
          </Card>
        ))}

      <Card>
        <T variant="heading">{formatDate(workout.startedAt)}</T>
        <T variant="dim">
          {formatTime(workout.startedAt)} – {formatTime(workout.endedAt)} · {formatDuration(workout.endedAt - workout.startedAt)}
        </T>
        <T variant="dim">
          {workout.exercises.length} vježbi · {sets.length} serija{volume > 0 ? ` · ${Math.round(volume)} kg volumena` : ''}
        </T>
        {workout.isBackfilled && <T variant="small">Naknadni unos: računa se u povijest i tjedni niz, bez XP-a.</T>}
      </Card>

      {!workout.isBackfilled && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="heading">XP iz ovog treninga</T>
            <T variant="heading" style={{ color: colors.xp }}>
              {totalXp}
            </T>
          </Row>
          {[...bySource.entries()].map(([source, g]) => (
            <Row key={source} style={{ justifyContent: 'space-between' }}>
              <T variant="dim" style={{ flex: 1 }}>
                {SOURCE_LABELS[source]}
                {g.details.length > 0 ? ` (${g.details.join(', ')})` : ''}
              </T>
              <T style={{ fontWeight: '700' }}>+{g.amount}</T>
            </Row>
          ))}
          {notes.map((n, i) => (
            <T key={i} variant="small" style={{ color: colors.warning }}>
              ⓘ {NOTE_TEXT[n.reason](n.count)}
            </T>
          ))}
          <T variant="small" style={{ color: colors.textFaint }}>
            Tjedni cilj i izazovi prikazani su na početnom ekranu.
          </T>
        </Card>
      )}

      <Card>
        <T variant="heading">Koliko te ovaj trening motivirao?</T>
        <Row style={{ justifyContent: 'space-between' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                setMotivation(n);
                saveFeedback(n, currentNote);
              }}
              style={[styles.rating, currentMotivation === n && styles.ratingActive]}>
              <T style={{ fontSize: 20, fontWeight: '800' }}>{n}</T>
            </Pressable>
          ))}
        </Row>
        <T variant="small">1 = nimalo · 5 = jako. Pomaže provjeri hipoteze H1.</T>
        <TextInput
          style={styles.note}
          value={currentNote}
          onChangeText={(t) => {
            setNote(t);
            setSaved(false);
          }}
          onEndEditing={() => saveFeedback(currentMotivation ?? null, currentNote)}
          placeholder="Kratka bilješka (što je motiviralo ili smetalo)…"
          placeholderTextColor={colors.textFaint}
          multiline
        />
        {saved && <T variant="small" style={{ color: colors.success }}>Spremljeno.</T>}
      </Card>

      {workout.exercises.map((we) => {
        const ex = exMap.get(we.exerciseId);
        if (!ex) return null;
        return (
          <Pressable key={we.id} onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: ex.id } })}>
            <Card>
              <T variant="heading">{ex.nameEn}</T>
              {we.sets
                .filter((s) => s.confirmedAt != null)
                .map((s, i) => (
                  <T key={s.id} variant="dim">
                    {i + 1}. {formatSetValues(s, ex.logType)}
                  </T>
                ))}
            </Card>
          </Pressable>
        );
      })}

      {isSummary ? (
        <Button
          title="Gotovo"
          onPress={() => {
            saveFeedback(currentMotivation ?? null, currentNote).then(() => router.back());
          }}
        />
      ) : (
        <Button kind="ghost" title="Obriši trening" onPress={remove} />
      )}
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigXp: { fontSize: 44, fontWeight: '900', color: colors.xp },
  rating: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingActive: { backgroundColor: colors.accent },
  note: {
    minHeight: 64,
    backgroundColor: colors.cardHigh,
    color: colors.text,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
