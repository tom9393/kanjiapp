import { DependencyList, useEffect, useState } from 'react';

// The lifecycle of a screen's primary entity: loading, loaded ('ready'), loaded-but-absent
// ('missing' — the "not found" state the detail screens render), or failed ('error' — the load
// rejected, e.g. a DB error).
export type AsyncResource<T> =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ready'; data: T };

// Loads an async resource on mount and whenever `deps` change, ignoring a stale result if the
// inputs change or the component unmounts before the load resolves. A null/undefined result
// becomes 'missing'; a rejected load becomes 'error' (rather than hanging on the spinner with an
// unhandled rejection). Replaces the hand-rolled `T | null | undefined` + `let active` pattern the
// detail screens repeated.
export function useAsyncResource<T>(
  load: () => Promise<T | null | undefined>,
  deps: DependencyList,
): AsyncResource<T> {
  const [resource, setResource] = useState<AsyncResource<T>>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    setResource({ status: 'loading' });
    load()
      .then((data) => {
        if (!active) return;
        setResource(data == null ? { status: 'missing' } : { status: 'ready', data });
      })
      .catch((e) => {
        if (!active) return;
        console.error('useAsyncResource load failed', e);
        setResource({ status: 'error' });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return resource;
}
