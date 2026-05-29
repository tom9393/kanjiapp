import { Alert } from 'react-native';

// A two-button confirmation for an irreversible action: Cancel + a red confirm button that runs
// onConfirm. Wraps the Alert.alert shape the list screens repeated.
export function confirmDestructive({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}): void {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
