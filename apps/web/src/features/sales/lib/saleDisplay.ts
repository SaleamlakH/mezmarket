import { pluralize } from '@/lib/format';

/** The count of sale lines as shown in the panel, cart trigger and product chip. */
export function formatLineCount(count: number): string {
  return `${count} ${pluralize(count, 'line')}`;
}
