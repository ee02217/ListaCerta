import Constants from 'expo-constants';

const inferApiBaseUrlFromExpoHost = (): string => {
  const expoHostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ||
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost ||
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ||
    '';

  const host = typeof expoHostUri === 'string' ? expoHostUri.split(':')[0] : '';

  if (!host) {
    return 'http://localhost:3001';
  }

  return `http://${host}:3001`;
};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || inferApiBaseUrlFromExpoHost();
