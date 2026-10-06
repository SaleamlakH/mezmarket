import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import type { BatchDraftHeader } from '../types';

export interface BatchHeaderFormProps {
  header: BatchDraftHeader;
  onChange: <K extends keyof BatchDraftHeader>(field: K, value: BatchDraftHeader[K]) => void;
}

/**
 * The batch's own fields: when the stock arrived, and who supplied it.
 * Only the date is required — a supplier is unknown for plenty of real
 * deliveries, so both the supplier and the reference number stay optional.
 */
export function BatchHeaderForm({ header, onChange }: BatchHeaderFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <Field id="batchDate" label="Batch date" hint="The day this stock was received">
        <Input
          id="batchDate"
          name="batchDate"
          type="date"
          value={header.batchDate}
          onChange={(event) => onChange('batchDate', event.target.value)}
        />
      </Field>

      <Field id="supplierName" label="Supplier" optional>
        <Input
          id="supplierName"
          name="supplierName"
          placeholder="e.g. Mango Wholesale"
          value={header.supplierName ?? ''}
          onChange={(event) => onChange('supplierName', event.target.value)}
        />
      </Field>

      <Field
        id="referenceNumber"
        label="Reference number"
        optional
        hint="The invoice or receipt number, if you have it"
      >
        <Input
          id="referenceNumber"
          name="referenceNumber"
          placeholder="e.g. INV-4482"
          value={header.referenceNumber ?? ''}
          onChange={(event) => onChange('referenceNumber', event.target.value)}
        />
      </Field>
    </div>
  );
}
