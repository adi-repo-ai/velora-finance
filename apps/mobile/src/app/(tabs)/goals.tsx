import { formatMoney, parseToMinor } from '@velora/core';
import { useContribute, useGoals } from '@velora/data';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Orb } from '@/components/orb';
import { Button, Empty, ErrorText, Glass, Heading, Label, Screen, T, useTheme } from '@/components/ui';

export default function Goals() {
  const goals = useGoals();
  return (
    <Screen>
      <Heading label="Goals" title="Save for" accent="what matters." />
      <ErrorText error={goals.error} />
      {goals.data?.length === 0 && <Glass className="p-2"><Empty title="No goals yet" body="Create a goal on the web app and watch the orb fill here." /></Glass>}
      {goals.data?.map((g, i) => <GoalCard key={g.id} goal={g} index={i} />)}
    </Screen>
  );
}

function GoalCard({ goal: g, index }: { goal: NonNullable<ReturnType<typeof useGoals>['data']>[number]; index: number }) {
  const [amount, setAmount] = useState('');
  const contribute = useContribute();
  const minor = parseToMinor(amount);
  const pct = g.saved_amount / g.target_amount;
  const { color } = useTheme();
  const ink = { color: pct >= 0.5 ? '#1d1307' : color('text') }; // label over gold liquid vs. empty glass
  return (
    <Glass index={index + 1} className="items-center gap-4 p-6">
      <Label>{g.target_date ? `By ${new Date(`${g.target_date}T00:00:00`).toLocaleDateString('en', { month: 'short', year: 'numeric' })}` : 'Open-ended'}</Label>
      <T className="font-serif text-[34px]">{g.emoji} {g.name}</T>
      <Orb size={230} pct={pct}>
        <T className="font-serif text-[64px] leading-[66px]" style={ink}>{Math.round(pct * 100)}<T className="font-serif text-[30px]" style={ink}>%</T></T>
      </Orb>
      <T className="font-serif text-[28px]">{formatMoney(g.saved_amount, g.currency)} <T className="font-serif text-[20px] text-faint">/ {formatMoney(g.target_amount, g.currency)}</T></T>
      <View className="w-full flex-row items-center gap-2">
        <TextInput
          accessibilityLabel={`Amount to add to ${g.name}`}
          value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount"
          placeholderTextColor={color('faint')}
          className="h-[54px] min-w-0 flex-1 rounded-full border border-line bg-surface/80 px-5 font-sans text-[16px] text-text"
        />
        <Button
          title="Add" className="w-28" disabled={!minor || minor <= 0} loading={contribute.isPending}
          onPress={() => minor && contribute.mutate({ goalId: g.id, amount: minor }, { onSuccess: () => { setAmount(''); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } })}
        />
      </View>
      <ErrorText error={contribute.error} />
    </Glass>
  );
}
