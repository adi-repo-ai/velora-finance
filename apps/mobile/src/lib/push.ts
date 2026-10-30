import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Asks for permission (only when the user opts in) and returns this device's Expo push token. */
export async function registerForPush(): Promise<{ token: string; platform: 'ios' | 'android' } | { error: string }> {
  if (!Device.isDevice) return { error: 'Push reminders need a physical device.' };
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bills', { name: 'Bill reminders', importance: AndroidImportance.HIGH });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return { error: 'Notifications are turned off for Velora in Settings.' };
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return { error: 'Missing EAS project id — run `eas init` once.' };
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token: data, platform: Platform.OS === 'ios' ? 'ios' : 'android' };
}

const TOKEN_KEY = 'velora.pushToken';

export const rememberPushToken = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token);

/** Sign out, first unlinking this device so the next person to sign in doesn't get the previous user's reminders. */
export async function signOutDevice() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    await supabase.from('push_tokens').delete().eq('token', token);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
  await supabase.auth.signOut();
}
