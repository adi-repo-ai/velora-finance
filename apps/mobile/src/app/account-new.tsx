import { fieldErrors, accountSchema } from '@velora/schemas';
import { useAddAccount, useCurrency } from '@velora/data';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Chip, ErrorText, Field, Label, T } from '@/components/ui';

const TYPES = ['checking', 'savings', 'credit', 'loan', 'investment', 'cash', 'wallet'] as const;

export default function NewAccount() {
  const currency = useCurrency();
  const add = useAddAccount();
  const [form, setForm] = useState({ name: '', type: 'savings' as (typeof TYPES)[number], institution: '', mask: '', openingBalance: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function save() {
    const input = { ...form, currency, openingBalance: form.openingBalance || '0' };
    const parsed = accountSchema.safeParse(input);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    add.mutate(input, { onSuccess: () => router.back() });
  }

  return (
    <ScrollView className="flex-1 bg-ink" contentContainerClassName="gap-4 px-5 pb-10 pt-6" keyboardShouldPersistTaps="handled">
      <T className="font-serif text-[38px]">New <T className="font-serif-italic text-[38px] text-gold-2">account</T></T>
      <Field label="Name" placeholder="HDFC Savings" value={form.name} onChangeText={(name) => setForm({ ...form, name })} error={errors.name} />
      <View className="gap-2">
        <Label>Type</Label>
        <View className="flex-row flex-wrap gap-2">
          {TYPES.map((t) => <Chip key={t} label={t[0]!.toUpperCase() + t.slice(1)} active={form.type === t} onPress={() => setForm({ ...form, type: t })} />)}
        </View>
      </View>
      <Field label="Bank (optional)" value={form.institution} onChangeText={(institution) => setForm({ ...form, institution })} />
      <Field label="Last 4 digits (optional)" value={form.mask} onChangeText={(mask) => setForm({ ...form, mask })} keyboardType="number-pad" maxLength={4} error={errors.mask} />
      <Field label={form.type === 'credit' || form.type === 'loan' ? `Amount owed (${currency})` : `Balance today (${currency})`} value={form.openingBalance} onChangeText={(openingBalance) => setForm({ ...form, openingBalance })} keyboardType="decimal-pad" placeholder="0.00" />
      <ErrorText error={add.error} />
      <Button title="Add account" loading={add.isPending} onPress={save} />
    </ScrollView>
  );
}
