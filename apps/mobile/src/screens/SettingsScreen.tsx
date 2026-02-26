import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { API_BASE_URL } from '../api/client';
import { healthApi } from '../api/endpoints';
import {
  Card,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
} from '../components';
import { getDatabase } from '../db/client';
import type { Store } from '../domain/models';
import { storeRepository } from '../repositories/StoreRepository';
import { getOrCreateDeviceId } from '../services/deviceIdentity';
import { useUiStore } from '../state/uiStore';
import { theme } from '../theme';

export default function SettingsScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string>('');
  const [storageInfo, setStorageInfo] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeSaving, setStoreSaving] = useState(false);

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
      const [localStores, localDeviceId] = await Promise.all([
        storeRepository.listStores(),
        getOrCreateDeviceId(),
      ]);

      setStores(localStores);
      setDeviceId(localDeviceId);

      const db = await getDatabase();
      const pageSizeRow = await db.getFirstAsync<{ page_size: number }>('PRAGMA page_size;');
      const pageCountRow = await db.getFirstAsync<{ page_count: number }>('PRAGMA page_count;');
      const sizeBytes = (pageSizeRow?.page_size ?? 0) * (pageCountRow?.page_count ?? 0);
      setStorageInfo(`${(sizeBytes / 1024).toFixed(1)} KB local database`);

      try {
        await healthApi.check();
        setApiStatus('online');
      } catch {
        setApiStatus('offline');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadInfo();
    }, [loadInfo]),
  );

  const onToggleStore = useCallback(async (store: Store, enabled: boolean) => {
    try {
      await storeRepository.setStoreEnabled(store.id, enabled);
      setStores((previous) =>
        previous.map((candidate) =>
          candidate.id === store.id
            ? {
                ...candidate,
                enabled,
                updatedAt: new Date().toISOString(),
              }
            : candidate,
        ),
      );
    } catch (error) {
      setStoreError(error instanceof Error ? error.message : 'Could not update store state.');
    }
  }, []);

  const openStoreModal = () => {
    setStoreError(null);
    setNewStoreName('');
    setStoreModalOpen(true);
  };

  const createStore = async () => {
    const normalized = newStoreName.trim();

    if (!normalized) {
      setStoreError('Store name is required.');
      return;
    }

    setStoreSaving(true);
    setStoreError(null);

    try {
      await storeRepository.createStore(normalized);
      setStores(await storeRepository.listStores());
      setStoreModalOpen(false);
      setNewStoreName('');
    } catch (error) {
      setStoreError(error instanceof Error ? error.message : 'Could not create store.');
    } finally {
      setStoreSaving(false);
    }
  };

  const appVersion =
    (Constants.expoConfig as { version?: string } | null)?.version ??
    (Constants.manifest2 as { extra?: { expoClient?: { version?: string } } } | null)?.extra?.expoClient
      ?.version ??
    'unknown';

  return (
    <>
      <ScreenContainer scroll>
        <SectionHeader title="Settings" subtitle="Control stores, preferences and diagnostics." />

        {loading ? <LoadingState message="Refreshing settings…" /> : null}

        <Card>
          <SectionHeader
            title="Stores"
            subtitle="Only enabled stores appear in Add Price."
            trailing={<SecondaryButton label="Add Store" onPress={openStoreModal} />}
          />

          {stores.length === 0 ? (
            <Text style={styles.muted}>No stores yet. Add your first one.</Text>
          ) : (
            stores.map((store) => (
              <View key={store.id} style={styles.storeRow}>
                <View style={styles.storeTextWrap}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeMeta}>{store.enabled ? 'Enabled' : 'Disabled'}</Text>
                </View>
                <Switch value={store.enabled} onValueChange={(value) => void onToggleStore(store, value)} />
              </View>
            ))
          )}

          {storeError ? <Text style={styles.errorText}>{storeError}</Text> : null}
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

      <Modal
        visible={storeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStoreModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setStoreModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Add Store</Text>

            <TextInput
              value={newStoreName}
              onChangeText={setNewStoreName}
              style={styles.input}
              placeholder="Store name"
              placeholderTextColor={theme.colors.muted}
              autoFocus
            />

            {storeError ? <Text style={styles.errorText}>{storeError}</Text> : null}

            <View style={styles.modalActions}>
              <SecondaryButton label="Cancel" onPress={() => setStoreModalOpen(false)} />
              <PrimaryButton
                label={storeSaving ? 'Saving…' : 'Save'}
                onPress={() => void createStore()}
                disabled={storeSaving}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...theme.typography.sectionLabel,
  },
  muted: {
    ...theme.typography.bodyMuted,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  storeTextWrap: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  storeMeta: {
    ...theme.typography.caption,
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
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.modalOverlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  modalTitle: {
    ...theme.typography.heading,
  },
  input: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
});
