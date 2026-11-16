import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RestState } from '@/components/RestTimer';
import { RestTimerBar } from '@/components/RestTimer';
import { Button, Card, Loading, Row, T } from '@/components/ui';
import { autoFinishIfStale, finishAndRecompute } from '@/db/progress';
import type { ExerciseWithRest, WorkoutDetail } from '@/db/repo';
import {
  addSet,
  deleteSet,
  deleteWorkout,
  getSettings,
  getWeekGoals,
  lastSetsForExercise,
  listExercises,
  loadAllWorkouts,
  loadWorkout,
  removeWorkoutExercise,
  setConfirmed,
  setExerciseCompleted,
  setExerciseRest,
  updateSetValues,
} from '@/db/repo';
import { formatDuration, formatTime } from '@/domain/format';
import type { SetValues } from '@/domain/prefill';
import { formatSetValues, parseNumber, prefillValues, validateValues } from '@/domain/prefill';
import type { LogType, SetEntry, WorkoutExerciseEntry } from '@/domain/types';
import { replayHistory, xpForExercise } from '@/domain/xp';
import { cancelRestEnd, scheduleRestEnd } from '@/lib/notifications';
import { colors, radius, space } from '@/lib/theme';

interface Draft {
  a: string; // kg | ponavljanja | sekunde | minute
  b: string; // ponavljanja | — | — | km
}

function toDraft(v: SetValues, logType: LogType): Draft {
  const n = (x: number | null) => (x == null ? '' : String(x).replace('.', ','));
  switch (logType) {
    case 'weight_reps':
      return { a: n(v.weightKg), b: n(v.reps) };
    case 'reps':
      return { a: n(v.reps), b: '' };
    case 'time':
      return { a: n(v.durationSec), b: '' };
    case 'cardio':
      return { a: v.durationSec == null ? '' : n(Math.round((v.durationSec / 60) * 10) / 10), b: n(v.distanceKm) };
  }
}

function fromDraft(d: Draft, logType: LogType): SetValues {
  const a = parseNumber(d.a);
  const b = parseNumber(d.b);
  switch (logType) {
    case 'weight_reps':
      return { weightKg: a, reps: b, durationSec: null, distanceKm: null };
    case 'reps':
      return { weightKg: null, reps: a, durationSec: null, distanceKm: null };
    case 'time':
      return { weightKg: null, reps: null, durationSec: a == null ? null : Math.round(a), distanceKm: null };
    case 'cardio':
      return { weightKg: null, reps: null, durationSec: a == null ? null : Math.round(a * 60), distanceKm: b };
  }
}

const valuesOf = (s: SetEntry): SetValues => ({
  weightKg: s.weightKg,
  reps: s.reps,
  durationSec: s.durationSec,
  distanceKm: s.distanceKm,
});

