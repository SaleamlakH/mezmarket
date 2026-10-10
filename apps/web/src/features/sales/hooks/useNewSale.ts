import { useCallback, useState } from 'react';
import type { SaleLineFormValues } from '@mez/types';

/** The new-sale draft: an ordered list of lines. Not validated or persisted yet. */
export function useNewSale() {
  const [lines, setLines] = useState<SaleLineFormValues[]>([]);

  const addLine = useCallback((line: SaleLineFormValues) => {
    setLines((previous) => [...previous, line]);
  }, []);

  const updateLine = useCallback((index: number, line: SaleLineFormValues) => {
    setLines((previous) => previous.map((existing, i) => (i === index ? line : existing)));
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((previous) => previous.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => setLines([]), []);

  return { lines, addLine, updateLine, removeLine, reset };
}
