import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyListDetailRedirect() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) {
    return <Redirect href="/(tabs)/(lists)" />;
  }

  return <Redirect href={{ pathname: '/(tabs)/(lists)/lists/[id]', params: { id } }} />;
}
