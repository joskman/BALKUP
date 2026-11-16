import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, Card, Loading, Row, Screen, T } from '@/components/ui';
import { getSettings, saveWeekGoal, setSetting } from '@/db/repo';
import { formatClock } from '@/domain/format';
import { weekKey } from '@/domain/weeks';
import { exportData } from '@/lib/export';
import { notificationsGranted, setupNotifications } from '@/lib/notifications';
import { colors } from '@/lib/theme';
import { useFocusLoad } from '@/lib/useFocusLoad';

export default function SettingsScreen() {
  const { data, reload, db } = useFocusLoad(async (db) => {
    const [settings, notif] = await Promise.all([getSettings(db), notificationsGranted()]);
    return { settings, notif };
  });
  const [exporting, setExporting] = useState(false);

  if (!data) return <Loading />;
  const { settings, notif } = data;

  const setGoal = async (goal: number) => {
    const g = Math.max(1, Math.min(6, goal));
    await setSetting(db, 'weeklyGoal', g);
    // Promjena cilja vrijedi od tekućeg tjedna; prošli tjedni zadržavaju svoj cilj.
    await saveWeekGoal(db, weekKey(Date.now()), g, true);
    await reload();
  };

  const setRest = async (sec: number) => {
    await setSetting(db, 'defaultRestSec', Math.max(15, Math.min(600, sec)));
    await reload();
  };

  const doExport = async () => {
    setExporting(true);
    try {
      await exportData(db);
    } catch (e) {
      Alert.alert('Izvoz nije uspio', String(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <T variant="title">Postavke</T>

      <Card>
        <T variant="heading">Tjedni cilj</T>
        <T variant="dim">Koliko treninga tjedno želiš odraditi. Najviše 6, uvijek ostaje barem jedan dan odmora.</T>
        <Row style={{ justifyContent: 'center' }}>
          <Button small kind="secondary" title="−" onPress={() => setGoal(settings.weeklyGoal - 1)} />
          <T style={{ fontSize: 28, fontWeight: '800', minWidth: 60, textAlign: 'center' }}>{settings.weeklyGoal}</T>
          <Button small kind="secondary" title="+" onPress={() => setGoal(settings.weeklyGoal + 1)} />
        </Row>
      </Card>

      <Card>
        <T variant="heading">Zadana pauza</T>
        <T variant="dim">Koristi se za vježbe za koje još nisi odabrao pauzu. Svaka vježba pamti svoju.</T>
        <Row style={{ justifyContent: 'center' }}>
          <Button small kind="secondary" title="−15 s" onPress={() => setRest(settings.defaultRestSec - 15)} />
          <T style={{ fontSize: 28, fontWeight: '800', minWidth: 80, textAlign: 'center' }}>{formatClock(settings.defaultRestSec)}</T>
          <Button small kind="secondary" title="+15 s" onPress={() => setRest(settings.defaultRestSec + 15)} />
        </Row>
      </Card>

      <Card>
        <T variant="heading">Obavijesti</T>
        <T variant="dim" style={{ color: notif ? colors.success : colors.warning }}>
          {notif ? 'Uključene: timer pauze javlja se i kad je mobitel zaključan.' : 'Isključene: timer pauze neće se javiti dok je mobitel zaključan.'}
        </T>
        {!notif && <Button small kind="secondary" title="Dopusti obavijesti" onPress={() => setupNotifications().then(reload)} />}
      </Card>

      <Card>
        <T variant="heading">Sigurnosna kopija</T>
        <T variant="dim">Podaci prototipa postoje samo na ovom mobitelu. Povremeno ih izvezi i spremi (npr. na Google Drive).</T>
        <Button title={exporting ? 'Izvozim…' : 'Izvezi podatke (JSON)'} onPress={doExport} disabled={exporting} />
      </Card>

      <T variant="small" style={{ textAlign: 'center', color: colors.textFaint }}>
        BALKUP prototip · Etapa 0 · podaci samo na uređaju
      </T>
    </Screen>
  );
}
