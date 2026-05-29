// Typed shortcuts for the detail routes opened from many screens, replacing the per-screen
// `const openKanji = (c) => router.push(...)` declarations. Screens that need other navigation
// (router.back(), the study route) still use useRouter directly.
import { useRouter } from 'expo-router';

export function useNav() {
  const router = useRouter();
  return {
    kanji: (character: string) =>
      router.push({ pathname: '/kanji/[character]', params: { character } }),
    word: (id: number) => router.push({ pathname: '/word/[id]', params: { id: String(id) } }),
    sentence: (id: number) =>
      router.push({ pathname: '/sentence/[id]', params: { id: String(id) } }),
  };
}
