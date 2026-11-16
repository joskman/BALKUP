import { router } from 'expo-router';
import { Alert } from 'react-native';

import { Button, Card, Loading, Row, Screen, T } from '@/components/ui';
import { getActiveWorkout, listRoutines, startWorkout } from '@/db/repo';
import { useFocusLoad } from '@/lib/useFocusLoad';

export default function RoutinesScreen() {
  const { data, db } = useFocusLoad(async (db) => {
    const [routines, active] = await Promise.all([listRoutines(db), getActiveWorkout(db)]);
    return { routines, active };
  });

  if (!data) return <Loading />;
  const { routines, active } = data;

  const start = async (routineId: string) => {
    if (active) {
      Alert.alert('Već imaš aktivan trening', 'Završi ili odbaci aktivni trening prije nego što pokreneš novi.', [
        { text: 'Zatvori', style: 'cancel' },
        { text: 'Nastavi aktivni', onPress: () => router.push({ pathname: '/workout/active', params: { id: active.id } }) },
      ]);
      return;
    }
    const id = await startWorkout(db, { routineId });
    router.push({ pathname: '/workout/active', params: { id } });
  };

  return (
    <Screen>
      <T variant="title">Rutine</T>
      <T variant="dim">Spremi treninge koje ponavljaš i pokreni ih jednim dodirom.</T>

      {routines.length === 0 && (
        <Card>
          <T variant="heading">Još nemaš rutina</T>
          <T variant="dim">Npr. „Push dan“, „Noge“ ili „Cijelo tijelo A“.</T>
        </Card>
      )}

      {routines.map((r) => (
        <Card key={r.id}>
          <T variant="heading">{r.name}</T>
          <T variant="small">{r.exerciseCount} vježbi</T>
          <Row>
            <Button small title="Pokreni" style={{ flex: 1 }} onPress={() => start(r.id)} />
            <Button
              small
              kind="secondary"
              title="Uredi"
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/routine/[id]', params: { id: r.id } })}
            />
          </Row>
        </Card>
      ))}

      <Button kind="secondary" title="+ Nova rutina" onPress={() => router.push({ pathname: '/routine/[id]', params: { id: 'new' } })} />
    </Screen>
  );
}
