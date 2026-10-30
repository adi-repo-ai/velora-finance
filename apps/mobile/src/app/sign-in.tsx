import { fieldErrors, signInSchema } from '@velora/schemas';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, ErrorText, Field, Glass, Screen, T } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = signInSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    setFailure(error); // on success the root guard switches to the tabs
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="gap-6 pt-10">
        <View className="items-center gap-2">
          <View className="h-12 w-12 rounded-full bg-gold-1" />
          <T className="font-serif text-[56px] leading-[60px]">Velora</T>
          <T className="text-muted">Your money, all in one place.</T>
        </View>
        <Glass className="gap-4 p-6">
          <T className="font-serif text-[34px]">Welcome <T className="font-serif-italic text-[34px] text-gold-2">back.</T></T>
          <Field label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} error={errors.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Field label="Password" value={form.password} onChangeText={(password) => setForm({ ...form, password })} error={errors.password} secureTextEntry autoComplete="current-password" textContentType="password" />
          <ErrorText error={failure} />
          <Button title="Sign in" loading={busy} onPress={submit} />
          <Link href="/sign-up" className="text-center font-sans text-[14px] text-muted">New to Velora? <T className="font-semibold text-gold-2">Create an account</T></Link>
        </Glass>
      </KeyboardAvoidingView>
    </Screen>
  );
}
