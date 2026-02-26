import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { ApiHttpError, ApiNetworkError, ApiTimeoutError } from '../api/client';
import { productApi } from '../api/endpoints';
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
} from '../components';
import type { List, ListItem, Product } from '../domain/models';
import { listRepository } from '../repositories/ListRepository';
import { priceRepository } from '../repositories/PriceRepository';
import { productRepository } from '../repositories/ProductRepository';
import { theme } from '../theme';

type ProductSearchResult = Product & {
  bestPriceLabel?: string;
};

const SEARCH_DEBOUNCE_MS = 300;

const formatBestPrice = (best: { priceCents: number; currency: string } | undefined) =>
  best ? `${(best.priceCents / 100).toFixed(2)} ${best.currency}` : undefined;

export default function ListDetailScreen() {
  const { id, q } = useLocalSearchParams<{ id: string; q?: string }>();
  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createBrand, setCreateBrand] = useState('');
  const [createCategory, setCreateCategory] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);

  const listId = useMemo(() => id ?? '', [id]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const openSwipeItemIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!listId) {
      return;
    }

    const [listData, itemData] = await Promise.all([
      listRepository.getListById(listId),
      listRepository.getItemsForList(listId),
    ]);

    setList(listData);
    setItems(itemData);
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      void load();

      return () => {
        abortRef.current?.abort();
      };
    }, [load]),
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (typeof q === 'string' && q.trim()) {
      setSearchQuery(q.trim());
      setSearchFocused(true);
    }
  }, [q]);

  const closeDropdown = useCallback(() => {
    setSearchFocused(false);
    setSearchError(null);
    setSearchLoading(false);
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const attachBestPrices = useCallback(async (products: Product[]) => {
    const bestByProductId = await priceRepository.getBestKnownPriceByProductIds(
      products.map((product) => product.id),
    );

    return products.map((product) => ({
      ...product,
      bestPriceLabel: formatBestPrice(bestByProductId[product.id]),
    }));
  }, []);

  const performSearch = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      if (!query) {
        setSearchResults([]);
        setSearchError(null);
        setSearchLoading(false);
        setOfflineMode(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearchLoading(true);
      setSearchError(null);

      try {
        const remoteProducts = await productApi.search(query, 12, { signal: controller.signal });

        for (const product of remoteProducts) {
          await productRepository.upsertFromApiProduct(product);
        }

        const withPrice = await attachBestPrices(remoteProducts);
        setSearchResults(withPrice);
        setOfflineMode(false);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const isNetworkError = error instanceof ApiNetworkError || error instanceof ApiTimeoutError;

        if (isNetworkError) {
          const localProducts = await productRepository.searchLocal(query, 12);
          const withPrice = await attachBestPrices(localProducts);
          setSearchResults(withPrice);
          setOfflineMode(true);
          setSearchError(null);
        } else if (error instanceof ApiHttpError) {
          setSearchResults([]);
          setSearchError(error.message);
        } else {
          setSearchResults([]);
          setSearchError(error instanceof Error ? error.message : 'Search failed');
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    },
    [attachBestPrices],
  );

  useEffect(() => {
    if (!searchFocused) {
      return;
    }

    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void performSearch(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [performSearch, searchFocused, searchQuery]);

  const addProductToList = useCallback(
    async (product: Product) => {
      if (!listId) {
        return;
      }

      await listRepository.addItem(listId, product.name, 1);
      await load();
      setSearchQuery('');
      setSearchResults([]);
      closeDropdown();
      Keyboard.dismiss();
    },
    [closeDropdown, listId, load],
  );

  const openCreateModal = useCallback(() => {
    const initialName = searchQuery.trim();
    setCreateName(initialName);
    setCreateBrand('');
    setCreateCategory('');
    setCreateError(null);
    setCreateModalOpen(true);
  }, [searchQuery]);

  const closeCreateModal = useCallback(() => {
    Keyboard.dismiss();
    setCreateModalOpen(false);
  }, []);

  const createProductAndAdd = useCallback(async () => {
    const normalizedName = createName.trim();
    const normalizedBrand = createBrand.trim();
    const normalizedCategory = createCategory.trim();

    if (!normalizedName) {
      setCreateError('Product name is required.');
      return;
    }

    Keyboard.dismiss();
    setCreateSaving(true);
    setCreateError(null);

    try {
      const existingLocal = await productRepository.findByNameAndBrand(
        normalizedName,
        normalizedBrand || null,
      );

      if (existingLocal) {
        await addProductToList(existingLocal);
        closeCreateModal();
        return;
      }

      const created = await productApi.createManualProduct({
        barcode: null,
        name: normalizedName,
        brand: normalizedBrand || null,
        category: normalizedCategory || null,
        source: 'manual',
      });

      const cached = await productRepository.upsertFromApiProduct(created);
      await addProductToList(cached);
      closeCreateModal();
    } catch (error) {
      if (error instanceof ApiNetworkError || error instanceof ApiTimeoutError) {
        setCreateError('You are offline. Connect to the internet to create new products.');
      } else {
        setCreateError(error instanceof Error ? error.message : 'Could not create product.');
      }
    } finally {
      setCreateSaving(false);
    }
  }, [addProductToList, closeCreateModal, createBrand, createCategory, createName]);

  const toggleDone = useCallback(async (itemId: string) => {
    await listRepository.toggleItemDone(itemId);
    await load();
  }, [load]);

  const updateQuantity = useCallback(async (itemId: string, nextQuantity: number) => {
    await listRepository.updateItemQuantity(itemId, Math.max(1, nextQuantity));
    await load();
  }, [load]);

  const closeOpenedItemSwipe = useCallback(() => {
    const openId = openSwipeItemIdRef.current;
    if (openId) {
      swipeableRefs.current[openId]?.close();
      openSwipeItemIdRef.current = null;
    }
  }, []);

  const deleteItemFromList = useCallback(
    async (itemId: string) => {
      closeOpenedItemSwipe();
      await listRepository.deleteItem(itemId);
      await load();
    },
    [closeOpenedItemSwipe, load],
  );

  const searchDropdownVisible = searchFocused && Boolean(searchQuery.trim());

  const renderListItem = useCallback(
    ({ item }: { item: ListItem }) => (
      <View style={styles.itemSwipeRow}>
        <Swipeable
          ref={(ref: Swipeable | null) => {
            swipeableRefs.current[item.id] = ref;
          }}
          friction={2}
          rightThreshold={28}
          overshootRight={false}
          renderRightActions={() => (
            <Pressable
              style={({ pressed }) => [styles.itemDeleteAction, pressed && styles.itemDeleteActionPressed]}
              onPress={() => void deleteItemFromList(item.id)}
            >
              <Text style={styles.itemDeleteActionText}>Delete</Text>
            </Pressable>
          )}
          onSwipeableWillOpen={() => {
            const currentOpen = openSwipeItemIdRef.current;
            if (currentOpen && currentOpen !== item.id) {
              swipeableRefs.current[currentOpen]?.close();
            }
            openSwipeItemIdRef.current = item.id;
          }}
          onSwipeableWillClose={() => {
            if (openSwipeItemIdRef.current === item.id) {
              openSwipeItemIdRef.current = null;
            }
          }}
        >
          <View style={styles.itemRow}>
            <Pressable onPress={() => void toggleDone(item.id)} style={styles.checkboxTouchable}>
              <View style={[styles.checkbox, item.done && styles.checkboxDone]} />
            </Pressable>

            <View style={styles.itemTextWrap}>
              <Text style={[styles.itemTitle, item.done && styles.itemTitleDone]}>{item.title}</Text>
              <Text style={styles.itemMeta}>{item.done ? 'Purchased' : 'Pending'}</Text>
            </View>

            <View style={styles.qtyControls}>
              <Pressable
                style={({ pressed }) => [styles.qtyButton, pressed && styles.qtyButtonPressed]}
                onPress={() => void updateQuantity(item.id, item.quantity - 1)}
              >
                <Text style={styles.qtyLabel}>−</Text>
              </Pressable>
              <Text style={styles.qtyValue}>{item.quantity}</Text>
              <Pressable
                style={({ pressed }) => [styles.qtyButton, pressed && styles.qtyButtonPressed]}
                onPress={() => void updateQuantity(item.id, item.quantity + 1)}
              >
                <Text style={styles.qtyLabel}>+</Text>
              </Pressable>
            </View>
          </View>
        </Swipeable>
      </View>
    ),
    [deleteItemFromList, toggleDone, updateQuantity],
  );

  return (
    <>
      <ScreenContainer>
        <SectionHeader
          title={list?.name ?? 'List'}
          subtitle={`${items.length} item${items.length === 1 ? '' : 's'}`}
        />

        <View style={styles.searchSection}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={16} color={theme.colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              style={styles.searchInput}
              placeholder="Add product…"
              placeholderTextColor={theme.colors.muted}
              returnKeyType="search"
            />
          </View>

          {offlineMode ? (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineText}>Offline mode</Text>
            </View>
          ) : null}

          {searchDropdownVisible ? (
            <View
              style={[
                styles.dropdownCard,
                offlineMode ? styles.dropdownCardWithBanner : styles.dropdownCardWithoutBanner,
              ]}
            >
              {searchLoading ? <LoadingState message="Searching products…" /> : null}

              {searchError && !searchLoading ? (
                <View style={styles.searchStateCard}>
                  <Text style={styles.searchStateTitle}>Search failed</Text>
                  <Text style={styles.searchStateText}>{searchError}</Text>
                  <SecondaryButton label="Retry" onPress={() => void performSearch(searchQuery)} />
                </View>
              ) : null}

              {!searchLoading && !searchError ? (
                <>
                  {searchResults.length > 0 ? (
                    searchResults.map((product) => (
                      <Pressable
                        key={product.id}
                        style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
                        onPress={() => void addProductToList(product)}
                      >
                        <View style={styles.resultImageWrap}>
                          {product.imageUrl ? (
                            <Image source={{ uri: product.imageUrl }} style={styles.resultImage} />
                          ) : (
                            <Ionicons name="image-outline" size={16} color={theme.colors.muted} />
                          )}
                        </View>

                        <View style={styles.resultTextWrap}>
                          <Text style={styles.resultTitle}>{product.name}</Text>
                          <Text style={styles.resultMeta}>{product.brand ?? 'Unknown brand'}</Text>
                        </View>
                        <Text style={styles.resultPrice}>{product.bestPriceLabel ?? '—'}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <View style={styles.searchStateCard}>
                      <Text style={styles.searchStateTitle}>No products found</Text>
                      <Text style={styles.searchStateText}>Try another term or create one below.</Text>
                    </View>
                  )}

                  <Pressable
                    style={({ pressed }) => [styles.createNewRow, pressed && styles.resultRowPressed]}
                    onPress={openCreateModal}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.createNewText}>Create new product</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.itemsContent}
          keyboardShouldPersistTaps="handled"
          onTouchStart={() => {
            Keyboard.dismiss();
            closeDropdown();
            closeOpenedItemSwipe();
          }}
          onScrollBeginDrag={() => {
            Keyboard.dismiss();
            closeDropdown();
            closeOpenedItemSwipe();
          }}
          renderItem={renderListItem}
          ListEmptyComponent={
            <EmptyState title="No items yet" message="Search products to start filling this list." />
          }
        />
      </ScreenContainer>

      <Modal
        visible={createModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCreateModal}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => Keyboard.dismiss()}>
            <Pressable style={styles.modalCard} onPress={() => undefined}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
                <Text style={styles.modalTitle}>Create new product</Text>

                <Text style={styles.fieldLabel}>Name *</Text>
                <TextInput
                  value={createName}
                  onChangeText={setCreateName}
                  style={styles.input}
                  placeholder="Product name"
                  placeholderTextColor={theme.colors.muted}
                  autoFocus
                />

                <Text style={styles.fieldLabel}>Brand</Text>
                <TextInput
                  value={createBrand}
                  onChangeText={setCreateBrand}
                  style={styles.input}
                  placeholder="Brand"
                  placeholderTextColor={theme.colors.muted}
                />

                <Text style={styles.fieldLabel}>Category</Text>
                <TextInput
                  value={createCategory}
                  onChangeText={setCreateCategory}
                  style={styles.input}
                  placeholder="Category"
                  placeholderTextColor={theme.colors.muted}
                />

                {createError ? <Text style={styles.errorText}>{createError}</Text> : null}

                <View style={styles.modalActions}>
                  <SecondaryButton label="Cancel" onPress={closeCreateModal} />
                  <PrimaryButton
                    label={createSaving ? 'Saving…' : 'Save'}
                    onPress={() => void createProductAndAdd()}
                    disabled={createSaving}
                  />
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  searchSection: {
    position: 'relative',
    zIndex: 20,
    gap: theme.spacing.sm,
  },
  searchInputWrap: {
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
  offlineBanner: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningSurface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  offlineText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontWeight: '700',
  },
  dropdownCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
    zIndex: 30,
    ...theme.shadows.card,
  },
  dropdownCardWithoutBanner: {
    top: 56,
  },
  dropdownCardWithBanner: {
    top: 92,
  },
  searchStateCard: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  searchStateTitle: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  searchStateText: {
    ...theme.typography.bodyMuted,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  resultRowPressed: {
    opacity: 0.75,
  },
  resultImageWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
  },
  resultImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultTextWrap: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  resultMeta: {
    ...theme.typography.caption,
  },
  resultPrice: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.success,
  },
  createNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
    paddingVertical: theme.spacing.sm,
  },
  createNewText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  itemsContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  itemSwipeRow: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  itemDeleteAction: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.destructive,
    backgroundColor: theme.colors.destructiveSurface,
  },
  itemDeleteActionPressed: {
    opacity: 0.72,
  },
  itemDeleteActionText: {
    ...theme.typography.button,
    color: theme.colors.destructive,
    fontSize: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  checkboxTouchable: {
    padding: theme.spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.muted,
    backgroundColor: theme.colors.surface,
  },
  checkboxDone: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  itemTextWrap: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  itemTitleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.muted,
  },
  itemMeta: {
    ...theme.typography.caption,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  qtyButtonPressed: {
    opacity: 0.75,
  },
  qtyLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  qtyValue: {
    minWidth: 20,
    textAlign: 'center',
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.modalOverlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    maxHeight: '84%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  modalScrollContent: {
    gap: theme.spacing.sm,
  },
  modalTitle: {
    ...theme.typography.heading,
  },
  fieldLabel: {
    ...theme.typography.sectionLabel,
  },
  input: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
});
