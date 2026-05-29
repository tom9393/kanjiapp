// "Show N more" / "Show less" toggle for collapsed lists.
import { Pressable, StyleSheet, Text } from 'react-native';
import { usePalette } from '@/ui/theme';

export function ShowMore({
  expanded,
  hiddenCount,
  onToggle,
  expandLabel,
}: {
  expanded: boolean;
  hiddenCount: number;
  onToggle: () => void;
  /** Overrides the default "Show N more" collapsed label. */
  expandLabel?: string;
}) {
  const p = usePalette();
  return (
    <Pressable onPress={onToggle} style={styles.showMore} hitSlop={8}>
      <Text style={{ color: p.primary, fontWeight: '600' }}>
        {expanded ? 'Show less' : (expandLabel ?? `Show ${hiddenCount} more`)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  showMore: { paddingTop: 10 },
});