export default function ActiveWorkoutScreen() {
  const { id, dur } = useLocalSearchParams<{ id: string; dur?: string }>();
  const db = useSQLiteContext();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [exMap, setExMap] = useState<Map<string, ExerciseWithRest>>(new Map());
  const [lastSets, setLastSets] = useState<Map<string, SetValues[]>>(new Map());
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [rest, setRest] = useState<RestState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const restNotification = useRef<string | null>(null);
  const touched = useRef(new Set<string>());
  const defaultRest = useRef(90);
  const finishing = useRef(false);

  const isBackfill = workout?.isBackfilled ?? false;

  const load = useCallback(async () => {
    const [w, exercises, settings] = await Promise.all([loadWorkout(db, id), listExercises(db), getSettings(db)]);
    defaultRest.current = settings.defaultRestSec;
    if (!w) return;
    if (w.endedAt != null) {
      router.replace({ pathname: '/workout/[id]', params: { id: w.id } });
      return;
    }
    const map = new Map(exercises.map((e) => [e.id, e]));
    const last = new Map<string, SetValues[]>();
    for (const we of w.exercises) {
      if (!last.has(we.exerciseId)) last.set(we.exerciseId, await lastSetsForExercise(db, we.exerciseId, w.id));
    }
    setExMap(map);
    setLastSets(last);
    setWorkout(w);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const we of w.exercises) {
        const ex = map.get(we.exerciseId);
        if (!ex) continue;
        for (const s of we.sets) if (!(s.id in next)) next[s.id] = toDraft(valuesOf(s), ex.logType);
      }
      return next;
    });
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  // Sat treninga i provjera „zaboravljenog“ treninga svake minute.
  useEffect(() => {
    const t = setInterval(async () => {
      setNow(Date.now());
      if (isBackfill || finishing.current) return;
      const finished = await autoFinishIfStale(db).catch(() => null);
      if (finished === id) {
        await cancelRestEnd(restNotification.current);
        router.replace({ pathname: '/workout/[id]', params: { id, summary: '1' } });
      }
    }, 30000);
    return () => clearInterval(t);
  }, [db, id, isBackfill]);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2600);
  };

  /** Procjena XP-a za jednu vježbu: reproducira povijest kao da trening sada završava. */
  const exerciseXp = async (exerciseId: string): Promise<number> => {
    const [all, settings, goals] = await Promise.all([loadAllWorkouts(db), getSettings(db), getWeekGoals(db)]);
    const nowTs = Date.now();
    const patched = all.map((w) => (w.id === id ? { ...w, endedAt: nowTs } : w));
    const replay = replayHistory(patched, exMap, (wk) => goals.get(wk) ?? settings.weeklyGoal);
    return xpForExercise(replay.events, id, exerciseId, exMap.get(exerciseId)?.logType === 'cardio');
  };

  const announceCompleted = async (we: WorkoutExerciseEntry) => {
    if (isBackfill) return;
    const ex = exMap.get(we.exerciseId);
    const xp = await exerciseXp(we.exerciseId);
    showToast(`${ex?.nameEn ?? 'Vježba'} završena · +${xp} XP`);
  };

  const stopRest = async () => {
    await cancelRestEnd(restNotification.current);
    restNotification.current = null;
    setRest(null);
  };

  const startRest = async (ex: ExerciseWithRest) => {
    await cancelRestEnd(restNotification.current);
    const totalSec = ex.restSec ?? defaultRest.current;
    restNotification.current = await scheduleRestEnd(totalSec, ex.nameEn);
    setRest({ endsAt: Date.now() + totalSec * 1000, totalSec, exerciseName: ex.nameEn, exerciseId: ex.id });
  };

  const adjustRest = async (delta: number) => {
    if (!rest) return;
    const { exerciseId } = rest;
    const endsAt = Math.max(Date.now() + 1000, rest.endsAt + delta * 1000);
    const totalSec = Math.max(15, rest.totalSec + delta);
    await cancelRestEnd(restNotification.current);
    restNotification.current = await scheduleRestEnd((endsAt - Date.now()) / 1000, rest.exerciseName);
    setRest({ ...rest, endsAt, totalSec });
    // Aplikacija pamti odabrano trajanje pauze za ovu vježbu.
    await setExerciseRest(db, exerciseId, totalSec);
    setExMap((m) => {
      const next = new Map(m);
      const ex = next.get(exerciseId);
      if (ex) next.set(exerciseId, { ...ex, restSec: totalSec });
      return next;
    });
  };

  const onChangeDraft = (set: SetEntry, logType: LogType, patch: Partial<Draft>) => {
    touched.current.add(set.id);
    const next = { ...(drafts[set.id] ?? { a: '', b: '' }), ...patch };
    setDrafts((d) => ({ ...d, [set.id]: next }));
    updateSetValues(db, set.id, fromDraft(next, logType)).catch(() => {});
  };

  const confirmSet = async (we: WorkoutExerciseEntry, set: SetEntry) => {
    const ex = exMap.get(we.exerciseId);
    if (!ex || !workout) return;
    const values = fromDraft(drafts[set.id] ?? { a: '', b: '' }, ex.logType);
    const error = validateValues(values, ex.logType);
    if (error) {
      Alert.alert('Provjeri seriju', error);
      return;
    }
    const at = Date.now();
    await updateSetValues(db, set.id, values);
    await setConfirmed(db, set.id, at);

    // Potvrda serije druge vježbe završava prethodnu vježbu (sigurnosna mreža).
    for (const other of workout.exercises) {
      if (other.id === we.id || other.completedAt != null) continue;
      if (other.sets.some((s) => s.confirmedAt != null)) {
        await setExerciseCompleted(db, other.id, at);
        announceCompleted(other).catch(() => {});
      }
    }
    if (we.completedAt != null) await setExerciseCompleted(db, we.id, null);

    // Sljedeća nepotvrđena serija preuzima vrijednosti ove serije (ako je korisnik nije mijenjao).
    const idx = we.sets.findIndex((s) => s.id === set.id);
    const next = we.sets.slice(idx + 1).find((s) => s.confirmedAt == null);
    if (next && !touched.current.has(next.id)) {
      await updateSetValues(db, next.id, values);
      setDrafts((d) => ({ ...d, [next.id]: toDraft(values, ex.logType) }));
    }

    if (!isBackfill) await startRest(ex);
    await load();
  };

  const unconfirmSet = async (set: SetEntry) => {
    await setConfirmed(db, set.id, null);
    await load();
  };

  const addSetTo = async (we: WorkoutExerciseEntry) => {
    const ex = exMap.get(we.exerciseId);
    if (!ex) return;
    const lastInWorkout = we.sets[we.sets.length - 1];
    const prevValues = lastInWorkout ? fromDraft(drafts[lastInWorkout.id] ?? toDraft(valuesOf(lastInWorkout), ex.logType), ex.logType) : null;
    const values = prefillValues(we.sets.length, prevValues, lastSets.get(we.exerciseId) ?? []);
    const setId = await addSet(db, we.id, values);
    setDrafts((d) => ({ ...d, [setId]: toDraft(values, ex.logType) }));
    if (we.completedAt != null) await setExerciseCompleted(db, we.id, null);
    await load();
  };

  const removeSet = async (set: SetEntry) => {
    await deleteSet(db, set.id);
    await load();
  };

  const completeExercise = async (we: WorkoutExerciseEntry) => {
    await setExerciseCompleted(db, we.id, Date.now());
    await announceCompleted(we);
    await load();
  };

  const exerciseMenu = (we: WorkoutExerciseEntry) => {
    const ex = exMap.get(we.exerciseId);
    Alert.alert(ex?.nameEn ?? 'Vježba', undefined, [
      { text: 'Povijest vježbe', onPress: () => router.push({ pathname: '/exercise/[id]', params: { id: we.exerciseId } }) },
      {
        text: 'Ukloni iz treninga',
        style: 'destructive',
        onPress: async () => {
          await removeWorkoutExercise(db, we.id);
          await load();
        },
      },
      { text: 'Zatvori', style: 'cancel' },
    ]);
  };

  const finish = async () => {
    if (!workout) return;
    const confirmed = workout.exercises.flatMap((e) => e.sets).filter((s) => s.confirmedAt != null);
    if (confirmed.length === 0) {
      Alert.alert('Nema potvrđenih serija', 'Potvrdi barem jednu seriju ili odbaci trening.');
      return;
    }
    const endedAt = isBackfill ? workout.startedAt + Math.max(1, Number(dur ?? '60')) * 60000 : Date.now();
    const doFinish = async () => {
      finishing.current = true;
      await stopRest();
      const r = await finishAndRecompute(db, workout.id, endedAt);
      router.replace({
        pathname: '/workout/[id]',
        params: {
          id: workout.id,
          summary: '1',
          lvlFrom: String(r.levelBefore),
          lvlTo: String(r.levelAfter),
          unlocked: r.newlyUnlocked.map((i) => i.id).join(','),
        },
      });
    };
    const unconfirmed = workout.exercises.flatMap((e) => e.sets).length - confirmed.length;
    Alert.alert(
      isBackfill ? 'Spremi trening' : 'Završi trening',
      unconfirmed > 0 ? `${unconfirmed} nepotvrđenih serija neće se spremiti.` : 'Sve potvrđene serije bit će spremljene.',
      [
        { text: 'Odustani', style: 'cancel' },
        { text: isBackfill ? 'Spremi' : 'Završi', onPress: () => doFinish().catch(() => (finishing.current = false)) },
      ],
    );
  };

  const discard = () => {
    Alert.alert('Odbaci trening?', 'Sve serije ovog treninga bit će obrisane.', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Odbaci',
        style: 'destructive',
        onPress: async () => {
          await stopRest();
          await deleteWorkout(db, id);
          router.back();
        },
      },
    ]);
  };

  if (!workout) return <Loading />;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: isBackfill ? 'Naknadni unos' : 'Trening',
          headerRight: () => <Button small kind="ghost" title="Odbaci" onPress={discard} />,
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="dim">
              {isBackfill
                ? 'Bez XP-a · samo za povijest i statistiku'
                : `Započet ${formatTime(workout.startedAt)} · ${formatDuration(now - workout.startedAt)}`}
            </T>
          </Row>

          {workout.exercises.length === 0 && (
            <Card>
              <T variant="heading">Prazan trening</T>
              <T variant="dim">Dodaj prvu vježbu i kreni.</T>
            </Card>
          )}

          {workout.exercises.map((we) => {
            const ex = exMap.get(we.exerciseId);
            if (!ex) return null;
            const last = lastSets.get(we.exerciseId) ?? [];
            const hasConfirmed = we.sets.some((s) => s.confirmedAt != null);
            return (
              <Card key={we.id} style={we.completedAt ? { borderColor: colors.success } : undefined}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <T variant="heading">{ex.nameEn}</T>
                    <T variant="small">{ex.nameHr}</T>
                  </View>
                  {we.completedAt && <T style={{ color: colors.success, fontWeight: '700' }}>✓ Završeno</T>}
                  <Pressable onPress={() => exerciseMenu(we)} hitSlop={12} style={{ paddingLeft: space.sm }}>
                    <T style={{ fontSize: 22, color: colors.textDim }}>⋯</T>
                  </Pressable>
                </Row>
                <T variant="small" style={{ color: colors.textFaint }}>
                  {last.length > 0
                    ? `Prošli put: ${last.map((v) => formatSetValues(v, ex.logType)).join(' · ')}`
                    : 'Prvi put radiš ovu vježbu.'}
                </T>

                <SetHeader logType={ex.logType} />
                {we.sets.map((s, i) => (
                  <SetRow
                    key={s.id}
                    index={i}
                    set={s}
                    logType={ex.logType}
                    draft={drafts[s.id] ?? toDraft(valuesOf(s), ex.logType)}
                    onChange={(patch) => onChangeDraft(s, ex.logType, patch)}
                    onConfirm={() => confirmSet(we, s)}
                    onUnconfirm={() => unconfirmSet(s)}
                    onDelete={() => removeSet(s)}
                  />
                ))}

                <Row style={{ marginTop: space.xs }}>
                  <Button small kind="secondary" title="+ Serija" style={{ flex: 1 }} onPress={() => addSetTo(we)} />
                  {hasConfirmed && !we.completedAt && (
                    <Button small title="Završi vježbu" style={{ flex: 1 }} onPress={() => completeExercise(we)} />
                  )}
                </Row>
              </Card>
            );
          })}

          <Button
            kind="secondary"
            title="+ Dodaj vježbu"
            onPress={() => router.push({ pathname: '/exercise-picker', params: { target: 'workout', workoutId: workout.id } })}
          />
        </ScrollView>

        {rest && !isBackfill ? (
          <RestTimerBar rest={rest} onAdjust={adjustRest} onSkip={stopRest} onDone={() => setRest(null)} />
        ) : (
          <View style={styles.footer}>
            <Button title={isBackfill ? 'Spremi trening' : 'Završi trening'} onPress={finish} />
          </View>
        )}
      </KeyboardAvoidingView>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <T style={{ color: colors.bg, fontWeight: '800' }}>{toast}</T>
        </View>
      )}
    </SafeAreaView>
  );
}

