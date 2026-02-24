import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { ListSchema } from '@listacerta/shared-types';

export default function App() {
  const example = ListSchema.parse({
    id: 'demo-list-id',
    name: 'Weekly Grocery List',
    createdAt: new Date().toISOString(),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ListaCerta Mobile</Text>
      <Text style={styles.subtitle}>Expo + TypeScript ready</Text>
      <Text style={styles.meta}>Sample schema: {example.name}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  meta: {
    fontSize: 14,
    color: '#333',
  },
});
