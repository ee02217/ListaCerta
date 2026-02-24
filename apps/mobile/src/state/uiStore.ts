import { create } from 'zustand';

type UiStore = {
  activeListId: string | null;
  scannerEnabled: boolean;
  lastScannedBarcode: string | null;
  setActiveListId: (listId: string | null) => void;
  setScannerEnabled: (enabled: boolean) => void;
  setLastScannedBarcode: (barcode: string | null) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeListId: null,
  scannerEnabled: true,
  lastScannedBarcode: null,
  setActiveListId: (activeListId) => set({ activeListId }),
  setScannerEnabled: (scannerEnabled) => set({ scannerEnabled }),
  setLastScannedBarcode: (lastScannedBarcode) => set({ lastScannedBarcode }),
}));
