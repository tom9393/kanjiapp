// App-wide appearance state. Mirrors MainActivity reading the dark_mode pref to drive the
// theme (KanjiappTheme(darkTheme = dark_mode)) — a single boolean, default light, that does
// not follow the system color scheme. `init()` loads it once at startup; the settings screen
// keeps it in sync via settingsStore.updateBoolean -> setDarkMode. Persistence is owned by
// settingsStore (this store only holds the in-memory flag the palette reads).
import { create } from 'zustand';
import { Prefs } from '@/settings/preferences';
import { getBoolean } from '@/settings/settingsProvider';

interface ThemeStore {
  darkMode: boolean;
  init: () => Promise<void>;
  setDarkMode: (value: boolean) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  darkMode: Prefs.darkMode.default,
  init: async () => set({ darkMode: await getBoolean(Prefs.darkMode) }),
  setDarkMode: (value) => set({ darkMode: value }),
}));
