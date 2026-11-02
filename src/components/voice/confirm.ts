import { Alert, Platform } from 'react-native';

/** Asks before a destructive step. React Native Web has no Alert, so the browser's confirm is used there. */
export function confirmAction(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    const ask = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    if (!ask || ask(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}
