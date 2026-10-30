import { formatMoney, monthKey } from '@velora/core';
import { useAccounts, useAddTransaction, useCategories, useCurrency } from '@velora/data';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Chip, ErrorText, Label, T } from '@/components/ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

/** Quick-add sheet: amount keypad + account and category chips. */
export default function AddTransaction() {
  const currency = useCurrency();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const add = useAddTransaction();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<string>();
  const [categoryId, setCategoryId] = useState<string>();
  const account = accountId ?? accounts[0]?.id;

  function press(k: string) {
    Haptics.selectionAsync();
    setAmount((a) => {
      if (k === '⌫') return a.slice(0, -1);
      if (k === '.' && a.includes('.')) return a;
      if (/\.\d{2}$/.test(a) || a.replace('.', '').length >= 9) return a; // 2 decimals, sane max
      return a === '0' && k !== '.' ? k : a + k;
    });
  }

  function save() {
    if (!account) return;
    add.mutate(
      { kind, amount, accountId: account, categoryId, postedOn: new Date().toLocaleDateString('en-CA'), description: categories.find((c) => c.id === categoryId)?.name ?? '' },
      { onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.back(); } },
    );
  }

  const cents = Math.round(Number(amount || '0') * 100);
  const visible = categories.filter((c) => (kind === 'income' ? c.kind === 'income' : c.kind === 'expense'));
  return (
    <View className="flex-1 bg-ink px-5 pt-6">
      <View className="flex-row rounded-2xl bg-text/5 p-1">
        {(['expense', 'income'] as const).map((k) => (
          <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: kind === k }} onPress={() => { setKind(k); setCategoryId(undefined); }}
            className={kind === k ? 'flex-1 items-center rounded-xl bg-surface py-2.5' : 'flex-1 items-center py-2.5'}>
            <T className={kind === k ? 'font-semibold capitalize' : 'font-semibold capitalize text-muted'}>{k}</T>
          </Pressable>
        ))}
      </View>
      <T className="my-5 text-center font-serif text-[56px]" accessibilityLiveRegion="polite">{formatMoney(cents, currency, { cents: amount.includes('.') })}</T>
      <Label>Account</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-2">
        {accounts.map((a) => <Chip key={a.id} label={a.name} active={a.id === account} onPress={() => setAccountId(a.id)} />)}
      </ScrollView>
      <Label>Category</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-2">
        {visible.map((c) => <Chip key={c.id} label={`${c.icon} ${c.name}`} active={c.id === categoryId} onPress={() => setCategoryId(c.id)} />)}
      </ScrollView>
      <View className="mt-3 flex-row flex-wrap justify-between gap-y-2.5">
        {KEYS.map((k) => (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={k === '⌫' ? 'Delete' : k} onPress={() => press(k)}
            className="h-[54px] w-[31.5%] items-center justify-center rounded-2xl border border-glass-edge bg-surface/60 active:bg-surface">
            <T className="text-[22px]">{k}</T>
          </Pressable>
        ))}
      </View>
      <ErrorText error={add.error} />
      <Button className="mt-4" title={accounts.length ? 'Save transaction' : 'Add an account first'} disabled={!cents || !account} loading={add.isPending} onPress={save} />
      <T className="mt-2 text-center text-[12px] text-faint">Dated today · {monthKey().slice(0, 7)}</T>
    </View>
  );
}
