import { rgb } from '@velora/config';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Dock } from '@/components/dock';

export default function TabsLayout() {
  const theme = useColorScheme() === 'dark' ? 'noir' : 'pearl';
  return (
    <Tabs tabBar={(props) => <Dock {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: rgb('ink', theme) } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="budgets" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="bills" />
    </Tabs>
  );
}
