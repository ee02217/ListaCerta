import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type {
  PriceAggregation,
  PriceByStoreSummary,
  PriceWithRelations,
  Product as ApiProduct,
} from '@listacerta/shared-types';
import { List, PriceWithStore, Product } from '../../src/domain/models';
import { ApiHttpError, priceApi, productApi } from '../../src/network/apiClient';
import { listRepository } from '../../src/repositories/ListRepository';
import { priceRepository } from '../../src/repositories/PriceRepository';
import { productRepository } from '../../src/repositories/ProductRepository';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

    if (isUuid(productId)) {
      try {
        const [aggregation, history] = await Promise.all([
          priceApi.fetchBestPrice(productId),
          priceApi.fetchHistory(productId),
        ]);

        setBestOverall(aggregation.bestOverall);
        setGroupedByStore(aggregation.groupedByStore);
        setPriceHistory(history);

        for (const historyEntry of history) {
          await priceRepository.upsertFromApiPrice(historyEntry);
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
    }, [load]),
  );

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const saveProductMeta = async () => {
    if (!productId || !nameDraft.trim() || !product?.barcode) {
      return;
    }

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
            barcode: product.barcode,
            name: nameDraft.trim(),
            brand: brandDraft.trim() || null,
            source: 'manual',
          });
        } catch (error) {
          if (error instanceof ApiHttpError && error.status === 409) {
            apiProduct = await productApi.fetchByBarcode(product.barcode);
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
      setSelectedListId((current) => (current && lists.some((item) => item.id === current) ? current : lists[0].id));
    } else {
      setSelectedListId(null);
    }
  };

  const openAddToListModal = async () => {
    await loadAvailableLists();
    setIsAddToListModalVisible(true);
  };

  const createListFromModal = async () => {
    const name = newListNameDraft.trim();
    if (!name) {
      return;
    }

    const created = await listRepository.createList(name);
    setNewListNameDraft('');
    await loadAvailableLists();
    setSelectedListId(created.id);
  };

  const addProductToList = async () => {
    if (!product || !selectedListId) {
      Alert.alert('No list selected', 'Pick or create a list first.');
      return;
    }

    try {
      const parsedQuantity = Number(listQuantityDraft.replace(',', '.'));
      const quantity = Number.isFinite(parsedQuantity) ? Math.max(1, Math.floor(parsedQuantity)) : 1;
      const title = product.name?.trim() || `Product ${product.barcode}`;

      await listRepository.addItem(selectedListId, title, quantity);
      setIsAddToListModalVisible(false);
      setListQuantityDraft('1');
      Alert.alert('Added to list', `${title} was added to your shopping list.`);
    } catch (error) {
      Alert.alert('Add failed', error instanceof Error ? error.message : 'Could not add to list.');
    }
  };

  const isIncomplete = !product?.name || !product?.brand;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Barcode</Text>
      <Text style={styles.value}>{product?.barcode ?? 'Unknown'}</Text>

      {isIncomplete ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Product data is incomplete. Please review and fill in missing fields.
          </Text>
        </View>
      ) : null}

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

      <Pressable
        style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
        onPress={saveProductMeta}
        disabled={isSaving}
      >
        <Text style={styles.primaryButtonLabel}>{isSaving ? 'Saving…' : 'Save product'}</Text>
      </Pressable>

      <Pressable style={styles.addToListButton} onPress={openAddToListModal}>
        <Text style={styles.addToListButtonLabel}>Add product to list</Text>
      </Pressable>

      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Prices</Text>
        <Link href={{ pathname: '/prices/add', params: { productId } }} asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Add price</Text>
          </Pressable>
        </Link>
      </View>

      {bestOverall ? (
        <View style={styles.bestPriceCard}>
          <Text style={styles.bestPriceLabel}>Best price</Text>
          <Text style={styles.bestPriceValue}>
            {(bestOverall.priceCents / 100).toFixed(2)} {bestOverall.currency}
          </Text>
          <Text style={styles.meta}>at {bestOverall.store?.name ?? 'Unknown store'}</Text>
        </View>
      ) : null}

      <View style={styles.pricesSection}>
        <Text style={styles.subsectionTitle}>Lowest active by store</Text>
        {groupedByStore.length === 0 ? (
          <Text style={styles.empty}>No backend prices yet.</Text>
        ) : (
          groupedByStore.map((entry) => (
            <View key={entry.store.id} style={styles.card}>
              <Text style={styles.cardTitleSmall}>{entry.store.name}</Text>
              <Text style={styles.price}>
                {(entry.bestPrice.priceCents / 100).toFixed(2)} {entry.bestPrice.currency}
              </Text>
              <Text style={styles.meta}>{new Date(entry.bestPrice.capturedAt).toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.pricesSection}>
        <Text style={styles.subsectionTitle}>Price history</Text>
        {(priceHistory.length > 0 ? priceHistory : []).slice(0, 20).map((entry) => (
          <View key={entry.id} style={styles.card}>
            <Text style={styles.price}>
              {(entry.priceCents / 100).toFixed(2)} {entry.currency}
            </Text>
            <Text style={styles.meta}>{entry.store?.name ?? 'Unknown store'}</Text>
            <Text style={styles.meta}>{new Date(entry.capturedAt).toLocaleString()}</Text>
          </View>
        ))}

        {priceHistory.length === 0 && prices.length > 0
          ? prices.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.price}>
                  {(item.amountCents / 100).toFixed(2)} {item.currency}
                </Text>
                <Text style={styles.meta}>{item.storeName}</Text>
                <Text style={styles.meta}>{new Date(item.observedAt).toLocaleString()}</Text>
              </View>
            ))
          : null}

        {priceHistory.length === 0 && prices.length === 0 ? (
          <Text style={styles.empty}>No prices yet for this product.</Text>
        ) : null}
      </View>

      <Modal
        visible={isAddToListModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddToListModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to shopping list</Text>

            <Text style={styles.modalLabel}>Select list</Text>
            <View style={styles.listPicker}>
              {availableLists.length === 0 ? (
                <Text style={styles.emptyInline}>No lists yet. Create one below.</Text>
              ) : (
                availableLists.map((list) => (
                  <Pressable
                    key={list.id}
                    style={[
                      styles.listOption,
                      selectedListId === list.id && styles.listOptionSelected,
                    ]}
                    onPress={() => setSelectedListId(list.id)}
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

            <Text style={styles.modalLabel}>Quantity</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={listQuantityDraft}
              onChangeText={setListQuantityDraft}
              placeholder="1"
              placeholderTextColor="#888"
            />

            <Text style={styles.modalLabel}>Create list (optional)</Text>
            <View style={styles.inlineRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newListNameDraft}
                onChangeText={setNewListNameDraft}
                placeholder="e.g. Weekly groceries"
                placeholderTextColor="#888"
              />
              <Pressable style={styles.ghostButton} onPress={createListFromModal}>
                <Text style={styles.ghostButtonLabel}>Create</Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.ghostButton}
                onPress={() => setIsAddToListModalVisible(false)}
              >
                <Text style={styles.ghostButtonLabel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalPrimaryButton} onPress={addProductToList}>
                <Text style={styles.primaryButtonLabel}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  warningBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  warningText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  addToListButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    alignItems: 'center',
  },
  addToListButtonLabel: {
    color: '#166534',
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
  bestPriceCard: {
    backgroundColor: '#ecfeff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#67e8f9',
    padding: 12,
  },
  bestPriceLabel: {
    color: '#0c4a6e',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bestPriceValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  pricesSection: {
    gap: 8,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
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
  cardTitleSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    marginTop: 2,
    color: '#6b7280',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  listPicker: {
    gap: 8,
  },
  listOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  listOptionSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  listOptionLabel: {
    fontWeight: '600',
    color: '#111827',
  },
  listOptionLabelSelected: {
    color: '#166534',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  modalActions: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  ghostButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  ghostButtonLabel: {
    fontWeight: '700',
    color: '#334155',
  },
  modalPrimaryButton: {
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  emptyInline: {
    color: '#6b7280',
  },
  empty: {
    color: '#6b7280',
    marginTop: 8,
  },
});
