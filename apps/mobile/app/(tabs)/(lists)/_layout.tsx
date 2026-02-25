import { Stack } from 'expo-router';

import { theme } from '../../../src/theme';

export default function ListsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Lists' }} />
      <Stack.Screen name="lists/[id]" options={{ title: 'List details' }} />
    </Stack>
  );
}
