import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeModulesProxy } from 'expo-modules-core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Store as ApiStore } from '@listacerta/shared-types';
import { ApiHttpError, priceApi, storeApi } from '../../src/network/apiClient';
import { priceRepository } from '../../src/repositories/PriceRepository';
import { storeRepository } from '../../src/repositories/StoreRepository';
import { syncPendingPriceSubmissions } from '../../src/services/offlinePriceSync';

type StoreOption = {
  id: string;
  name: string;
  location: string | null;
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const DISCOUNT_HINT_REGEX = /(desconto|promo|promoc|poupe|poupa|menos|off|%|cart[aã]o|saldo)/i;
const CURRENCY_HINT_REGEX = /(€|eur|euro|\bc\b|cent)/i;

const parseLocalizedAmount = (raw: string): number | null => {
  let normalized = raw.replace(/\s+/g, '').replace(/[^\d.,]/g, '');
  if (!normalized) {
    return null;
  }

  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

const extractEuroValue = (textBlocks: string[]): string | null => {
  const candidates: Array<{ value: number; score: number }> = [];

  textBlocks.forEach((rawLine, lineIndex) => {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line) {
      return;
    }

    const hasDiscountHint = DISCOUNT_HINT_REGEX.test(line);
    const hasCurrencyHint = CURRENCY_HINT_REGEX.test(line);

    for (const match of line.matchAll(/(\d{1,4}[.,]\d{2})/g)) {
      const value = parseLocalizedAmount(match[1]);
      if (value == null) {
        continue;
      }

      let score = 100;
      if (hasCurrencyHint) score += 25;
      if (hasDiscountHint) score -= 45;
      if (lineIndex <= 1) score += 5;
      if (value <= 20) score += 8;
      if (value >= 50) score -= 15;

      candidates.push({ value, score });
    }

    // OCR fallback: detect split major/minor format like "2 99 €".
    for (const match of line.matchAll(/(\d{1,3})\s+(\d{2})\s*(?:€|eur|euro|\bc\b)?/gi)) {
      const value = Number(`${match[1]}.${match[2]}`);
      if (!Number.isFinite(value)) {
        continue;
      }

      let score = 92;
      if (hasCurrencyHint) score += 18;
      if (hasDiscountHint) score -= 45;
      if (lineIndex <= 1) score += 4;
      if (value <= 20) score += 8;

      candidates.push({ value, score });
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score || a.value - b.value);
  return candidates[0].value.toFixed(2);
};

const makeIdempotencyKey = (productId: string, storeId: string) =>
  `price_${productId}_${storeId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function AddPriceScreen() {
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
      // Fall through to local cache.
    }

    const localStores = await storeRepository.getAll();
    const normalizedLocal = localStores.map(normalizeLocalStore);
    setStores(normalizedLocal);
    applyStoreSelection(normalizedLocal, preferredStoreId);
  };

  useEffect(() => {
    const loadStores = async () => {
      await refreshStores();
    };

    void loadStores();
  }, []);

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

      const hasNativeOcrModule = Boolean(
        (NativeModulesProxy as Record<string, unknown>)?.ExpoTextRecognition,
      );

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

    setSaving(true);

    try {
      const response = await priceApi.submitPrice({
        productId,
        storeId: selectedStoreId,
        priceCents,
        currency: normalizedCurrency,
        capturedAt,
        idempotencyKey,
      });

      await priceRepository.upsertFromApiPrice(response.createdPrice);
      await priceRepository.upsertFromApiPrice(response.bestPrice);
      await syncPendingPriceSubmissions();

      const moderationNote =
        response.createdPrice.status === 'flagged'
          ? '\nNote: this price was auto-flagged as a potential outlier and may require admin approval.'
          : '';

      Alert.alert(
        'Price saved',
        `Saved ${(response.createdPrice.priceCents / 100).toFixed(2)} ${response.createdPrice.currency}.\nBest price is now ${(response.bestPrice.priceCents / 100).toFixed(2)} ${response.bestPrice.currency} at ${response.bestPrice.store?.name ?? 'store'}.${moderationNote}`,
      );

      router.replace({ pathname: '/products/[id]', params: { id: productId } });
    } catch (error) {
      const shouldQueueOffline = !(error instanceof ApiHttpError && error.status >= 400 && error.status < 500);

      if (shouldQueueOffline) {
        try {
          await priceRepository.queuePendingSubmission({
            idempotencyKey,
            productId,
            storeId: selectedStoreId,
            priceCents,
            currency: normalizedCurrency,
            capturedAt,
          });

          await priceRepository.addPrice({
            productId,
            storeId: selectedStoreId,
            amountCents: priceCents,
            currency: normalizedCurrency,
            observedAt: capturedAt,
          });

          Alert.alert(
            'Saved offline',
            'No connection right now. Price was saved locally and will sync automatically when online.',
          );
          router.replace({ pathname: '/products/[id]', params: { id: productId } });
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
    <View style={styles.container}>
      <Text style={styles.label}>Store</Text>
      <Pressable style={styles.selector} onPress={() => setIsStoreModalOpen(true)}>
        <Text style={styles.selectorText}>{selectedStore?.name ?? 'Select store'}</Text>
      </Pressable>

      <Text style={styles.label}>Price (EUR)</Text>
      <TextInput
        value={priceInput}
        onChangeText={setPriceInput}
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="e.g. 2.99"
        placeholderTextColor="#888"
      />

      <Pressable style={styles.ocrButton} onPress={() => setIsOcrModalOpen(true)}>
        <Text style={styles.ocrButtonLabel}>Scan price with OCR</Text>
      </Pressable>

      <Text style={styles.label}>Currency</Text>
      <TextInput
        value={currency}
        onChangeText={setCurrency}
        style={styles.input}
        autoCapitalize="characters"
        placeholder="EUR"
        placeholderTextColor="#888"
      />

      <Pressable style={[styles.button, saving && styles.buttonDisabled]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonLabel}>{saving ? 'Saving…' : 'Save price'}</Text>
      </Pressable>

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
              <Text style={styles.emptyHint}>No stores available. Add stores in admin portal first.</Text>
            ) : (
              stores.map((store) => (
                <Pressable
                  key={store.id}
                  style={[
                    styles.storeOption,
                    selectedStoreId === store.id && styles.storeOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedStoreId(store.id);
                    setIsStoreModalOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.storeOptionLabel,
                      selectedStoreId === store.id && styles.storeOptionLabelSelected,
                    ]}
                  >
                    {store.name}
                  </Text>
                </Pressable>
              ))
            )}

            <View style={styles.inlineCreateSection}>
              <Text style={styles.inlineCreateTitle}>Add new store</Text>
              <TextInput
                value={newStoreName}
                onChangeText={setNewStoreName}
                style={styles.input}
                placeholder="Store name"
                placeholderTextColor="#888"
              />
              <TextInput
                value={newStoreLocation}
                onChangeText={setNewStoreLocation}
                style={styles.input}
                placeholder="Location (optional)"
                placeholderTextColor="#888"
              />

              <Pressable
                style={[styles.secondaryActionButton, isCreatingStore && styles.buttonDisabled]}
                onPress={createStoreInline}
                disabled={isCreatingStore}
              >
                <Text style={styles.secondaryActionButtonLabel}>
                  {isCreatingStore ? 'Creating…' : 'Create store'}
                </Text>
              </Pressable>
            </View>

            <Pressable style={styles.ghostButton} onPress={() => setIsStoreModalOpen(false)}>
              <Text style={styles.ghostButtonLabel}>Close</Text>
            </Pressable>
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
          <View style={styles.ocrCard}>
            <Text style={styles.modalTitle}>Scan shelf price</Text>
            <Text style={styles.emptyHint}>Point the camera at price in euros (e.g. €2.99).</Text>

            {cameraPermission?.granted ? (
              <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" />
            ) : (
              <Pressable style={styles.ghostButton} onPress={() => void requestCameraPermission()}>
                <Text style={styles.ghostButtonLabel}>Grant camera permission</Text>
              </Pressable>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.ghostButton} onPress={() => setIsOcrModalOpen(false)}>
                <Text style={styles.ghostButtonLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.button, ocrBusy && styles.buttonDisabled]}
                onPress={runPriceOcr}
                disabled={ocrBusy}
              >
                <Text style={styles.buttonLabel}>{ocrBusy ? 'Scanning…' : 'Capture & detect'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 16,
    gap: 10,
  },
  label: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  selector: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  ocrButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    paddingVertical: 10,
  },
  ocrButtonLabel: {
    color: '#075985',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  ocrCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyHint: {
    color: '#6b7280',
  },
  inlineCreateSection: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  inlineCreateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  secondaryActionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryActionButtonLabel: {
    color: '#075985',
    fontWeight: '700',
  },
  storeOption: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  storeOptionSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  storeOptionLabel: {
    color: '#111827',
    fontWeight: '600',
  },
  storeOptionLabelSelected: {
    color: '#166534',
  },
  ghostButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostButtonLabel: {
    color: '#334155',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cameraPreview: {
    height: 260,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
