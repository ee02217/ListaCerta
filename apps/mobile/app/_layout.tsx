import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { EmptyState, LoadingState, ScreenContainer } from '../src/components';
import { getDatabase } from '../src/db/client';
import { runMigrations } from '../src/db/migrations';
import { seedDatabaseIfEmpty } from '../src/db/seed';
import { getOrCreateDeviceId } from '../src/services/deviceIdentity';
import { syncPendingPriceSubmissions } from '../src/services/offlinePriceSync';
import { syncStoresToLocal } from '../src/services/storeSync';
import { theme } from '../src/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const db = await getDatabase();
        await runMigrations(db);
        await seedDatabaseIfEmpty(db);
        await getOrCreateDeviceId();
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
        // transient errors are expected when offline
      }

      try {
        await syncPendingPriceSubmissions();
      } catch {
        // queue will retry later
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
      <ScreenContainer>
        <EmptyState title="Startup failed" message={error} />
      </ScreenContainer>
    );
  }

  if (!ready) {
    return (
      <ScreenContainer>
        <LoadingState message="Preparing local database…" />
      </ScreenContainer>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: '700', color: theme.colors.text },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.background },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
