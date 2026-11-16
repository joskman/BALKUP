import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar, equippedMap } from '@/components/Avatar';
import { Button, Card, Loading, ProgressBar, Row, Screen, T } from '@/components/ui';
import { computeProgress, finishAndRecompute } from '@/db/progress';
import { deleteWorkout, getActiveWorkout, startWorkout } from '@/db/repo';
import { formatTime } from '@/domain/format';
import { CHALLENGES, challengeProgress } from '@/domain/xp';
import { colors, space } from '@/lib/theme';
import { useFocusLoad } from '@/lib/useFocusLoad';

export default function HomeScreen() {
  const { data, reload, db } = useFocusLoad(async (db) => {
    const [progress, active] = await Promise.all([computeProgress(db), getActiveWorkout(db)]);
    return { progress, active };
  });

  if (!data) return <Loading />;
  const { progress, active } = data;
  const { level, currentWeek, weeklyGoal, streak } = progress;
  const weekDone = currentWeek?.allCount ?? 0;

  const startEmpty = async () => {
    if (active) return router.push({ pathname: '/workout/active', params: { id: active.id } });
    const id = await startWorkout(db);
    router.push({ pathname: '/workout/active', params: { id } });
  };

  const finishActive = () => {
    if (!active) return;
    if (active.lastSetAt == null) {
      Alert.alert('Trening nema potvrđenih serija', 'Bez serija nema se što spremiti. Odbaciti ga?', [
        { text: 'Odustani', style: 'cancel' },
        { text: 'Odbaci', style: 'destructive', onPress: () => deleteWorkout(db, active.id).then(reload) },
      ]);
      return;
    }
    Alert.alert('Završi trening', `Trening će se završiti u ${formatTime(active.lastSetAt)}, u trenutku zadnje serije.`, [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Završi',
        onPress: async () => {
          const r = await finishAndRecompute(db, active.id, active.lastSetAt as number);
          router.push({
            pathname: '/workout/[id]',
            params: { id: r.workoutId, summary: '1', lvlFrom: String(r.levelBefore), lvlTo: String(r.levelAfter), unlocked: r.newlyUnlocked.map((i) => i.id).join(',') },
          });
        },
      },
    ]);
  };

  const discardActive = () => {
    if (!active) return;
    Alert.alert('Odbaci trening?', 'Sve serije ovog treninga bit će obrisane.', [
      { text: 'Odustani', style: 'cancel' },
      { text: 'Odbaci', style: 'destructive', onPress: () => deleteWorkout(db, active.id).then(reload) },
    ]);
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="title">BALKUP</T>
        <T variant="label">Train. Level up. Repeat.</T>
      </Row>

      {active && (
        <Card style={{ borderColor: colors.accent }}>
          <T variant="heading">Imaš nedovršen trening</T>
          <T variant="dim">Započet u {formatTime(active.startedAt)}.</T>
          <Row>
            <Button title="Nastavi" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/workout/active', params: { id: active.id } })} />
            <Button title="Završi" kind="secondary" style={{ flex: 1 }} onPress={finishActive} />
            <Button title="Odbaci" kind="ghost" onPress={discardActive} />
          </Row>
        </Card>
      )}

      <Card style={styles.heroCard}>
        <Avatar size={150} equipped={equippedMap(progress.inventory)} />
        <View style={{ flex: 1, gap: space.sm }}>
          <T variant="label">Level</T>
          <T style={styles.level}>{level.level}</T>
          <ProgressBar value={level.xpIntoLevel / level.xpForNext} color={colors.xp} />
          <T variant="small">
            {level.xpIntoLevel} / {level.xpForNext} XP do levela {level.level + 1}
          </T>
          <T variant="small">Ukupno: {progress.totalXp} XP</T>
        </View>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="heading">Tjedni cilj</T>
          <T variant="heading" style={{ color: weekDone >= weeklyGoal ? colors.success : colors.text }}>
            {weekDone}/{weeklyGoal}
          </T>
        </Row>
        <ProgressBar value={weekDone / weeklyGoal} color={weekDone >= weeklyGoal ? colors.success : colors.accent} />
        <T variant="dim">
          {streak > 0 ? `🔥 Niz: ${streak} ${streak === 1 ? 'tjedan' : 'tjedna'} zaredom` : 'Ispuni tjedni cilj i započni niz.'}
        </T>
        <T variant="small">Bonus za ispunjen cilj: +200 XP (samo treninzi uživo). Odmor nikad ne prekida niz.</T>
      </Card>

      <Card>
        <T variant="heading">Tjedni izazovi</T>
        {CHALLENGES.map((c) => {
          const value = challengeProgress(currentWeek, c.id);
          const done = value >= c.target;
          const label = c.unit === 'seconds' ? `${Math.floor(value / 60)}/${c.target / 60} min` : `${Math.min(value, c.target)}/${c.target}`;
          return (
            <View key={c.id} style={{ gap: 4, marginTop: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T style={{ flex: 1, color: done ? colors.success : colors.text }}>
                  {done ? '✓ ' : ''}
                  {c.title}
                </T>
                <T variant="small">{label}</T>
              </Row>
              <ProgressBar value={value / c.target} height={4} color={done ? colors.success : colors.accent} />
            </View>
          );
        })}
        <T variant="small">Svaki ispunjen izazov: +75 XP.</T>
      </Card>

      <Button title={active ? 'Nastavi trening' : 'Započni prazan trening'} onPress={startEmpty} />
      <Button title="Pokreni rutinu" kind="secondary" onPress={() => router.push('/routines')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  level: { fontSize: 48, fontWeight: '900', color: colors.text, lineHeight: 52 },
});
