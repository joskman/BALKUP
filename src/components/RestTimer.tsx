import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Vibration, View } from 'react-native';

import { formatClock } from '@/domain/format';
import { colors, radius, space } from '@/lib/theme';

import { Button, ProgressBar, T } from './ui';

export interface RestState {
  endsAt: number;
  totalSec: number;
  exerciseName: string;
  exerciseId: string;
}

/**
 * Traka timera pauze. Kad istekne dok je aplikacija otvorena, mobitel zavibrira;
 * kad je zaključan, javlja se zakazana lokalna obavijest (vidi lib/notifications).
 */
export function RestTimerBar({
  rest,
  onAdjust,
  onSkip,
  onDone,
}: {
  rest: RestState;
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
  onDone: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const doneFired = useRef(false);

  useEffect(() => {
    doneFired.current = false;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [rest.endsAt]);

  const remaining = (rest.endsAt - now) / 1000;

  useEffect(() => {
    if (remaining <= 0 && !doneFired.current) {
      doneFired.current = true;
      Vibration.vibrate([0, 400, 200, 400]);
      onDone();
    }
  }, [remaining, onDone]);

  return (
    <View style={styles.bar}>
      <View style={{ flex: 1, gap: 6 }}>
        <T variant="label">Pauza · {rest.exerciseName}</T>
        <T style={styles.clock}>{formatClock(remaining)}</T>
        <ProgressBar value={1 - Math.max(0, remaining) / Math.max(1, rest.totalSec)} />
      </View>
      <View style={styles.buttons}>
        <Button small kind="secondary" title="−15" onPress={() => onAdjust(-15)} />
        <Button small kind="secondary" title="+15" onPress={() => onAdjust(15)} />
        <Button small kind="primary" title="Preskoči" onPress={onSkip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.cardHigh,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  clock: { fontSize: 32, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  buttons: { gap: space.xs },
});
