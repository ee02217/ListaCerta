import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { List, ListItem } from '../../src/domain/models';
import { listRepository } from '../../src/repositories/ListRepository';

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{list?.name ?? 'List'}</Text>

      <View style={styles.row}>
        <TextInput
          value={newItem}
          onChangeText={setNewItem}
          style={styles.input}
          placeholder="Add item"
          placeholderTextColor="#888"
        />
        <Pressable style={styles.button} onPress={addItem}>
          <Text style={styles.buttonLabel}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <Pressable style={styles.itemRow} onPress={() => toggleDone(item.id)}>
            <View style={[styles.checkbox, item.done && styles.checkboxDone]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, item.done && styles.itemTitleDone]}>{item.title}</Text>
              <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No items yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    padding: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6b7280',
  },
  checkboxDone: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemTitleDone: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  itemMeta: {
    marginTop: 2,
    color: '#6b7280',
    fontSize: 12,
  },
  empty: {
    marginTop: 16,
    color: '#6b7280',
  },
});
