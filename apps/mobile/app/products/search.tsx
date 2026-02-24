import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Product } from '@listacerta/shared-types';
import { productApi } from '../../src/network/apiClient';
import { productRepository } from '../../src/repositories/ProductRepository';

export default function ProductSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (debouncedRef.current) {
      clearTimeout(debouncedRef.current);
    }

    debouncedRef.current = setTimeout(async () => {
      try {
        const data = await productApi.search(query);
        setResults(data);
        for (const product of data) {
          await productRepository.upsertFromApiProduct(product);
        }
      } catch (error) {
        Alert.alert('Search failed', error instanceof Error ? error.message : 'Could not search products.');
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debouncedRef.current) {
        clearTimeout(debouncedRef.current);
      }
    };
  }, [query]);

  const openProduct = (id: string) => {
    router.push({ pathname: '/products/[id]', params: { id } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add product</Text>
      <Text style={styles.subtitle}>Search by name or brand.</Text>

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search products..."
        placeholderTextColor="#888"
        returnKeyType="search"
      />

      {loading && <Text style={styles.status}>Searching…</Text>}
      {!loading && query.trim() && results.length === 0 && (
        <Text style={styles.status}>No matches yet. Keep typing.</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 8 }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openProduct(item.id)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.brand ?? 'Unknown brand'}</Text>
              <Text style={styles.cardMeta}>{item.barcode}</Text>
            </View>
            <Link href={`/products/${item.id}`} asChild>
              <Pressable style={styles.moreButton}>view</Pressable>
            </Link>
          </Pressable>
        )}
        ListEmptyComponent={
          !query.trim() ? (
            <Text style={styles.status}>Start typing to find products.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 12,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  status: {
    marginTop: 8,
    color: '#6b7280',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardMeta: {
    color: '#6b7280',
    fontSize: 12,
  },
  moreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
  },
});
