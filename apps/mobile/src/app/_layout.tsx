import '../global.css';

// Per-weight imports so only the fonts we use end up in the bundle.
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import * as Sentry from '@sentry/react-native';
import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cssVars, rgb } from '@velora/config';
import { VeloraDataProvider } from '@velora/data';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { supabase } from '@/lib/supabase';

if (process.env.EXPO_PUBLIC_SENTRY_DSN) Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, tracesSampleRate: 0.1 });

SplashScreen.preventAutoHideAsync();
// Pearl in light mode, Noir in dark mode — follows the phone's appearance setting.
const THEME_VARS = { pearl: vars(cssVars('pearl')), noir: vars(cssVars('noir')) };
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

function RootLayout() {
  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic,
    Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular,
  });
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const theme = useColorScheme() === 'dark' ? 'noir' : 'pearl';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_OUT') queryClient.clear(); // never show the previous user's data
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const ready = fontsLoaded && session !== undefined;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  const signedIn = Boolean(session);
  return (
    <QueryClientProvider client={queryClient}>
      <VeloraDataProvider client={supabase}>
        <View style={[{ flex: 1 }, THEME_VARS[theme]]}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: rgb('ink', theme) } }}>
            <Stack.Protected guard={signedIn}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="add" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true, sheetCornerRadius: 34 }} />
              <Stack.Screen name="account-new" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.85], sheetGrabberVisible: true }} />
            </Stack.Protected>
            {/* Signed-out users land on the first screen here. */}
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="sign-up" />
            </Stack.Protected>
          </Stack>
        </View>
      </VeloraDataProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
