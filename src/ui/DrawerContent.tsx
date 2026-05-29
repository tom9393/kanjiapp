// Contents of the navigation drawer: the destinations that used to be the home screen's
// bottom buttons. Each row pushes onto the Stack and closes the drawer.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@/ui/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ITEMS: { label: string; path: Href; icon: IconName }[] = [
  { label: 'Browse Kanji', path: '/kanji', icon: 'grid-outline' },
  { label: 'Browse Radicals', path: '/radicals', icon: 'git-branch-outline' },
  { label: 'Favorites', path: '/favorites', icon: 'heart-outline' },
  { label: 'Search Kanji', path: '/search/kanji', icon: 'search-outline' },
  { label: 'Search Words', path: '/search/words', icon: 'text-outline' },
  { label: 'Custom Study', path: '/custom', icon: 'school-outline' },
  { label: 'My Lists', path: '/lists', icon: 'list-outline' },
  { label: 'Stats', path: '/stats', icon: 'stats-chart-outline' },
  { label: 'Settings', path: '/settings', icon: 'settings-outline' },
  // Dev-only SRS admin panel; stripped from production builds (see app/admin.tsx).
  ...(__DEV__ ? [{ label: 'Admin (SRS)', path: '/admin' as Href, icon: 'construct-outline' as IconName }] : []),
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
          <Ionicons name={item.icon} size={22} color={p.textSecondary} style={styles.itemIcon} />
          <Text style={[styles.itemLabel, { color: p.text }]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8 },
  itemIcon: { width: 28 },
  itemLabel: { fontSize: 16, fontWeight: '500' },
});
