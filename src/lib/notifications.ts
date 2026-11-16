import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Lokalne obavijesti za timer pauze. Rade u Expo Go na Androidu (push obavijesti ne trebamo).

const CHANNEL_ID = 'rest-timer';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let setupDone = false;

/** Stvara Android kanal i traži dopuštenje za obavijesti. Sigurno pozvati više puta. */
export async function setupNotifications(): Promise<boolean> {
  try {
    if (!setupDone && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Timer pauze',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 400, 200, 400],
      });
    }
    setupDone = true;
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

export async function notificationsGranted(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Zakazuje obavijest za kraj pauze. Vraća ID obavijesti ili null. */
export async function scheduleRestEnd(seconds: number, exerciseName: string): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pauza je gotova',
        body: `Sljedeća serija: ${exerciseName}`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelRestEnd(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Obavijest možda više ne postoji; to je u redu.
  }
}
