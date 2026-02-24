import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { priceRepository } from '../../src/repositories/PriceRepository';
import { storeRepository } from '../../src/repositories/StoreRepository';

export default function AddPriceScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();

  const [storeName, setStoreName] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const cleanStore = storeName.trim();
    const parsedAmount = Number(priceInput.replace(',', '.'));

    if (!productId) {
      Alert.alert('Missing product', 'Could not resolve the selected product.');
      return;
    }

    if (!cleanStore) {
      Alert.alert('Missing store', 'Please enter a store name.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid amount greater than zero.');
      return;
    }

    setSaving(true);

    try {
      const store = await storeRepository.ensureByName(cleanStore);

      await priceRepository.addPrice({
        productId,
        storeId: store.id,
        amountCents: Math.round(parsedAmount * 100),
        currency: currency.trim().toUpperCase() || 'EUR',
      });

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
      <TextInput
        value={storeName}
        onChangeText={setStoreName}
        style={styles.input}
        placeholder="e.g. Continente"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Price</Text>
      <TextInput
        value={priceInput}
        onChangeText={setPriceInput}
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="e.g. 2.99"
        placeholderTextColor="#888"
      />

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
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
});
