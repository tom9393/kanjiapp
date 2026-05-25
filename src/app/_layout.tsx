import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ensureDbReady } from '@/data/init';
import { useThemeStore } from '@/state/themeStore';
import { useNavigationTheme } from '@/ui/theme';

export default function RootLayout() {
  const navigationTheme = useNavigationTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([ensureDbReady(), useThemeStore.getState().init()])
      .catch((e) => console.error('Init failed', e))
      .finally(() => setReady(true));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        {ready ? (
          <Stack
          screenOptions={{
            // This explicitly turns off all screen transition animations
            animation: 'none', 
          }}
          >
            <Stack.Screen name="index" options={{ title: 'KanjiApp' }} />
            <Stack.Screen name="study" options={{ title: 'Study' }} />
            <Stack.Screen name="complete" options={{ title: 'Complete', headerBackVisible: false }} />
            <Stack.Screen name="kanji/index" options={{ title: 'Browse Kanji' }} />
            <Stack.Screen name="kanji/[character]" options={{ title: 'Kanji' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="stats" options={{ title: 'Statistics' }} />
          </Stack>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" />
            <Text>Setting up your kanji database…</Text>
          </View>
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
