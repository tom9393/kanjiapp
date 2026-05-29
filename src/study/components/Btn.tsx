// Filled / outlined button, ported from the study/view/* composables.
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { usePalette } from '@/ui/theme';

export function Btn({
  label,
  onPress,
  variant = 'filled',
  disabled = false,
  color,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined';
  disabled?: boolean;
  /** Overrides the filled background (e.g. the color-coded answer buttons). Ignored when outlined. */
  color?: string;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const outlined = variant === 'outlined';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        outlined
          ? { borderWidth: 1, borderColor: p.border, backgroundColor: 'transparent' }
          : { backgroundColor: color ?? p.primary },
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.7 },
        style,
      ]}
    >
      <Text style={[styles.btnLabel, { color: outlined ? p.text : p.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginHorizontal: 4 },
  btnLabel: { fontSize: 15, fontWeight: '600' },
});
