import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card, LoadingState, ScreenContainer, SectionHeader } from '../components';
import { API_BASE_URL } from '../api/client';
import { listStores, healthApi } from '../api/endpoints';
import { getDatabase } from '../db/client';
import { getOrCreateDeviceId } from '../services/deviceIdentity';
import { useUiStore } from '../state/uiStore';
import { theme } from '../theme';

type StoreOption = { id: string; name: string };

export default function SettingsScreen() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string>('');
  const [storageInfo, setStorageInfo] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const preferredStoreId = useUiStore((state) => state.preferredStoreId);
  const setPreferredStoreId = useUiStore((state) => state.setPreferredStoreId);
  const scannerEnabled = useUiStore((state) => state.scannerEnabled);
  const setScannerEnabled = useUiStore((state) => state.setScannerEnabled);
  const compactMode = useUiStore((state) => state.compactMode);
  const setCompactMode = useUiStore((state) => state.setCompactMode);
  const notificationsEnabled = useUiStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useUiStore((state) => state.setNotificationsEnabled);

  const loadInfo = useCallback(async () => {
    setLoading(true);
    setApiStatus('checking');

    try {
      const [remoteStores, localDeviceId] = await Promise.all([listStores(), getOrCreateDeviceId()]);
      setStores(remoteStores.map((store) => ({ id: store.id, name: store.name })));
      setDeviceId(localDeviceId);

      const db = await getDatabase();
      const pageSizeRow = await db.getFirstAsync<{ page_size: number }>('PRAGMA page_size;');
      const pageCountRow = await db.getFirstAsync<{ page_count: number }>('PRAGMA page_count;');
      const sizeBytes = (pageSizeRow?.page_size ?? 0) * (pageCountRow?.page_count ?? 0);
      const sizeKb = sizeBytes / 1024;
      setStorageInfo(`${sizeKb.toFixed(1)} KB local database`);

      await healthApi.check();
      setApiStatus('online');
    } catch {
      setApiStatus('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadInfo();
    }, [loadInfo]),
  );

  const appVersion =
    (Constants.expoConfig as { version?: string } | null)?.version ??
    (Constants.manifest2 as { extra?: { expoClient?: { version?: string } } } | null)?.extra?.expoClient
      ?.version ??
    'unknown';

  return (
    <ScreenContainer scroll>
      <SectionHeader title="Settings" subtitle="Control stores, preferences and diagnostics." />

      {loading ? <LoadingState message="Refreshing settings…" /> : null}

      <Card>
        <Text style={styles.sectionLabel}>Preferred Store</Text>
        <View style={styles.storeWrap}>
          {stores.length === 0 ? (
            <Text style={styles.muted}>No stores available.</Text>
          ) : (
            stores.map((store) => (
              <Pressable
                key={store.id}
                style={({ pressed }) => [
                  styles.storeChip,
                  preferredStoreId === store.id && styles.storeChipActive,
                  pressed && styles.storeChipPressed,
                ]}
                onPress={() => setPreferredStoreId(store.id)}
              >
                <Text
                  style={[
                    styles.storeChipLabel,
                    preferredStoreId === store.id && styles.storeChipLabelActive,
                  ]}
                >
                  {store.name}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Preferences</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Scanner enabled</Text>
          <Switch value={scannerEnabled} onValueChange={setScannerEnabled} />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Compact list mode</Text>
          <Switch value={compactMode} onValueChange={setCompactMode} />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Notifications</Text>
          <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Device & Storage</Text>
        <Text style={styles.value} numberOfLines={1}>
          Device: {deviceId || 'unavailable'}
        </Text>
        <Text style={styles.value}>Storage: {storageInfo || 'unknown'}</Text>
        <Text style={styles.value}>App version: {appVersion}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Network</Text>
        <Text style={styles.value}>Base URL: {API_BASE_URL}</Text>
        <Text style={[styles.value, apiStatus === 'online' ? styles.success : styles.error]}>
          API status: {apiStatus}
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...theme.typography.sectionLabel,
  },
  storeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  storeChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  storeChipPressed: {
    opacity: 0.75,
  },
  storeChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  storeChipLabel: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  storeChipLabelActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  muted: {
    ...theme.typography.bodyMuted,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    ...theme.typography.body,
  },
  value: {
    ...theme.typography.bodyMuted,
  },
  success: {
    color: theme.colors.success,
    fontWeight: '700',
  },
  error: {
    color: theme.colors.error,
    fontWeight: '700',
  },
});
