import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeModulesProxy } from 'expo-modules-core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Store as ApiStore } from '@listacerta/shared-types';
import { ApiHttpError } from '../api/client';
import { priceApi, storeApi } from '../api/endpoints';
import { PrimaryButton, ScreenContainer, SecondaryButton, SectionHeader } from '../components';
import { priceRepository } from '../repositories/PriceRepository';
import { storeRepository } from '../repositories/StoreRepository';
import { getOrCreateDeviceId } from '../services/deviceIdentity';
import { syncPendingPriceSubmissions } from '../services/offlinePriceSync';
import { theme } from '../theme';

type StoreOption = {
  id: string;
  name: string;
  location: string | null;
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const makeIdempotencyKey = (productId: string, storeId: string) =>
  `price_${productId}_${storeId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const extractEuroValue = (textBlocks: string[]): string | null => {
  for (const line of textBlocks) {
    const match = line.match(/(\d{1,4}[.,]\d{2})/);
    if (!match) continue;
    const normalized = match[1].replace(',', '.');
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed.toFixed(2);
    }
  }

  return null;
};

export default function AddPriceScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [saving, setSaving] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreLocation, setNewStoreLocation] = useState('');
  const [isCreatingStore, setIsCreatingStore] = useState(false);

  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [stores, selectedStoreId],
  );

  const normalizeApiStore = (store: ApiStore): StoreOption => ({
    id: store.id,
    name: store.name,
    location: store.location ?? null,
  });

  const normalizeLocalStore = (store: { id: string; name: string }): StoreOption => ({
    id: store.id,
    name: store.name,
    location: null,
  });

  const applyStoreSelection = (allStores: StoreOption[], preferredStoreId?: string) => {
    if (allStores.length === 0) {
      setSelectedStoreId(null);
      return;
    }

    const defaultStoreId =
      preferredStoreId && allStores.some((item) => item.id === preferredStoreId)
        ? preferredStoreId
        : allStores[0].id;

    setSelectedStoreId(defaultStoreId);
  };

  const refreshStores = async (preferredStoreId?: string) => {
    try {
      const apiStores = await storeApi.listStores();
      const normalized = apiStores.map(normalizeApiStore);
      setStores(normalized);
      applyStoreSelection(normalized, preferredStoreId);
      await storeRepository.upsertManyFromApi(apiStores);
      return;
    } catch {
      // fallback to cache
    }

    const localStores = await storeRepository.getAll();
    const normalizedLocal = localStores.map(normalizeLocalStore);
    setStores(normalizedLocal);
    applyStoreSelection(normalizedLocal, preferredStoreId);
  };

  useEffect(() => {
    void refreshStores();
  }, []);

  const openStoreModal = async () => {
    await refreshStores(selectedStoreId ?? undefined);
    setIsStoreModalOpen(true);
  };

  const createStoreInline = async () => {
    const normalizedName = newStoreName.trim();

    if (!normalizedName) {
      Alert.alert('Store name required', 'Please enter a store name.');
      return;
    }

    setIsCreatingStore(true);

    try {
      const created = await storeApi.createStore({
        name: normalizedName,
        location: newStoreLocation.trim() || null,
      });

      await storeRepository.upsertFromApiStore(created);
      await refreshStores(created.id);
      setNewStoreName('');
      setNewStoreLocation('');
      Alert.alert('Store created', `${created.name} is ready to use.`);
    } catch (error) {
      Alert.alert('Could not create store', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsCreatingStore(false);
    }
  };

  const runPriceOcr = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission required', 'Camera access is required for OCR.');
        return;
      }
    }

    if (!cameraRef.current) {
      Alert.alert('Camera not ready', 'Try again in a moment.');
      return;
    }

    setOcrBusy(true);

    try {
      const snapshot = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!snapshot?.uri) {
        throw new Error('Could not capture image for OCR.');
      }

      const hasNativeOcrModule = Boolean((NativeModulesProxy as Record<string, unknown>)?.ExpoTextRecognition);
      if (!hasNativeOcrModule) {
        throw new Error(
          'OCR module is not available in this installed build. Rebuild/reinstall with: npm run ios -w @listacerta/mobile -- --device',
        );
      }

      const ocrModule = await import('expo-text-recognition');
      const lines = await ocrModule.getTextFromFrame(snapshot.uri, false);
      const extracted = extractEuroValue(lines);

      if (!extracted) {
        Alert.alert('No price found', 'Could not detect a euro price. Please type it manually.');
        return;
      }

      setPriceInput(extracted);
      setIsOcrModalOpen(false);
      Alert.alert('Price detected', `Detected €${extracted}`);
    } catch (error) {
      Alert.alert('OCR failed', error instanceof Error ? error.message : 'Could not extract price.');
    } finally {
      setOcrBusy(false);
    }
  };

  const onSave = async () => {
    const parsedAmount = Number(priceInput.replace(',', '.'));

    if (!productId) {
      Alert.alert('Missing product', 'Could not resolve the selected product.');
      return;
    }

    if (!isUuid(productId)) {
      Alert.alert('Sync required', 'Please save product details first so it gets a backend ID.');
      return;
    }

    if (!selectedStoreId) {
      Alert.alert('Missing store', 'Please choose a store.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid amount greater than zero.');
      return;
    }

    const normalizedCurrency = currency.trim().toUpperCase() || 'EUR';
    const priceCents = Math.round(parsedAmount * 100);
    const capturedAt = new Date().toISOString();
    const idempotencyKey = makeIdempotencyKey(productId, selectedStoreId);
    const deviceId = await getOrCreateDeviceId();

    setSaving(true);

    try {
      const response = await priceApi.submitPrice({
        productId,
        storeId: selectedStoreId,
        priceCents,
        currency: normalizedCurrency,
        capturedAt,
        idempotencyKey,
        submittedBy: deviceId,
      });

      await priceRepository.upsertFromApiPrice(response.createdPrice);
      await priceRepository.upsertFromApiPrice(response.bestPrice);
      await syncPendingPriceSubmissions();

      Alert.alert('Price saved', 'Your submission was synced successfully.');
      router.replace({ pathname: '/(tabs)/(search)/products/[id]', params: { id: productId } });
    } catch (error) {
      const shouldQueueOffline =
        !(error instanceof ApiHttpError && error.status >= 400 && error.status < 500);

      if (shouldQueueOffline) {
        try {
          await priceRepository.queuePendingSubmission({
            idempotencyKey,
            productId,
            storeId: selectedStoreId,
            priceCents,
            currency: normalizedCurrency,
            capturedAt,
            submittedBy: deviceId,
          });

          await priceRepository.addPrice({
            productId,
            storeId: selectedStoreId,
            amountCents: priceCents,
            currency: normalizedCurrency,
            observedAt: capturedAt,
          });

          Alert.alert('Saved offline', 'Price was saved locally and will sync automatically when online.');
          router.replace({ pathname: '/(tabs)/(search)/products/[id]', params: { id: productId } });
          return;
        } catch (queueError) {
          Alert.alert(
            'Could not queue offline',
            queueError instanceof Error ? queueError.message : 'Unknown queue error',
          );
          return;
        }
      }

      Alert.alert('Could not save price', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScreenContainer scroll>
        <SectionHeader title="Add price" subtitle="Capture and submit a store price." />

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Store</Text>
          <Pressable style={styles.selector} onPress={() => void openStoreModal()}>
            <Text style={styles.selectorText}>{selectedStore?.name ?? 'Select store'}</Text>
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Price (EUR)</Text>
          <TextInput
            value={priceInput}
            onChangeText={setPriceInput}
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="e.g. 2.99"
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        <SecondaryButton label="Scan price with OCR" onPress={() => setIsOcrModalOpen(true)} />

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Currency</Text>
          <TextInput
            value={currency}
            onChangeText={setCurrency}
            style={styles.input}
            autoCapitalize="characters"
            placeholder="EUR"
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        <PrimaryButton label={saving ? 'Saving…' : 'Save price'} onPress={() => void onSave()} disabled={saving} />
      </ScreenContainer>

      <Modal
        visible={isStoreModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStoreModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose store</Text>
            {stores.length === 0 ? (
              <Text style={styles.emptyText}>No stores available locally. Connect and sync stores.</Text>
            ) : (
              stores.map((store) => (
                <Pressable
                  key={store.id}
                  style={({ pressed }) => [
                    styles.option,
                    selectedStoreId === store.id && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => {
                    setSelectedStoreId(store.id);
                    setIsStoreModalOpen(false);
                  }}
                >
                  <Text style={[styles.optionLabel, selectedStoreId === store.id && styles.optionLabelSelected]}>
                    {store.name}
                  </Text>
                </Pressable>
              ))
            )}

            <Text style={styles.fieldLabel}>Add new store</Text>
            <TextInput
              value={newStoreName}
              onChangeText={setNewStoreName}
              style={styles.input}
              placeholder="Store name"
              placeholderTextColor={theme.colors.muted}
            />
            <TextInput
              value={newStoreLocation}
              onChangeText={setNewStoreLocation}
              style={styles.input}
              placeholder="Location (optional)"
              placeholderTextColor={theme.colors.muted}
            />

            <PrimaryButton
              label={isCreatingStore ? 'Creating…' : 'Create store'}
              onPress={() => void createStoreInline()}
              disabled={isCreatingStore}
            />

            <SecondaryButton label="Close" onPress={() => setIsStoreModalOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal
        visible={isOcrModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOcrModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Scan shelf price</Text>
            <Text style={styles.emptyText}>Point the camera at a euro price.</Text>

            {cameraPermission?.granted ? (
              <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" />
            ) : (
              <SecondaryButton label="Grant camera permission" onPress={() => void requestCameraPermission()} />
            )}

            <View style={styles.modalActions}>
              <SecondaryButton label="Cancel" onPress={() => setIsOcrModalOpen(false)} />
              <PrimaryButton
                label={ocrBusy ? 'Scanning…' : 'Capture & detect'}
                onPress={() => void runPriceOcr()}
                disabled={ocrBusy}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    ...theme.typography.sectionLabel,
  },
  selector: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  selectorText: {
    ...theme.typography.body,
    fontWeight: '600',
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
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  modalTitle: {
    ...theme.typography.heading,
  },
  emptyText: {
    ...theme.typography.bodyMuted,
  },
  option: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  optionPressed: {
    opacity: 0.75,
  },
  optionLabel: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  cameraPreview: {
    height: 260,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
});
