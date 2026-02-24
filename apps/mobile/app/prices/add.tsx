import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeModulesProxy } from 'expo-modules-core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Store } from '@listacerta/shared-types';
import { priceApi, storeApi } from '../../src/network/apiClient';
import { priceRepository } from '../../src/repositories/PriceRepository';
import { storeRepository } from '../../src/repositories/StoreRepository';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const extractEuroValue = (textBlocks: string[]): string | null => {
  const fullText = textBlocks.join(' ').replace(/\s+/g, ' ').trim();

  const euroPatterns = [
    /€\s*(\d{1,4}(?:[.,]\d{2})?)/g,
    /(\d{1,4}(?:[.,]\d{2})?)\s*€/g,
    /(\d{1,4}[.,]\d{2})/g,
  ];

  for (const pattern of euroPatterns) {
    const match = pattern.exec(fullText);
    if (match?.[1]) {
      return match[1].replace(',', '.');
    }
  }

  return null;
};

export default function AddPriceScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [saving, setSaving] = useState(false);

  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [stores, selectedStoreId],
  );

  useEffect(() => {
    const loadStores = async () => {
      try {
        const apiStores = await storeApi.listStores();
        setStores(apiStores);

        if (apiStores.length > 0) {
          setSelectedStoreId(apiStores[0].id); // default store selected
          await storeRepository.upsertManyFromApi(apiStores);
        }
      } catch (error) {
        Alert.alert('Stores unavailable', error instanceof Error ? error.message : 'Could not load stores.');
      }
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

    setSaving(true);

    try {
      const response = await priceApi.submitPrice({
        productId,
        storeId: selectedStoreId,
        priceCents: Math.round(parsedAmount * 100),
        currency: currency.trim().toUpperCase() || 'EUR',
        capturedAt: new Date().toISOString(),
      });

      await priceRepository.upsertFromApiPrice(response.createdPrice);
      await priceRepository.upsertFromApiPrice(response.bestPrice);

      Alert.alert(
        'Price saved',
        `Saved ${(response.createdPrice.priceCents / 100).toFixed(2)} ${response.createdPrice.currency}.\nBest price is now ${(response.bestPrice.priceCents / 100).toFixed(2)} ${response.bestPrice.currency} at ${response.bestPrice.store?.name ?? 'store'}.`,
      );

      router.replace({ pathname: '/products/[id]', params: { id: productId } });
    } catch (error) {
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
