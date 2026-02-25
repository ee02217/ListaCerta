import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiHttpError } from '../api/client';
import { healthApi, productApi } from '../api/endpoints';
import { EmptyState, PrimaryButton, ScreenContainer } from '../components';
import { productRepository } from '../repositories/ProductRepository';
import { useUiStore } from '../state/uiStore';
import { theme } from '../theme';

type LookupStatus = 'idle' | 'loading' | 'error';

export default function ScanBarcodeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isHandlingScan, setIsHandlingScan] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lastAttemptBarcode, setLastAttemptBarcode] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const setLastScannedBarcode = useUiStore((state) => state.setLastScannedBarcode);

  const runHealthCheck = async () => {
    setIsCheckingHealth(true);
    setHealthError(null);

    try {
      await healthApi.check();
      console.info('[scan] API health check succeeded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown API health error';
      console.error('[scan] API health check failed:', message);
      setHealthError(message);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    void runHealthCheck();
  }, []);

  const lookupBarcode = async (barcode: string) => {
    setIsHandlingScan(true);
    setLookupStatus('loading');
    setLookupError(null);
    setLastAttemptBarcode(barcode);

    try {
      setLastScannedBarcode(barcode);
      const remoteProduct = await productApi.fetchByBarcode(barcode);
      const product = await productRepository.upsertFromApiProduct(remoteProduct);

      setLookupStatus('idle');
      router.replace({ pathname: '/(tabs)/(search)/products/[id]', params: { id: product.id } });
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 404) {
        const localDraft = await productRepository.ensureByBarcode(barcode);
        setLookupStatus('idle');
        router.replace({ pathname: '/(tabs)/(search)/products/[id]', params: { id: localDraft.id } });
      } else {
        const message =
          error instanceof Error
            ? error.message
            : 'Could not retrieve product details from backend.';

        console.error('[scan] Product lookup failed:', message);
        setLookupError(message);
        setLookupStatus('error');
      }
    } finally {
      setTimeout(() => setIsHandlingScan(false), 750);
    }
  };

  if (!permission) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.infoText}>Loading camera permissions…</Text>
      </ScreenContainer>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Camera permission required"
          message="Allow camera access to scan barcodes."
          actionLabel="Grant access"
          onAction={() => void requestPermission()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.darkScreen} contentStyle={styles.content}>
      <View style={styles.healthRow}>
        {isCheckingHealth ? (
          <Text style={styles.healthNeutral}>Checking API…</Text>
        ) : healthError ? (
          <Pressable onPress={() => void runHealthCheck()}>
            <Text style={styles.healthError}>API offline · Tap to retry</Text>
          </Pressable>
        ) : (
          <Text style={styles.healthOk}>API online</Text>
        )}
      </View>

      <Text style={styles.title}>Point camera at a barcode</Text>

      <View style={styles.cameraFrame}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
          }}
          onBarcodeScanned={
            isHandlingScan || lookupStatus === 'loading'
              ? undefined
              : ({ data }) => {
                  void lookupBarcode(data);
                }
          }
        />

        {lookupStatus === 'loading' ? (
          <View style={styles.overlay}>
            <ActivityIndicator color={theme.colors.onPrimary} />
            <Text style={styles.overlayText}>Looking up barcode…</Text>
          </View>
        ) : null}
      </View>

      {lookupStatus === 'error' && lookupError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Lookup failed</Text>
          <Text style={styles.errorBody}>{lookupError}</Text>
          <PrimaryButton
            label="Retry"
            onPress={() => {
              if (lastAttemptBarcode) {
                void lookupBarcode(lastAttemptBarcode);
              }
            }}
          />
        </View>
      ) : null}

      <Text style={styles.footer}>Supports EAN-13, EAN-8, UPC-A, UPC-E, QR.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  darkScreen: {
    backgroundColor: theme.colors.scanBackground,
  },
  content: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.scanText,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  healthRow: {
    alignItems: 'center',
  },
  healthNeutral: {
    color: theme.colors.scanMuted,
    fontSize: 12,
  },
  healthOk: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  healthError: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
  cameraFrame: {
    flex: 1,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.scanBorder,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.overlay,
  },
  overlayText: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },
  errorCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorSurface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  errorTitle: {
    color: theme.colors.error,
    fontWeight: '700',
  },
  errorBody: {
    color: theme.colors.error,
    fontSize: 12,
  },
  footer: {
    color: theme.colors.scanMuted,
    textAlign: 'center',
    fontSize: 12,
  },
  infoText: {
    ...theme.typography.bodyMuted,
    textAlign: 'center',
  },
});
