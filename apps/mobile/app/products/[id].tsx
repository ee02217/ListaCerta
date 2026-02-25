import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyProductDetailRedirect() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) {
    return <Redirect href="/(tabs)/(search)" />;
  }

  return <Redirect href={{ pathname: '/(tabs)/(search)/products/[id]', params: { id } }} />;
}
