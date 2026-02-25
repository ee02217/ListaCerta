import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyAddPriceRedirect() {
  const { productId } = useLocalSearchParams<{ productId?: string }>();

  if (!productId) {
    return <Redirect href="/(tabs)/(search)" />;
  }

  return <Redirect href={{ pathname: '/(tabs)/(search)/prices/add', params: { productId } }} />;
}
