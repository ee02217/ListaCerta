import { Redirect } from 'expo-router';

export default function LegacyScanRedirect() {
  return <Redirect href="/(tabs)/(search)/scan" />;
}
