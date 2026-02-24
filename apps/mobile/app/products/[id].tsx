import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PriceWithStore, Product } from '../../src/domain/models';
import { priceRepository } from '../../src/repositories/PriceRepository';
import { productRepository } from '../../src/repositories/ProductRepository';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [prices, setPrices] = useState<PriceWithStore[]>([]);
  const [nameDraft, setNameDraft] = useState('');
  const [brandDraft, setBrandDraft] = useState('');

  const productId = useMemo(() => id ?? '', [id]);

  const load = useCallback(async () => {
    if (!productId) {
      return;
    }

    const [productData, priceData] = await Promise.all([
      productRepository.getById(productId),
      priceRepository.listByProductId(productId),
    ]);

    setProduct(productData);
    setPrices(priceData);

    if (productData) {
      setNameDraft(productData.name);
      setBrandDraft(productData.brand ?? '');
    }
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const saveProductMeta = async () => {
    if (!productId || !nameDraft.trim()) {
      return;
    }

    await productRepository.updateProductName(productId, nameDraft.trim(), brandDraft.trim() || null);
    await load();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Barcode</Text>
      <Text style={styles.value}>{product?.barcode ?? 'Unknown'}</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        value={nameDraft}
        onChangeText={setNameDraft}
        style={styles.input}
        placeholder="Product name"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Brand</Text>
      <TextInput
        value={brandDraft}
        onChangeText={setBrandDraft}
        style={styles.input}
        placeholder="Brand (optional)"
        placeholderTextColor="#888"
      />

      <Pressable style={styles.primaryButton} onPress={saveProductMeta}>
        <Text style={styles.primaryButtonLabel}>Save product</Text>
      </Pressable>

      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Local prices</Text>
        <Link href={{ pathname: '/prices/add', params: { productId } }} asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Add price</Text>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={prices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.price}>{(item.amountCents / 100).toFixed(2)} {item.currency}</Text>
            <Text style={styles.meta}>{item.storeName}</Text>
            <Text style={styles.meta}>{new Date(item.observedAt).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No prices yet for this product.</Text>}
      />
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
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  primaryButtonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    marginTop: 2,
    color: '#6b7280',
  },
  empty: {
    color: '#6b7280',
    marginTop: 8,
  },
});
