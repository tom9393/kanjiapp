// JS replacement for the native-stack header. With the Stack's `animation: 'none'`, the
// native Android toolbar updates a frame or two after the screen content swaps. Rendering
// the header in React keeps it inside the same screen commit as the content, so the title
// and back button change together instead of trailing. Mirrors the Android Material header:
// left-aligned title, back arrow when there's somewhere to go back to.
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDrawerStore } from '@/state/drawerStore';
import { usePalette } from '@/ui/theme';

export function AppHeader({ options, back, navigation, route }: NativeStackHeaderProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useDrawerStore();
  const title = typeof options.title === 'string' ? options.title : '';
  const showBack = back != null && options.headerBackVisible !== false;
  const showMenu = !showBack && route.name === 'index';

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: p.background }}>
      <View style={styles.bar}>
        {showBack && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.leftButton}>
            <Ionicons name="arrow-back" size={26} color={p.text} />
          </Pressable>
        )}
        {showMenu && (
          <Pressable onPress={openDrawer} hitSlop={8} style={styles.leftButton}>
            <Ionicons name="menu" size={26} color={p.text} />
          </Pressable>
        )}
        <Text
          style={[styles.title, { color: p.text }, !showBack && !showMenu && styles.titleNoBack]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 56, flexDirection: 'row', alignItems: 'center' },
  leftButton: { paddingHorizontal: 16, height: '100%', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '500' },
  titleNoBack: { marginLeft: 16 },
});
