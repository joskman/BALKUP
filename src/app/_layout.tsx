import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect } from 'react';
import { AppState } from 'react-native';

import { Loading } from '@/components/ui';
import { autoFinishIfStale } from '@/db/progress';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { setupNotifications } from '@/lib/notifications';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: '(tabs)' };

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, text: colors.text },
};

/** Pri pokretanju i povratku u aplikaciju provjerava „zaboravljeni“ trening (C13). */
function Lifecycle() {
  const db = useSQLiteContext();
  useEffect(() => {
    SplashScreen.hideAsync();
    setupNotifications();
    autoFinishIfStale(db).catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') autoFinishIfStale(db).catch(() => {});
    });
    return () => sub.remove();
  }, [db]);
  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded} useSuspense>
          <Lifecycle />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: colors.bg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="workout/active" options={{ title: 'Trening', headerBackVisible: false, gestureEnabled: false }} />
            <Stack.Screen name="workout/[id]" options={{ title: 'Trening' }} />
            <Stack.Screen name="routine/[id]" options={{ title: 'Rutina' }} />
            <Stack.Screen name="exercise/[id]" options={{ title: 'Povijest vježbe' }} />
            <Stack.Screen name="exercise-picker" options={{ title: 'Odaberi vježbu', presentation: 'modal' }} />
            <Stack.Screen name="exercise-new" options={{ title: 'Nova vježba', presentation: 'modal' }} />
            <Stack.Screen name="backfill" options={{ title: 'Naknadni unos' }} />
          </Stack>
        </SQLiteProvider>
      </Suspense>
    </ThemeProvider>
  );
}
