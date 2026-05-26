// Open/close state for the navigation drawer. Lives in a store because the trigger (the
// hamburger in AppHeader, rendered inside the Stack) and the Drawer itself (at the root
// layout) sit in different parts of the tree.
import { create } from 'zustand';

interface DrawerStore {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useDrawerStore = create<DrawerStore>((set) => ({
  open: false,
  openDrawer: () => set({ open: true }),
  closeDrawer: () => set({ open: false }),
}));
