import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, Screen, T } from '@/components/ui';
import { createCustomExercise } from '@/db/repo';
import { EQUIPMENT_LABELS, LOG_TYPE_LABELS, MUSCLE_LABELS } from '@/domain/exercises';
import type { Equipment, LogType, MuscleGroup } from '@/domain/types';
import { colors, radius, space } from '@/lib/theme';

export default function NewExerciseScreen() {
  const db = useSQLiteContext();
  const [nameEn, setNameEn] = useState('');
  const [nameHr, setNameHr] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('chest');
  const [equipment, setEquipment] = useState<Equipment>('machine');
  const [logType, setLogType] = useState<LogType>('weight_reps');

  const save = async () => {
    const en = nameEn.trim();
    const hr = nameHr.trim();
    if (!en && !hr) {
      Alert.alert('Naziv', 'Upiši barem jedan naziv vježbe.');
      return;
    }
    await createCustomExercise(db, { nameEn: en || hr, nameHr: hr || en, muscle, equipment, logType });
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <T variant="label">Naziv (engleski)</T>
      <TextInput style={styles.input} value={nameEn} onChangeText={setNameEn} placeholder="npr. Cable Fly" placeholderTextColor={colors.textFaint} />
      <T variant="label">Naziv (hrvatski)</T>
      <TextInput style={styles.input} value={nameHr} onChangeText={setNameHr} placeholder="npr. Razvlačenje na sajli" placeholderTextColor={colors.textFaint} />

      <T variant="label">Glavna mišićna skupina</T>
      <View style={styles.wrap}>
        {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((m) => (
          <Chip key={m} label={MUSCLE_LABELS[m]} active={muscle === m} onPress={() => setMuscle(m)} />
        ))}
      </View>

      <T variant="label">Oprema</T>
      <View style={styles.wrap}>
        {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((e) => (
          <Chip key={e} label={EQUIPMENT_LABELS[e]} active={equipment === e} onPress={() => setEquipment(e)} />
        ))}
      </View>

      <T variant="label">Kako se bilježi</T>
      <View style={styles.wrap}>
        {(Object.keys(LOG_TYPE_LABELS) as LogType[]).map((l) => (
          <Chip key={l} label={LOG_TYPE_LABELS[l]} active={logType === l} onPress={() => setLogType(l)} />
        ))}
      </View>

      <Button title="Spremi vježbu" onPress={save} style={{ marginTop: space.md }} />
    </Screen>
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
