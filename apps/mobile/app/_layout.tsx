import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';

import { getDatabase } from '../src/db/client';
import { runMigrations } from '../src/db/migrations';
import { seedDatabaseIfEmpty } from '../src/db/seed';
import { syncPendingPriceSubmissions } from '../src/services/offlinePriceSync';
import { syncStoresToLocal } from '../src/services/storeSync';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const db = await getDatabase();
        await runMigrations(db);
        await seedDatabaseIfEmpty(db);
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown startup error');
      }
    };

    void init();
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    let cancelled = false;

    const triggerSync = async () => {
      if (cancelled) {
        return;
      }

      try {
        await syncStoresToLocal();
      } catch {
        // Ignore transient network errors. We'll retry on interval/foreground.
      }

      try {
        await syncPendingPriceSubmissions();
      } catch {
        // Silent retry loop; pending queue remains for next attempt.
      }
    };

    void triggerSync();

    const interval = setInterval(() => {
      void triggerSync();
    }, 15000);

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void triggerSync();
      }
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [ready]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Startup failed</Text>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Preparing local database…</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="lists/[id]" options={{ title: 'List details' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan barcode' }} />
      <Stack.Screen name="products/[id]" options={{ title: 'Product detail' }} />
      <Stack.Screen name="prices/add" options={{ title: 'Add price' }} />
    </Stack>
  );
}
