import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { List } from '../src/domain/models';
import { listRepository } from '../src/repositories/ListRepository';
import { useUiStore } from '../src/state/uiStore';

export default function HomeScreen() {
  const [lists, setLists] = useState<List[]>([]);
  const [newListName, setNewListName] = useState('');
  const setActiveListId = useUiStore((state) => state.setActiveListId);

  const loadLists = useCallback(async () => {
    const data = await listRepository.getAllLists();
    setLists(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLists();
    }, [loadLists]),
  );

  const createList = async () => {
    const name = newListName.trim() || `New list ${lists.length + 1}`;
    await listRepository.createList(name);
    setNewListName('');
    await loadLists();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your lists</Text>

      <View style={styles.row}>
        <TextInput
          value={newListName}
          onChangeText={setNewListName}
          style={styles.input}
          placeholder="Create a list"
          placeholderTextColor="#888"
        />
        <Pressable onPress={createList} style={styles.primaryButton}>
          <Text style={styles.primaryButtonLabel}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Link
            href={{ pathname: '/lists/[id]', params: { id: item.id } }}
            asChild
            onPress={() => setActiveListId(item.id)}
          >
            <Pressable style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No lists yet. Add one above.</Text>}
      />

      <Link href="/scan" asChild>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonLabel}>Scan barcode</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f7f7',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 12,
    gap: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 4,
    color: '#6b7280',
  },
  empty: {
    marginTop: 18,
    color: '#6b7280',
  },
  secondaryButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
});
