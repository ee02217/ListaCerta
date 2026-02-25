import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState, ListItemRow, PrimaryButton, ScreenContainer, SectionHeader } from '../components';
import type { List } from '../domain/models';
import { listRepository } from '../repositories/ListRepository';
import { useUiStore } from '../state/uiStore';
import { theme } from '../theme';

export default function ListsScreen() {
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [newListName, setNewListName] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
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
    setCreateModalOpen(false);
    await loadLists();
  };

  return (
    <ScreenContainer>
      <SectionHeader title="Lists" subtitle="Plan and track your shopping." />

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ListItemRow
            title={item.name}
            subtitle={new Date(item.createdAt).toLocaleString()}
            trailing={<Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />}
            onPress={() => {
              setActiveListId(item.id);
              router.push({
                pathname: '/(tabs)/(lists)/lists/[id]',
                params: { id: item.id },
              });
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No shopping lists"
            message="Create your first list and start adding items."
            actionLabel="Create list"
            onAction={() => setCreateModalOpen(true)}
          />
        }
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setCreateModalOpen(true)}
      >
        <Ionicons name="add" size={24} color={theme.colors.onPrimary} />
      </Pressable>

      <Modal
        visible={createModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New List</Text>
            <TextInput
              value={newListName}
              onChangeText={setNewListName}
              style={styles.input}
              placeholder="e.g. Weekly groceries"
              placeholderTextColor={theme.colors.muted}
            />
            <View style={styles.modalActions}>
              <PrimaryButton label="Create list" onPress={() => void createList()} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl * 3,
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.xl,
    bottom: theme.spacing.xxl,
    height: 56,
    width: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.floating,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.modalOverlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  modalTitle: {
    ...theme.typography.heading,
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
  modalActions: {
    gap: theme.spacing.sm,
  },
});
