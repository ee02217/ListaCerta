# List Item Swipe Delete

## Summary

Implemented swipe-to-delete for product rows in Shopping List detail.

Users can swipe left on an item row to reveal a destructive **Delete** action. Deletion removes only the `list_items` record, animates row removal, and shows a toast with **Undo** for 3 seconds.

## UX flow

1. User swipes item row left.
2. Row reveals red Delete action (`#FF3B30`) and snaps open.
3. User taps Delete.
4. Item is removed from `list_items` in SQLite transaction.
5. Row removal animates (`LayoutAnimation`) and toast appears: **Item removed** + **Undo**.
6. If Undo tapped within 3s, item is restored (`INSERT` transaction).
7. If timeout passes, deletion is finalized.

## Swipe logic

- Uses `react-native-gesture-handler` `Swipeable`.
- `friction={1.7}`, `rightThreshold={34}`, `overshootRight={false}` for smooth iOS-like behavior.
- Only one row open at a time (tracked via `openSwipeItemIdRef`).
- Scroll/touch outside closes open swipe (`onTouchStart`, `onScrollBeginDrag`).

## DB behavior

### Delete

- Table touched: `list_items` only.
- Query: `DELETE FROM list_items WHERE id = ?;`
- Wrapped in transaction:
  - `BEGIN`
  - `DELETE`
  - `COMMIT`
  - `ROLLBACK` on error
- Product records in `products` are untouched.

### Undo restore

- Reinserts same row into `list_items`.
- Transaction protected (`BEGIN/COMMIT/ROLLBACK`).

## Edge cases handled

- Deleting last item shows list empty state.
- Fast/slow swipe works with threshold snap behavior.
- Releasing before threshold snaps closed.
- Scrolling list does not leave stale rows open.
- Duplicate open swipes prevented.

## Evidence

- Mid-swipe: `docs/screenshots/list-swipe-delete-01.png`
- Fully opened action: `docs/screenshots/list-swipe-delete-02.png`
- After delete: `docs/screenshots/list-swipe-delete-03.png`
- Empty-state after deletion: `docs/screenshots/list-swipe-delete-04.png`
- Terminal DB delete log: `docs/screenshots/list-swipe-delete-05.png`
