import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiHttpError, productApi } from '../src/network/apiClient';
import { productRepository } from '../src/repositories/ProductRepository';
import { useUiStore } from '../src/state/uiStore';

export default function ScanBarcodeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isHandlingScan, setIsHandlingScan] = useState(false);
  const setLastScannedBarcode = useUiStore((state) => state.setLastScannedBarcode);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Loading camera permissions…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Camera access is required to scan barcodes.</Text>
        <Pressable style={styles.button} onPress={() => void requestPermission()}>
          <Text style={styles.buttonLabel}>Grant camera access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Point camera at a barcode</Text>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
        }}
        onBarcodeScanned={
          isHandlingScan
            ? undefined
            : async ({ data }) => {
                try {
                  setIsHandlingScan(true);
                  setLastScannedBarcode(data);

                  // Always go through backend (mobile never calls OpenFoodFacts directly).
                  const remoteProduct = await productApi.fetchByBarcode(data);
                  const product = await productRepository.upsertFromApiProduct(remoteProduct);

                  router.replace({ pathname: '/products/[id]', params: { id: product.id } });
                } catch (error) {
                  if (error instanceof ApiHttpError && error.status === 404) {
                    const localDraft = await productRepository.ensureByBarcode(data);
                    router.replace({ pathname: '/products/[id]', params: { id: localDraft.id } });
                    Alert.alert(
                      'Product not found in catalog',
                      'This barcode is not in local DB or OpenFoodFacts yet. You can fill product details manually.',
                    );
                  } else {
                    Alert.alert(
                      'Product lookup failed',
                      error instanceof Error
                        ? error.message
                        : 'Could not retrieve product details from backend.',
                    );
                  }
                } finally {
                  setTimeout(() => setIsHandlingScan(false), 750);
                }
              }
        }
      />
      <Text style={styles.footer}>Supported: EAN-13, EAN-8, UPC-A, UPC-E, QR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  camera: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  hint: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  info: {
    textAlign: 'center',
  },
  footer: {
    color: '#cbd5e1',
    textAlign: 'center',
  },
  button: {
    borderRadius: 10,
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
});
