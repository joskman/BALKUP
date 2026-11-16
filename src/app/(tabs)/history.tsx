import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Button, Card, Loading, Row, Screen, T } from '@/components/ui';
import { listFinishedWorkouts } from '@/db/repo';
import { formatDate, formatDuration, formatTime } from '@/domain/format';
import { colors } from '@/lib/theme';
import { useFocusLoad } from '@/lib/useFocusLoad';

export default function HistoryScreen() {
  const { data } = useFocusLoad(listFinishedWorkouts);
  if (!data) return <Loading />;

  return (
    <Screen>
      <T variant="title">Povijest</T>
      <Button kind="secondary" title="+ Dodaj prošli trening (bez XP-a)" onPress={() => router.push('/backfill')} />

      {data.length === 0 && (
        <Card>
          <T variant="heading">Još nema treninga</T>
          <T variant="dim">Tvoj prvi završeni trening pojavit će se ovdje.</T>
        </Card>
      )}

      {data.map((w) => (
        <Pressable key={w.id} onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="heading">{formatDate(w.startedAt)}</T>
              {w.motivation != null && <T style={{ color: colors.xp, fontWeight: '700' }}>Motivacija {w.motivation}/5</T>}
            </Row>
            <T variant="dim">
              {formatTime(w.startedAt)} · {formatDuration(w.endedAt - w.startedAt)} · {w.exerciseCount} vježbi · {w.setCount} serija
            </T>
            {w.isBackfilled && <T variant="small">Naknadni unos, bez XP-a</T>}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
