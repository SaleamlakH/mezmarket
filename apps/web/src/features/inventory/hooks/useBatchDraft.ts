import { useCallback, useMemo, useState } from 'react';
import type { BatchLineFormValues } from '@mez/types';
import { toDateInputValue } from '@/lib/format';
import { lineTotal } from '../lib/lineTotal';
import type { BatchDraftHeader } from '../types';

const initialHeader = (): BatchDraftHeader => ({
  batchDate: toDateInputValue(new Date()),
  supplierName: '',
  referenceNumber: '',
});

/**
 * Holds the batch being recorded: the header fields and the product lines
 * added to it. Editing a line replaces it in place, so the order the lines
 * were added in is the order they are confirmed in.
 */
export function useBatchDraft() {
  const [header, setHeader] = useState<BatchDraftHeader>(initialHeader);
  const [lines, setLines] = useState<BatchLineFormValues[]>([]);

  const setHeaderField = useCallback(
    <K extends keyof BatchDraftHeader>(field: K, value: BatchDraftHeader[K]) => {
      setHeader((previous) => ({ ...previous, [field]: value }));
    },
    [],
  );

  const addLine = useCallback((line: BatchLineFormValues) => {
    setLines((previous) => [...previous, line]);
  }, []);

  const updateLine = useCallback((index: number, line: BatchLineFormValues) => {
    setLines((previous) => previous.map((entry, i) => (i === index ? line : entry)));
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((previous) => previous.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setHeader(initialHeader());
    setLines([]);
  }, []);

  /**
   * What the batch comes to in total, summing the lines that know their own
   * total. A line still missing a quantity or a cost contributes nothing, so
   * this is a running figure rather than a promise about the final batch.
   */
  const totalAmount = useMemo(
    () => lines.reduce((sum, line) => sum + (lineTotal(line) ?? 0), 0),
    [lines],
  );

  return {
    header,
    setHeaderField,
    lines,
    addLine,
    updateLine,
    removeLine,
    reset,
    hasLines: lines.length > 0,
    totalAmount,
  };
}
