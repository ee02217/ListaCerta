import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { theme } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: {
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          height: 86,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.md,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          const iconName: Record<string, keyof typeof Ionicons.glyphMap> = {
            '(lists)': 'list',
            '(search)': 'search',
            '(settings)': 'settings',
          };

          return <Ionicons name={iconName[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="(lists)" options={{ title: 'Lists' }} />
      <Tabs.Screen name="(search)" options={{ title: 'Search' }} />
      <Tabs.Screen name="(settings)" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
