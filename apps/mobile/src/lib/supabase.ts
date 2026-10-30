import { createClient } from '@supabase/supabase-js';
import type { Database } from '@velora/schemas';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

// Keychain/Keystore entries are limited to ~2 KB, but a session is larger: store it in chunks.
const CHUNK = 1800;
const chunkedSecureStore = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`));
    if (!count) return null;
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
    return parts.some((p) => p === null) ? null : parts.join('');
  },
  async setItem(key: string, value: string) {
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? [];
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${key}.${i}`, p)));
    await SecureStore.setItemAsync(`${key}.n`, String(parts.length));
  },
  async removeItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`));
    await Promise.all(Array.from({ length: count || 0 }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)));
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};

export const supabase = createClient<Database>(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
  auth: { storage: chunkedSecureStore, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Only refresh tokens while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
