// Contents of the navigation drawer: the destinations that used to be the home screen's
// bottom buttons. Each row pushes onto the Stack and closes the drawer.
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@/ui/theme';

const ITEMS: { label: string; path: Href }[] = [
  { label: 'Browse Kanji', path: '/kanji' },
  { label: 'Browse Radicals', path: '/radicals' },
  { label: 'Search Kanji', path: '/search/kanji' },
  { label: 'Search Words', path: '/search/words' },
  { label: 'Stats', path: '/stats' },
  { label: 'Settings', path: '/settings' },
];

export function DrawerContent({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const p = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: p.background, paddingTop: insets.top + 8 }]}>
      {ITEMS.map((item) => (
        <Pressable
          key={item.label}
          onPress={() => {
            router.push(item.path);
            onNavigate();
          }}
          style={({ pressed }) => [styles.item, pressed && { backgroundColor: p.surfaceVariant }]}
        >
          <Text style={[styles.itemLabel, { color: p.text }]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 8 },
  item: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8 },
  itemLabel: { fontSize: 16, fontWeight: '500' },
});
