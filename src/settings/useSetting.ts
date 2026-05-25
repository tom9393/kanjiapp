import { useEffect, useState } from 'react';

// Reads a settings-provider value once on mount; null until the async read resolves.
// Callers supply their own fallback (the pref default) where a value is needed immediately.
export function useSetting<T>(read: () => Promise<T>): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    read().then(setValue);
  }, [read]);
  return value;
}
