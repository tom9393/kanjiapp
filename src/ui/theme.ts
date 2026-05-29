// App palette. Builds on the template's color tokens with a few semantic colors used across
// the study/browse screens. The card-state colors mirror KanjiChip in KanjiScreen.kt.
import { useMemo } from 'react';
import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { useThemeStore } from '@/state/themeStore';
import { CardState } from '@/domain/cardState';

const light = {
  text: '#11181C',
  textSecondary: '#5A6066',
  background: '#FFFFFF',
  card: '#F0F0F3',
  surfaceVariant: '#E6E8EC',
  border: '#D5D7DD',
  primary: '#1F6FEB',
  onPrimary: '#FFFFFF',
  // Semantic accents. Tuned so white text stays legible on the filled variant; used by the
  // color-coded answer buttons (Again/Hard/Good map to danger/warning/success) and stats.
  success: '#1E874B',
  warning: '#C2680A',
  danger: '#D7373F',
};

const dark = {
  text: '#ECEDEE',
  textSecondary: '#9BA1A6',
  background: '#0A0B0D',
  card: '#1C1D21',
  surfaceVariant: '#26282D',
  border: '#34363B',
  primary: '#3A93F0',
  onPrimary: '#FFFFFF',
  success: '#2EA869',
  warning: '#C9701C',
  danger: '#E5565B',
};

export type Palette = typeof light;

// Design tokens: a small named scale so screens stop hand-picking magic numbers. New/edited
// code should reach for these; existing screens are migrated only when they're already being
// touched (keeps changes surgical).
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const fontSize = { caption: 11, small: 13, body: 15, title: 16, heading: 20, hero: 44 } as const;

// Card shadow. iOS reads the shadow* props; Android reads `elevation`. In dark mode the black
// shadow is invisible against the near-black background, so cards also carry a hairline border
// (palette.border) to define their edges — that border is what does the work in light mode too.
export const elevation = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
} as const;

export function usePalette(): Palette {
  return useThemeStore((s) => s.darkMode) ? dark : light;
}

/**
 * React Navigation theme derived from the app palette, so the native header (background,
 * title, tint) tracks the same colors as screen content instead of React Navigation's stock
 * light/dark. Feeds the ThemeProvider in the root layout.
 */
export function useNavigationTheme(): Theme {
  const darkMode = useThemeStore((s) => s.darkMode);
  return useMemo(() => {
    const base = darkMode ? DarkTheme : DefaultTheme;
    const p = darkMode ? dark : light;
    return {
      ...base,
      dark: darkMode,
      colors: {
        ...base.colors,
        primary: p.primary,
        background: p.background,
        card: p.background,
        text: p.text,
        border: p.border,
      },
    };
  }, [darkMode]);
}

/** Converts a 6-digit hex color to an rgba() string — mirrors Compose's Color.copy(alpha = …). */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const cardStateColors: Record<CardState, string> = {
  [CardState.NEW]: '#9AA0A6',
  [CardState.LEARNING]: '#FFD54F',
  [CardState.REVIEW]: '#81C784',
  [CardState.RELEARNING]: '#E57373',
};