function SetHeader({ logType }: { logType: LogType }) {
  const labels: Record<LogType, [string, string | null]> = {
    weight_reps: ['kg', 'pon.'],
    reps: ['pon.', null],
    time: ['sekunde', null],
    cardio: ['minute', 'km (opc.)'],
  };
  const [a, b] = labels[logType];
  return (
    <Row style={{ marginTop: space.xs }}>
      <T variant="label" style={{ width: 28 }}>
        #
      </T>
      <T variant="label" style={{ flex: 1 }}>
        {a}
      </T>
      {b && (
        <T variant="label" style={{ flex: 1 }}>
          {b}
        </T>
      )}
      <View style={{ width: 84 }} />
    </Row>
  );
}

function SetRow({
  index,
  set,
  logType,
  draft,
  onChange,
  onConfirm,
  onUnconfirm,
  onDelete,
}: {
  index: number;
  set: SetEntry;
  logType: LogType;
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onDelete: () => void;
}) {
  const confirmed = set.confirmedAt != null;
  const twoFields = logType === 'weight_reps' || logType === 'cardio';
  const decimalA = logType === 'weight_reps' || logType === 'cardio';
  return (
    <Row style={[styles.setRow, confirmed && styles.setRowDone]}>
      <T style={{ width: 28, color: colors.textDim, fontWeight: '700' }}>{index + 1}</T>
      <TextInput
        style={[styles.input, confirmed && styles.inputDone]}
        value={draft.a}
        editable={!confirmed}
        keyboardType={decimalA ? 'decimal-pad' : 'number-pad'}
        selectTextOnFocus
        onChangeText={(t) => onChange({ a: t })}
        placeholder="0"
        placeholderTextColor={colors.textFaint}
      />
      {twoFields && (
        <TextInput
          style={[styles.input, confirmed && styles.inputDone]}
          value={draft.b}
          editable={!confirmed}
          keyboardType={logType === 'cardio' ? 'decimal-pad' : 'number-pad'}
          selectTextOnFocus
          onChangeText={(t) => onChange({ b: t })}
          placeholder={logType === 'cardio' ? '—' : '0'}
          placeholderTextColor={colors.textFaint}
        />
      )}
      {!confirmed && (
        <Pressable onPress={onDelete} hitSlop={8} style={styles.iconBtn} accessibilityLabel="Obriši seriju">
          <T style={{ color: colors.textFaint, fontSize: 16 }}>✕</T>
        </Pressable>
      )}
      <Pressable
        onPress={confirmed ? onUnconfirm : onConfirm}
        style={[styles.check, confirmed && styles.checkDone]}
        accessibilityLabel={confirmed ? 'Poništi potvrdu serije' : 'Potvrdi seriju'}>
        <T style={{ color: confirmed ? colors.bg : colors.textDim, fontSize: 20, fontWeight: '900' }}>✓</T>
      </Pressable>
    </Row>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  footer: { padding: space.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  setRow: { paddingVertical: 4, borderRadius: radius.sm },
  setRowDone: { backgroundColor: '#15301F' },
  input: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.cardHigh,
    color: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputDone: { backgroundColor: 'transparent', color: colors.success },
  iconBtn: { width: 28, alignItems: 'center' },
  check: {
    width: 48,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.success },
  toast: {
    position: 'absolute',
    top: space.lg,
    alignSelf: 'center',
    backgroundColor: colors.xp,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
  },
});
