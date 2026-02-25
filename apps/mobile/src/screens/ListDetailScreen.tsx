import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState, PrimaryButton, ScreenContainer, SectionHeader } from '../components';
import type { List, ListItem } from '../domain/models';
import { listRepository } from '../repositories/ListRepository';
import { theme } from '../theme';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [newItem, setNewItem] = useState('');

  const listId = useMemo(() => id ?? '', [id]);

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
    }, [load]),
  );

  const addItem = async () => {
    const title = newItem.trim();
    if (!title || !listId) {
      return;
    }

    await listRepository.addItem(listId, title);
    setNewItem('');
    await load();
  };

  const toggleDone = async (itemId: string) => {
    await listRepository.toggleItemDone(itemId);
    await load();
  };

  const updateQuantity = async (itemId: string, nextQuantity: number) => {
    await listRepository.updateItemQuantity(itemId, Math.max(1, nextQuantity));
    await load();
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title={list?.name ?? 'List'}
        subtitle={`${items.length} item${items.length === 1 ? '' : 's'}`}
      />

      <View style={styles.addRow}>
        <TextInput
          value={newItem}
          onChangeText={setNewItem}
          style={styles.input}
          placeholder="Add item"
          placeholderTextColor={theme.colors.muted}
        />
        <PrimaryButton label="Add" onPress={() => void addItem()} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.itemsContent}
        renderItem={({ item }) => (
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
        )}
        ListEmptyComponent={
          <EmptyState title="No items yet" message="Add your first item to this list." />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
  },
  itemsContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
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
});
