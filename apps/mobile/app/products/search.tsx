import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacySearchRedirect() {
  const { q } = useLocalSearchParams<{ q?: string }>();

  return <Redirect href={{ pathname: '/(tabs)/(search)', params: q ? { q } : {} }} />;
}
