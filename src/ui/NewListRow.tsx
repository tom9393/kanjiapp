// The "New list name" field + Create button shared by the lists index and the add-to-list modal.
// Owns the draft text; on submit it hands the trimmed (non-empty) name to onCreate and clears.
import { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { usePalette } from '@/ui/theme';

export function NewListRow({
  onCreate,
  style,
}: {
  onCreate: (name: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const [name, setName] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
  };

  return (
    <View style={[styles.row, { backgroundColor: p.surfaceVariant }, style]}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="New list name"
        placeholderTextColor={p.textSecondary}
        onSubmitEditing={submit}
        returnKeyType="done"
        style={[styles.input, { color: p.text, borderColor: p.border, backgroundColor: p.background }]}
      />
      <Pressable
        onPress={submit}
        disabled={!name.trim()}
        style={({ pressed }) => [
          styles.createBtn,
          { backgroundColor: name.trim() ? p.primary : p.border },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.createLabel, { color: p.onPrimary }]}>Create</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 10 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  createBtn: { paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10 },
  createLabel: { fontSize: 14, fontWeight: '600' },
});
