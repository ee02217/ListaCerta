import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {
  Card,
  EmptyState,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
} from '../components';
import type { List } from '../domain/models';
import { listRepository } from '../repositories/ListRepository';
import { useUiStore } from '../state/uiStore';
import { theme } from '../theme';

const SNACKBAR_DURATION_MS = 2200;
const ACTION_WIDTH = 92;
const ACTION_GAP = 8;
const ACTION_CONTAINER_WIDTH = ACTION_WIDTH * 2 + ACTION_GAP;
const OPEN_X = -ACTION_CONTAINER_WIDTH;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 245,
  mass: 0.64,
  overshootClamping: true,
  restDisplacementThreshold: 0.15,
  restSpeedThreshold: 0.15,
};

type SwipeListCardProps = {
  item: List;
  isOpen: boolean;
  onOpen: (listId: string) => void;
  onClose: () => void;
  onOpenList: (list: List) => void;
  onEdit: (list: List) => void;
  onDelete: (list: List) => void;
};

const SwipeListCard = memo(function SwipeListCard({
  item,
  isOpen,
  onOpen,
  onClose,
  onOpenList,
  onEdit,
  onDelete,
}: SwipeListCardProps) {
  const translateX = useSharedValue(isOpen ? OPEN_X : 0);
  const dragStartX = useSharedValue(0);
  const isPanning = useSharedValue(false);

  const triggerHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  useEffect(() => {
    const target = isOpen ? OPEN_X : 0;
    translateX.value = withSpring(target, SPRING_CONFIG);
  }, [isOpen, translateX]);

  const rowAnimatedStyle = useAnimatedStyle(() => {
    const shadow = interpolate(Math.abs(translateX.value), [0, Math.abs(OPEN_X)], [0.07, 0.14], Extrapolation.CLAMP);

    return {
      transform: [{ translateX: translateX.value }],
      shadowOpacity: shadow,
      elevation: interpolate(Math.abs(translateX.value), [0, Math.abs(OPEN_X)], [2, 5], Extrapolation.CLAMP),
    };
  });

  const actionsAnimatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(translateX.value, [0, OPEN_X], [0, 1], Extrapolation.CLAMP);

    return {
      transform: [{ translateX: interpolate(progress, [0, 1], [28, 0], Extrapolation.CLAMP) }],
      opacity: interpolate(progress, [0, 0.2, 1], [0, 0.8, 1], Extrapolation.CLAMP),
    };
  });

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-4, 4])
        .failOffsetY([-8, 8])
        .onStart(() => {
          isPanning.value = true;
          dragStartX.value = translateX.value;
        })
        .onUpdate((event) => {
          const raw = dragStartX.value + event.translationX;

          if (raw > 0) {
            translateX.value = raw * 0.18;
            return;
          }

          if (raw < OPEN_X) {
            translateX.value = OPEN_X + (raw - OPEN_X) * 0.22;
            return;
          }

          translateX.value = raw;
        })
        .onEnd((event) => {
          isPanning.value = false;

          const openByVelocity = event.velocityX < -420;
          const closeByVelocity = event.velocityX > 420;
          const openByPosition = translateX.value <= OPEN_X * 0.36;

          const shouldOpen = closeByVelocity ? false : openByVelocity || openByPosition;
          const target = shouldOpen ? OPEN_X : 0;

          translateX.value = withSpring(target, {
            ...SPRING_CONFIG,
            velocity: event.velocityX,
          });

          if (shouldOpen) {
            if (!isOpen) {
              runOnJS(triggerHaptic)();
            }
            runOnJS(onOpen)(item.id);
          } else {
            runOnJS(onClose)();
          }
        }),
    [dragStartX, isOpen, isPanning, item.id, onClose, onOpen, translateX, triggerHaptic],
  );

  const tapToCloseIfOpen = useCallback(() => {
    if (isOpen) {
      onClose();
      return;
    }

    onOpenList(item);
  }, [isOpen, item, onClose, onOpenList]);

  return (
    <View style={styles.swipeRow}>
      <Animated.View style={[styles.actionsWrap, actionsAnimatedStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
          onPress={() => onEdit(item)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.name}`}
          style={({ pressed }) => [styles.actionButton, styles.deleteButton, pressed && styles.actionPressed]}
          onPress={() => onDelete(item)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardWrap, rowAnimatedStyle]}>
          <Card style={isOpen ? styles.cardOpen : undefined}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open list ${item.name}`}
              style={({ pressed }) => [styles.listMainPressable, pressed && styles.listMainPressed]}
              onPress={tapToCloseIfOpen}
              onLongPress={() => onEdit(item)}
            >
              <Text style={styles.listTitle}>{item.name}</Text>
              <Text style={styles.listSubtitle}>{new Date(item.createdAt).toLocaleString()}</Text>
            </Pressable>
          </Card>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

export default function ListsScreen() {
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [newListName, setNewListName] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editNameDraft, setEditNameDraft] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [openSwipeListId, setOpenSwipeListId] = useState<string | null>(null);

  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeListId = useUiStore((state) => state.activeListId);
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

  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
    };
  }, []);

  const showSnackbar = (message: string) => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }

    setSnackbarMessage(message);
    snackbarTimerRef.current = setTimeout(() => {
      setSnackbarMessage(null);
      snackbarTimerRef.current = null;
    }, SNACKBAR_DURATION_MS);
  };

  const closeOpenedSwipe = useCallback(() => {
    setOpenSwipeListId(null);
  }, []);

  const createList = async () => {
    const name = newListName.trim() || `New list ${lists.length + 1}`;

    try {
      await listRepository.createList(name);
      await loadLists();
      setNewListName('');
      setCreateModalOpen(false);
      showSnackbar('List created');
    } catch (error) {
      Alert.alert('Could not create list', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const openEditModal = useCallback(
    (list: List) => {
      closeOpenedSwipe();
      setSelectedList(list);
      setEditNameDraft(list.name);
      setEditError(null);
      setEditModalOpen(true);
    },
    [closeOpenedSwipe],
  );

  const saveEditedName = async () => {
    if (!selectedList) {
      return;
    }

    const normalizedName = editNameDraft.trim();
    if (!normalizedName) {
      setEditError('List name cannot be empty.');
      return;
    }

    try {
      await listRepository.updateListName(selectedList.id, normalizedName);
      setLists((previous) =>
        previous.map((item) =>
          item.id === selectedList.id
            ? {
                ...item,
                name: normalizedName,
              }
            : item,
        ),
      );

      setSelectedList((previous) =>
        previous
          ? {
              ...previous,
              name: normalizedName,
            }
          : previous,
      );
      setEditModalOpen(false);
      showSnackbar('List renamed');
    } catch (error) {
      Alert.alert('Could not update list', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const performDelete = async (list: List) => {
    try {
      await listRepository.deleteList(list.id);
      setLists((previous) => previous.filter((item) => item.id !== list.id));
      setSelectedList(null);

      if (activeListId === list.id) {
        setActiveListId(null);
      }

      showSnackbar('List deleted');
    } catch (error) {
      Alert.alert('Could not delete list', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const requestDelete = useCallback(
    (list: List) => {
      closeOpenedSwipe();

      if (lists.length === 0) {
        return;
      }

      Alert.alert('Delete list?', 'This action cannot be undone.', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void performDelete(list);
          },
        },
      ]);
    },
    [closeOpenedSwipe, lists.length],
  );

  const openList = useCallback(
    (item: List) => {
      if (openSwipeListId) {
        closeOpenedSwipe();
        return;
      }

      setActiveListId(item.id);
      router.push({
        pathname: '/(tabs)/(lists)/lists/[id]',
        params: { id: item.id },
      });
    },
    [closeOpenedSwipe, openSwipeListId, router, setActiveListId],
  );

  return (
    <ScreenContainer>
      <SectionHeader title="Lists" subtitle="Plan and track your shopping." />

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SwipeListCard
            item={item}
            isOpen={openSwipeListId === item.id}
            onOpen={(listId) => setOpenSwipeListId(listId)}
            onClose={closeOpenedSwipe}
            onOpenList={openList}
            onEdit={openEditModal}
            onDelete={requestDelete}
          />
        )}
        onScrollBeginDrag={closeOpenedSwipe}
        onMomentumScrollBegin={closeOpenedSwipe}
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
        onPress={() => {
          closeOpenedSwipe();
          setCreateModalOpen(true);
        }}
      >
        <Ionicons name="add" size={24} color={theme.colors.onPrimary} />
      </Pressable>

      {snackbarMessage ? (
        <View style={styles.snackbarContainer} pointerEvents="none">
          <View style={styles.snackbarCard}>
            <Text style={styles.snackbarText}>{snackbarMessage}</Text>
          </View>
        </View>
      ) : null}

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

      <Modal
        visible={editModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit list name</Text>
            <TextInput
              value={editNameDraft}
              onChangeText={(value) => {
                setEditNameDraft(value);
                if (editError) {
                  setEditError(null);
                }
              }}
              style={styles.input}
              placeholder="List name"
              placeholderTextColor={theme.colors.muted}
            />
            {editError ? <Text style={styles.editError}>{editError}</Text> : null}
            <View style={styles.modalActionsRow}>
              <SecondaryButton label="Cancel" onPress={() => setEditModalOpen(false)} />
              <PrimaryButton label="Save" onPress={() => void saveEditedName()} />
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
  swipeRow: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  actionsWrap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_CONTAINER_WIDTH,
    flexDirection: 'row',
    gap: ACTION_GAP,
  },
  actionButton: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionPressed: {
    opacity: 0.72,
  },
  actionText: {
    ...theme.typography.button,
    color: theme.colors.text,
    fontSize: 14,
  },
  deleteButton: {
    borderColor: theme.colors.destructive,
    backgroundColor: theme.colors.destructiveSurface,
  },
  deleteText: {
    ...theme.typography.button,
    color: theme.colors.destructive,
    fontSize: 14,
  },
  cardWrap: {
    width: '100%',
  },
  cardOpen: {
    ...theme.shadows.floating,
  },
  listMainPressable: {
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  listMainPressed: {
    opacity: 0.75,
  },
  listTitle: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  listSubtitle: {
    ...theme.typography.caption,
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
  snackbarContainer: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: theme.spacing.xxl + 64,
    alignItems: 'center',
  },
  snackbarCard: {
    backgroundColor: theme.colors.text,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    ...theme.shadows.floating,
  },
  snackbarText: {
    ...theme.typography.caption,
    color: theme.colors.onPrimary,
    fontWeight: '700',
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
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  editError: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '700',
  },
});
