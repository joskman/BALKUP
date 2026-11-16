import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors } from '@/lib/theme';

// Privremene ikone (emoji) dok se u Fazi E ne definira stil ikona.
function icon(glyph: string) {
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{glyph}</Text>;
  }
  return TabIcon;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Početna', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="routines" options={{ title: 'Rutine', tabBarIcon: icon('📋') }} />
      <Tabs.Screen name="history" options={{ title: 'Povijest', tabBarIcon: icon('📅') }} />
      <Tabs.Screen name="character" options={{ title: 'Lik', tabBarIcon: icon('🛡️') }} />
      <Tabs.Screen name="settings" options={{ title: 'Postavke', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
