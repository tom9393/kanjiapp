import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'react-native-drawer-layout';

import { ensureDbReady } from '@/data/init';
import { useDrawerStore } from '@/state/drawerStore';
import { useThemeStore } from '@/state/themeStore';
import { AppHeader } from '@/ui/AppHeader';
import { DrawerContent } from '@/ui/DrawerContent';
import { useNavigationTheme } from '@/ui/theme';

export default function RootLayout() {
  const navigationTheme = useNavigationTheme();
  const { open, openDrawer, closeDrawer } = useDrawerStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([ensureDbReady(), useThemeStore.getState().init()])
      .catch((e) => console.error('Init failed', e))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(navigationTheme.colors.background);
  }, [navigationTheme.colors.background]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        {ready ? (
          <Drawer
            open={open}
            onOpen={openDrawer}
            onClose={closeDrawer}
            renderDrawerContent={() => <DrawerContent onNavigate={closeDrawer} />}
          >
            <Stack
              screenOptions={{
                animation: 'none',
                header: (props) => <AppHeader {...props} />,
                contentStyle: { backgroundColor: navigationTheme.colors.background },
              }}
            >
              <Stack.Screen name="index" options={{ title: '' }} />
              <Stack.Screen name="study" options={{ title: 'Study' }} />
              <Stack.Screen name="complete" options={{ title: 'Complete', headerBackVisible: false }} />
              <Stack.Screen name="custom/index" options={{ title: 'Custom Study' }} />
              <Stack.Screen name="custom/[category]/[level]" options={{ title: 'Custom Study' }} />
              <Stack.Screen name="lists/index" options={{ title: 'My Lists' }} />
              <Stack.Screen name="lists/[id]" options={{ title: 'List' }} />
              <Stack.Screen name="lists/[id]/add" options={{ title: 'Add Kanji' }} />
              <Stack.Screen name="kanji/index" options={{ title: 'Browse Kanji' }} />
              <Stack.Screen name="radicals/index" options={{ title: 'Browse Radicals' }} />
              <Stack.Screen name="radicals/[radical]" options={{ title: 'Radical' }} />
              <Stack.Screen name="kanji/[character]" options={{ title: 'Kanji' }} />
              <Stack.Screen name="search/kanji" options={{ title: 'Search Kanji' }} />
              <Stack.Screen name="search/words" options={{ title: 'Search Words' }} />
              <Stack.Screen name="favorites" options={{ title: 'Favorites' }} />
              <Stack.Screen name="word/[id]" options={{ title: 'Word' }} />
              <Stack.Screen name="sentence/[id]" options={{ title: 'Sentence' }} />
              <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
              <Stack.Screen name="settings/[section]" options={{ title: 'Settings' }} />
              <Stack.Screen name="stats" options={{ title: 'Statistics' }} />
            </Stack>
          </Drawer>
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
