import { create } from 'zustand';

type UiStore = {
  activeListId: string | null;
  scannerEnabled: boolean;
  lastScannedBarcode: string | null;
  recentSearches: string[];
  preferredStoreId: string | null;
  compactMode: boolean;
  notificationsEnabled: boolean;
  setActiveListId: (listId: string | null) => void;
  setScannerEnabled: (enabled: boolean) => void;
  setLastScannedBarcode: (barcode: string | null) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  setPreferredStoreId: (storeId: string | null) => void;
  setCompactMode: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
};

export const useUiStore = create<UiStore>((set, get) => ({
  activeListId: null,
  scannerEnabled: true,
  lastScannedBarcode: null,
  recentSearches: [],
  preferredStoreId: null,
  compactMode: false,
  notificationsEnabled: true,
  setActiveListId: (activeListId) => set({ activeListId }),
  setScannerEnabled: (scannerEnabled) => set({ scannerEnabled }),
  setLastScannedBarcode: (lastScannedBarcode) => set({ lastScannedBarcode }),
  addRecentSearch: (query) => {
    const normalized = query.trim();
    if (!normalized) {
      return;
    }

    const existing = get().recentSearches.filter((item) => item.toLowerCase() !== normalized.toLowerCase());
    set({ recentSearches: [normalized, ...existing].slice(0, 6) });
  },
  clearRecentSearches: () => set({ recentSearches: [] }),
  setPreferredStoreId: (preferredStoreId) => set({ preferredStoreId }),
  setCompactMode: (compactMode) => set({ compactMode }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
}));
