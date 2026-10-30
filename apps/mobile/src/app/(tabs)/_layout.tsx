import { Tabs } from 'expo-router';
import { Dock } from '@/components/dock';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <Dock {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#F2EEE6' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="budgets" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="bills" />
    </Tabs>
  );
}
