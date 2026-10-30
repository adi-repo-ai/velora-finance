import { fieldErrors, signUpSchema } from '@velora/schemas';
import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Chip, ErrorText, Field, Glass, Label, Screen, T } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function SignUp() {
  const [form, setForm] = useState({ displayName: '', email: '', password: '', homeCountry: 'US' as 'US' | 'IN' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<Error | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { email, password, displayName, homeCountry } = parsed.data;
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName, home_country: homeCountry }, emailRedirectTo: 'velora://' },
    });
    setBusy(false);
    if (error) return setFailure(error);
    if (!data.session) setSentTo(email);
  }

  return (
    <Screen>
      <View className="gap-6 pt-6">
        <T className="font-serif text-[48px] leading-[50px]">Open your <T className="font-serif-italic text-[48px] text-gold-2">vault.</T></T>
        {sentTo ? (
          <Glass className="gap-2 p-6"><T className="font-serif text-[30px]">Check your inbox</T><T className="text-muted">We sent a confirmation link to {sentTo}.</T></Glass>
        ) : (
          <Glass className="gap-4 p-6">
            <Field label="Your name" value={form.displayName} onChangeText={(displayName) => setForm({ ...form, displayName })} error={errors.displayName} autoComplete="given-name" />
            <View className="gap-2">
              <Label>Where you bank</Label>
              <View className="flex-row gap-2">
                <Chip label="🇺🇸 United States · USD" active={form.homeCountry === 'US'} onPress={() => setForm({ ...form, homeCountry: 'US' })} />
                <Chip label="🇮🇳 India · INR" active={form.homeCountry === 'IN'} onPress={() => setForm({ ...form, homeCountry: 'IN' })} />
              </View>
            </View>
            <Field label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} error={errors.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Field label="Password" value={form.password} onChangeText={(password) => setForm({ ...form, password })} error={errors.password} secureTextEntry autoComplete="new-password" />
            <ErrorText error={failure} />
            <Button title="Create account" loading={busy} onPress={submit} />
          </Glass>
        )}
        <Link href="/sign-in" className="text-center font-sans text-[14px] text-muted">Already have an account? <T className="font-semibold text-gold-2">Sign in</T></Link>
      </View>
    </Screen>
  );
}
