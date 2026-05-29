import { useEffect, useState } from 'react';
import { getBoolean, getNumber, getString } from '@/settings/settingsProvider';
import { BoolPref, EnumPref, NumberPref } from '@/settings/preferences';

type Pref = NumberPref | BoolPref | EnumPref;

// Reads a settings value once on mount and updates when the source identity changes.
//
// Pref form — useSetting(Prefs.strokeWidth): returns the pref's default immediately (no null
// flash), then the stored value once the async read resolves. The pref carries its own type and
// default, so callers no longer repeat `?? Prefs.x.default`.
//
// Getter form — useSetting(getStudyModes): for composite/derived values that aren't a single
// pref. null until the async getter resolves; callers supply their own fallback.
export function useSetting(pref: NumberPref): number;
export function useSetting(pref: BoolPref): boolean;
export function useSetting<T extends string>(pref: EnumPref<T>): T;
export function useSetting<T>(read: () => Promise<T>): T | null;
export function useSetting(source: Pref | (() => Promise<unknown>)): unknown {
  const [value, setValue] = useState<unknown>(typeof source === 'function' ? null : source.default);
  useEffect(() => {
    let active = true;
    const read = typeof source === 'function' ? source : () => readPref(source);
    read().then((v) => {
      if (active) setValue(v);
    });
    return () => {
      active = false;
    };
  }, [source]);
  return value;
}

function readPref(pref: Pref): Promise<number | boolean | string> {
  if ('options' in pref) return getString(pref);
  if (typeof pref.default === 'boolean') return getBoolean(pref);
  return getNumber(pref);
}
