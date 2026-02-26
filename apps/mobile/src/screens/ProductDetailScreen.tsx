import { useFocusEffect, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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

import type {
  PriceByStoreSummary,
  PriceWithRelations,
  Product as ApiProduct,
} from '@listacerta/shared-types';
import { ApiHttpError } from '../api/client';
import { priceApi, productApi } from '../api/endpoints';
import {
  Card,
  EmptyState,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
} from '../components';
import type { List, PriceWithStore, Product } from '../domain/models';
import { listRepository } from '../repositories/ListRepository';
import { priceRepository } from '../repositories/PriceRepository';
import { productRepository } from '../repositories/ProductRepository';
import { theme } from '../theme';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export default function ProductDetailScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { id, addToList, focusNewList } = useLocalSearchParams<{
    id: string;
    addToList?: string;
    focusNewList?: string;
  }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [prices, setPrices] = useState<PriceWithStore[]>([]);
  const [bestOverall, setBestOverall] = useState<PriceWithRelations | null>(null);
  const [groupedByStore, setGroupedByStore] = useState<PriceByStoreSummary[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceWithRelations[]>([]);
  const [nameDraft, setNameDraft] = useState('');
  const [brandDraft, setBrandDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [isAddToListModalVisible, setIsAddToListModalVisible] = useState(false);
  const [availableLists, setAvailableLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [listQuantityDraft, setListQuantityDraft] = useState('1');
  const [newListNameDraft, setNewListNameDraft] = useState('');

  const quantityInputRef = useRef<TextInput | null>(null);
  const lastHandledAddToListTokenRef = useRef<string | null>(null);
  const newListInputRef = useRef<TextInput | null>(null);

  const dismissAddToListKeyboard = useCallback(() => {
    quantityInputRef.current?.blur();
    newListInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  const productId = useMemo(() => id ?? '', [id]);

  const load = useCallback(async () => {
    if (!productId) return;

    let productData = await productRepository.getById(productId);

    if (!productData && isUuid(productId)) {
      try {
        const remoteProduct = await productApi.fetchById(productId);
        productData = await productRepository.upsertFromApiProduct(remoteProduct);
      } catch {
        // keep local null state when not found remotely
      }
    }

    const priceData = await priceRepository.listByProductId(productId);

    setProduct(productData);
    setPrices(priceData);

    if (productData) {
      setNameDraft(productData.name);
      setBrandDraft(productData.brand ?? '');
    }

    if (isUuid(productId)) {
      try {
        const [aggregation, history] = await Promise.all([
          priceApi.fetchBestPrice(productId),
          priceApi.fetchHistory(productId),
        ]);

        setBestOverall(aggregation.bestOverall);
        setGroupedByStore(aggregation.groupedByStore);
        setPriceHistory(history);

        for (const entry of history) {
          await priceRepository.upsertFromApiPrice(entry);
        }
      } catch (error) {
        if (error instanceof ApiHttpError && error.status === 404) {
          setBestOverall(null);
          setGroupedByStore([]);
          setPriceHistory([]);
        }
      }
    } else {
      setBestOverall(null);
      setGroupedByStore([]);
      setPriceHistory([]);
    }
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      void load();

      return () => {
        Keyboard.dismiss();
        setIsAddToListModalVisible(false);
      };
    }, [load]),
  );

  const saveProductMeta = async () => {
    if (!productId || !product || !nameDraft.trim()) return;

    const localBarcode = product.barcode?.trim() ?? '';

    setIsSaving(true);

    try {
      let apiProduct: ApiProduct;

      if (isUuid(productId)) {
        apiProduct = await productApi.updateProduct(productId, {
          name: nameDraft.trim(),
          brand: brandDraft.trim() || null,
        });
      } else {
        try {
          apiProduct = await productApi.createManualProduct({
            barcode: localBarcode || undefined,
            name: nameDraft.trim(),
            brand: brandDraft.trim() || null,
            source: 'manual',
          });
        } catch (error) {
          if (error instanceof ApiHttpError && error.status === 409 && localBarcode) {
            apiProduct = await productApi.fetchByBarcode(localBarcode);
            if (isUuid(apiProduct.id)) {
              apiProduct = await productApi.updateProduct(apiProduct.id, {
                name: nameDraft.trim(),
                brand: brandDraft.trim() || null,
              });
            }
          } else {
            throw error;
          }
        }
      }

      await productRepository.upsertFromApiProduct(apiProduct);
      await load();
      Alert.alert('Saved', 'Product updated successfully.');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Could not save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadAvailableLists = async () => {
    const lists = await listRepository.getAllLists();
    setAvailableLists(lists);
    if (lists.length > 0) {
      setSelectedListId((current) =>
        current && lists.some((list) => list.id === current) ? current : lists[0].id,
      );
    } else {
      setSelectedListId(null);
    }
  };

  const closeAddToListModal = () => {
    dismissAddToListKeyboard();
    setIsAddToListModalVisible(false);
  };

  useEffect(() => {
    if (!pathname.includes('/products/')) {
      dismissAddToListKeyboard();
      setIsAddToListModalVisible(false);
    }
  }, [dismissAddToListKeyboard, pathname]);

  const openAddToListModal = async () => {
    await loadAvailableLists();
    setIsAddToListModalVisible(true);
  };

  useEffect(() => {
    if (!addToList || !product) {
      return;
    }

    if (lastHandledAddToListTokenRef.current === addToList) {
      return;
    }

    lastHandledAddToListTokenRef.current = addToList;
    void openAddToListModal();
  }, [addToList, product]);

  useEffect(() => {
    if (!isAddToListModalVisible || focusNewList !== '1') {
      return;
    }

    const timer = setTimeout(() => {
      newListInputRef.current?.focus();
    }, 120);

    return () => clearTimeout(timer);
  }, [focusNewList, isAddToListModalVisible]);

  const createListFromModal = async () => {
    const name = newListNameDraft.trim();
    if (!name) {
      Alert.alert('List name required', 'Please enter a list name before creating.');
      return;
    }

    dismissAddToListKeyboard();

    try {
      const created = await listRepository.createList(name);
      setNewListNameDraft('');
      await loadAvailableLists();
      setSelectedListId(created.id);
      closeAddToListModal();
      Alert.alert('List created', `${created.name} is ready to use.`);
    } catch (error) {
      Alert.alert('Could not create list', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const addProductToList = async () => {
    if (!product || !selectedListId) {
      Alert.alert('No list selected', 'Pick or create a list first.');
      return;
    }

    dismissAddToListKeyboard();

    try {
      const parsed = Number(listQuantityDraft.replace(',', '.'));
      const quantity = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
      const title = product.name?.trim() || `Product ${product.barcode ?? product.id}`;

      await listRepository.addItem(selectedListId, title, quantity);
      closeAddToListModal();
      setListQuantityDraft('1');
      Alert.alert('Added to list', `${title} was added to your shopping list.`);
    } catch (error) {
      Alert.alert('Add failed', error instanceof Error ? error.message : 'Could not add to list.');
    }
  };

  if (!product) {
    return (
      <ScreenContainer>
        <EmptyState title="Product not found" message="This product is no longer available locally." />
      </ScreenContainer>
    );
  }

  const isIncomplete = !product.name || !product.brand;

  return (
    <>
      <ScreenContainer scroll>
        <SectionHeader title="Product" subtitle={product.barcode || 'Unknown barcode'} />

        <Card>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            style={styles.input}
            placeholder="Product name"
            placeholderTextColor={theme.colors.muted}
          />

          <Text style={styles.fieldLabel}>Brand</Text>
          <TextInput
            value={brandDraft}
            onChangeText={setBrandDraft}
            style={styles.input}
            placeholder="Brand (optional)"
            placeholderTextColor={theme.colors.muted}
          />

          {isIncomplete ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Product data is incomplete. Please review and fill in missing fields.
              </Text>
            </View>
          ) : null}

          <PrimaryButton label={isSaving ? 'Saving…' : 'Save product'} onPress={() => void saveProductMeta()} disabled={isSaving} />
          <SecondaryButton label="Add product to list" onPress={() => void openAddToListModal()} />
        </Card>

        <SectionHeader
          title="Prices"
          trailing={
            <SecondaryButton
              label="Add price"
              onPress={() => router.push({ pathname: '/(tabs)/(search)/prices/add', params: { productId } })}
            />
          }
        />

        {bestOverall ? (
          <Card style={styles.bestPriceCard}>
            <Text style={styles.bestLabel}>Best price</Text>
            <Text style={styles.bestValue}>
              {(bestOverall.priceCents / 100).toFixed(2)} {bestOverall.currency}
            </Text>
            <Text style={styles.meta}>at {bestOverall.store?.name ?? 'Unknown store'}</Text>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.sectionSubTitle}>Lowest active by store</Text>
          {groupedByStore.length === 0 ? (
            <Text style={styles.emptyText}>No backend prices yet.</Text>
          ) : (
            groupedByStore.map((entry) => (
              <View key={entry.store.id} style={styles.inlineCard}>
                <Text style={styles.inlineTitle}>{entry.store.name}</Text>
                <Text style={styles.inlinePrice}>
                  {(entry.bestPrice.priceCents / 100).toFixed(2)} {entry.bestPrice.currency}
                </Text>
                <Text style={styles.meta}>{new Date(entry.bestPrice.capturedAt).toLocaleString()}</Text>
              </View>
            ))
          )}
        </Card>

        <Card>
          <Text style={styles.sectionSubTitle}>Price history</Text>
          {(priceHistory.length > 0 ? priceHistory : []).slice(0, 20).map((entry) => (
            <View key={entry.id} style={styles.inlineCard}>
              <Text style={styles.inlinePrice}>
                {(entry.priceCents / 100).toFixed(2)} {entry.currency}
              </Text>
              <Text style={styles.meta}>{entry.store?.name ?? 'Unknown store'}</Text>
              <Text style={styles.meta}>{new Date(entry.capturedAt).toLocaleString()}</Text>
            </View>
          ))}

          {priceHistory.length === 0 && prices.length > 0
            ? prices.map((item) => (
                <View key={item.id} style={styles.inlineCard}>
                  <Text style={styles.inlinePrice}>
                    {(item.amountCents / 100).toFixed(2)} {item.currency}
                  </Text>
                  <Text style={styles.meta}>{item.storeName}</Text>
                  <Text style={styles.meta}>{new Date(item.observedAt).toLocaleString()}</Text>
                </View>
              ))
            : null}

          {priceHistory.length === 0 && prices.length === 0 ? (
            <Text style={styles.emptyText}>No prices yet for this product.</Text>
          ) : null}
        </Card>
      </ScreenContainer>

      <Modal
        visible={isAddToListModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAddToListModal}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={dismissAddToListKeyboard}>
            <Pressable style={styles.modalCard} onPress={dismissAddToListKeyboard}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.modalScrollContent}
                style={styles.modalScroll}
              >
                <Text style={styles.modalTitle}>Add to shopping list</Text>

                <Text style={styles.fieldLabel}>Select list</Text>
                <View style={styles.listPicker}>
                  {availableLists.length === 0 ? (
                    <Text style={styles.emptyText}>No lists yet. Create one below.</Text>
                  ) : (
                    availableLists.map((list) => (
                      <Pressable
                        key={list.id}
                        style={({ pressed }) => [
                          styles.listOption,
                          selectedListId === list.id && styles.listOptionSelected,
                          pressed && styles.optionPressed,
                        ]}
                        onPress={() => {
                          dismissAddToListKeyboard();
                          setSelectedListId(list.id);
                        }}
                      >
                        <Text
                          style={[
                            styles.listOptionLabel,
                            selectedListId === list.id && styles.listOptionLabelSelected,
                          ]}
                        >
                          {list.name}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>

                <Text style={styles.fieldLabel}>Quantity</Text>
                <TextInput
                  ref={quantityInputRef}
                  style={styles.input}
                  keyboardType="number-pad"
                  value={listQuantityDraft}
                  onChangeText={setListQuantityDraft}
                  placeholder="1"
                  placeholderTextColor={theme.colors.muted}
                />

                <Text style={styles.fieldLabel}>Create list (optional)</Text>
                <View style={styles.inlineRow}>
                  <TextInput
                    ref={newListInputRef}
                    style={[styles.input, styles.flexInput, styles.focusInput]}
                    value={newListNameDraft}
                    onChangeText={setNewListNameDraft}
                    placeholder="e.g. Weekly groceries"
                    placeholderTextColor={theme.colors.muted}
                    returnKeyType="done"
                    onSubmitEditing={() => void createListFromModal()}
                  />
                  <SecondaryButton label="Create" onPress={() => void createListFromModal()} />
                </View>

                <View style={styles.modalActions}>
                  <SecondaryButton label="Cancel" onPress={closeAddToListModal} />
                  <PrimaryButton label="Add" onPress={() => void addProductToList()} />
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
  warningBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningSurface,
    padding: theme.spacing.md,
  },
  warningText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontWeight: '700',
  },
  bestPriceCard: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  bestLabel: {
    ...theme.typography.sectionLabel,
    color: theme.colors.primary,
  },
  bestValue: {
    ...theme.typography.heading,
    fontSize: 28,
  },
  sectionSubTitle: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  inlineCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    gap: 2,
  },
  inlineTitle: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  inlinePrice: {
    ...theme.typography.body,
    fontSize: 20,
    fontWeight: '700',
  },
  meta: {
    ...theme.typography.caption,
  },
  emptyText: {
    ...theme.typography.bodyMuted,
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
  modalScroll: {
    zIndex: 2,
  },
  modalScrollContent: {
    gap: theme.spacing.sm,
  },
  modalTitle: {
    ...theme.typography.heading,
  },
  listPicker: {
    gap: theme.spacing.sm,
  },
  listOption: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  listOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  optionPressed: {
    opacity: 0.75,
  },
  listOptionLabel: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  listOptionLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  flexInput: {
    flex: 1,
  },
  focusInput: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
});
