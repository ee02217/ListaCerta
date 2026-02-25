import { Stack } from 'expo-router';

import { theme } from '../../../src/theme';

export default function SearchStackLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Search' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan barcode' }} />
      <Stack.Screen name="products/[id]" options={{ title: 'Product detail' }} />
      <Stack.Screen name="prices/add" options={{ title: 'Add price' }} />
    </Stack>
  );
}
