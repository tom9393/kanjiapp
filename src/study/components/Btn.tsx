// Filled / outlined button, ported from the study/view/* composables.
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { usePalette } from '@/ui/theme';

export function Btn({
  label,
  onPress,
  variant = 'filled',
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined';
  disabled?: boolean;
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
          : { backgroundColor: p.primary },
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
