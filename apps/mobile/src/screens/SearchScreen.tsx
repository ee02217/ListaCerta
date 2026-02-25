import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { PriceAggregation, Product } from '@listacerta/shared-types';
import {
  Card,
  EmptyState,
  LoadingState,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
} from '../components';
import { getBestPrice, productApi } from '../api/endpoints';
import { useUiStore } from '../state/uiStore';
import { theme } from '../theme';

type PriceLookupMap = Record<
  string,
  {
    loading: boolean;
    value?: PriceAggregation['bestOverall'];
    error?: string;
  }
>;

export default function SearchScreen() {
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceLookup, setPriceLookup] = useState<PriceLookupMap>({});
  const debouncedRef = useRef<NodeJS.Timeout | null>(null);

  const recentSearches = useUiStore((state) => state.recentSearches);
  const addRecentSearch = useUiStore((state) => state.addRecentSearch);
  const clearRecentSearches = useUiStore((state) => state.clearRecentSearches);

  useEffect(() => {
    if (typeof q === 'string' && q.trim()) {
      setQuery(q.trim());
    }
  }, [q]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (debouncedRef.current) {
      clearTimeout(debouncedRef.current);
    }

    debouncedRef.current = setTimeout(async () => {
      try {
        const data = await productApi.search(query);
        setResults(data);
        addRecentSearch(query);
      } catch (apiError) {
        const message = apiError instanceof Error ? apiError.message : 'Could not search products.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debouncedRef.current) {
        clearTimeout(debouncedRef.current);
      }
    };
  }, [query, addRecentSearch]);

  useEffect(() => {
    if (results.length === 0) {
      return;
    }

    const topResults = results.slice(0, 8);
    topResults.forEach((product) => {
      setPriceLookup((current) => ({
        ...current,
        [product.id]: {
          ...current[product.id],
          loading: true,
        },
      }));

      void getBestPrice(product.id)
        .then((aggregation) => {
          setPriceLookup((current) => ({
            ...current,
            [product.id]: {
              loading: false,
              value: aggregation.bestOverall,
            },
          }));
        })
        .catch((reason) => {
          setPriceLookup((current) => ({
            ...current,
            [product.id]: {
              loading: false,
              error: reason instanceof Error ? reason.message : 'Could not load best price',
            },
          }));
        });
    });
  }, [results]);

  const recentItems = useMemo(
    () => recentSearches.map((item) => ({ id: item.toLowerCase(), label: item })),
    [recentSearches],
  );

  const openProduct = (id: string) => {
    router.push({ pathname: '/(tabs)/(search)/products/[id]', params: { id } });
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title="Search"
        subtitle="Find products and compare prices."
        trailing={<SecondaryButton label="Scan" onPress={() => router.push('/(tabs)/(search)/scan')} />}
      />

      <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={18} color={theme.colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by product or brand"
          placeholderTextColor={theme.colors.muted}
          returnKeyType="search"
        />
      </View>

      {!query.trim() && recentItems.length > 0 ? (
        <View style={styles.recentSection}>
          <SectionHeader
            title="Recent searches"
            trailing={<SecondaryButton label="Clear" onPress={clearRecentSearches} />}
          />
          <View style={styles.recentWrap}>
            {recentItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setQuery(item.label)}
                style={({ pressed }) => [styles.recentPill, pressed && styles.recentPillPressed]}
              >
                <Text style={styles.recentText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {isLoading ? <LoadingState message="Searching products…" /> : null}
      {error ? <EmptyState title="Search failed" message={error} actionLabel="Retry" onAction={() => setQuery(query)} /> : null}

      {!isLoading && !error ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsContent}
          renderItem={({ item }) => {
            const priceState = priceLookup[item.id];
            return (
              <Card onPress={() => openProduct(item.id)} style={styles.productCard}>
                <View style={styles.productRow}>
                  <View style={styles.imageWrap}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.image} />
                    ) : (
                      <Ionicons name="image-outline" size={18} color={theme.colors.muted} />
                    )}
                  </View>

                  <View style={styles.productBody}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.productMeta}>{item.brand ?? 'Unknown brand'}</Text>
                    <Text style={styles.productMeta}>{item.barcode}</Text>
                  </View>

                  <View style={styles.priceWrap}>
                    {priceState?.loading ? (
                      <Text style={styles.priceMuted}>Loading…</Text>
                    ) : priceState?.value ? (
                      <Text style={styles.priceValue}>{(priceState.value.priceCents / 100).toFixed(2)}€</Text>
                    ) : (
                      <Text style={styles.priceMuted}>No price</Text>
                    )}
                  </View>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            query.trim() ? (
              <EmptyState
                title="No products found"
                message="Try another keyword or brand name."
              />
            ) : null
          }
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.shadows.card,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    paddingVertical: theme.spacing.xs,
  },
  recentSection: {
    gap: theme.spacing.sm,
  },
  recentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  recentPill: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  recentPillPressed: {
    opacity: 0.75,
  },
  recentText: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  resultsContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  productCard: {
    padding: theme.spacing.md,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  imageWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productBody: {
    flex: 1,
    gap: 2,
  },
  productName: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  productMeta: {
    ...theme.typography.caption,
  },
  priceWrap: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  priceValue: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.success,
  },
  priceMuted: {
    ...theme.typography.caption,
  },
});
