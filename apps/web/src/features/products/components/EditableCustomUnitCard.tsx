import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { Plus } from 'lucide-react';
import type { ProductUnitResponse, ProductWithUnitsResponse } from '@mez/types';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Switch } from '@/components/Switch';
import {
  useCustomUnitsForm,
  type CustomUnitsFormOutput,
  type CustomUnitsFormValues,
} from '../hooks/useCustomUnitsForm';
import { SectionCard } from '@/components/SectionCard';
import { SectionFooter } from '@/components/SectionFooter';
import { ROLE_LABELS } from './unitRoleLabels';

interface EditableCustomUnitCardProps {
  control: Control<CustomUnitsFormValues, unknown, CustomUnitsFormOutput>;
  register: UseFormRegister<CustomUnitsFormValues>;
  index: number;
  unit: ProductUnitResponse;
  disabled: boolean;
  errors: FieldErrors<CustomUnitsFormValues>['units'];
  basisLabel: string;
}

/**
 * One of the owner's own units. Its name, price and capabilities are editable; its
 * basis and rate are fixed once it is created.
 */
export function EditableCustomUnitCard({
  control,
  register,
  index,
  unit,
  disabled,
  errors,
  basisLabel,
}: EditableCustomUnitCardProps) {
  const row = useWatch({ control, name: `units.${index}` });
  const name = row?.name ?? unit.name;
  const sellCapable = row?.sellCapable ?? unit.sellCapable;
  const conversion =
    unit.conversionRate != null ? `1 ${name} = ${unit.conversionRate} ${basisLabel}` : null;
  const rowErrors = errors?.[index];

  return (
    <div className="rounded-lg border border-(--border) bg-(--surface-secondary)/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-(--text-muted)">
          {ROLE_LABELS.CUSTOM}
        </span>
        {!sellCapable && <Badge tone="neutral">Not sold</Badge>}
      </div>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Field
          id={`edit-unit-${unit.id}-name`}
          label="Name"
          compact
          error={rowErrors?.name?.message}
        >
          <Input
            id={`edit-unit-${unit.id}-name`}
            autoComplete="off"
            maxLength={50}
            disabled={disabled}
            {...register(`units.${index}.name`)}
          />
        </Field>

        <Field
          id={`edit-unit-${unit.id}-price`}
          label="Sell price"
          compact
          error={rowErrors?.price?.message}
        >
          <Input
            id={`edit-unit-${unit.id}-price`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            disabled={disabled}
            {...register(`units.${index}.price`)}
          />
        </Field>
      </div>

      {conversion && <p className="m-0 mt-2 text-[11px] text-(--text-muted)">{conversion}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="inline-flex items-center gap-2.5">
          <Controller
            name={`units.${index}.purchaseCapable`}
            control={control}
            render={({ field }) => (
              <Switch
                checked={Boolean(field.value)}
                onChange={field.onChange}
                label={`${name || 'Unit'} can be purchased in`}
                disabled={disabled}
              />
            )}
          />
          <span className="text-[13px] font-semibold text-(--text)">Can be purchased</span>
        </span>

        <span className="inline-flex items-center gap-2.5">
          <Controller
            name={`units.${index}.sellCapable`}
            control={control}
            render={({ field }) => (
              <Switch
                checked={Boolean(field.value)}
                onChange={field.onChange}
                label={`${name || 'Unit'} can be sold in`}
                disabled={disabled}
              />
            )}
          />
          <span className="text-[13px] font-semibold text-(--text)">Can be sold</span>
        </span>
      </div>

      {rowErrors?.sellCapable?.message && (
        <p role="alert" className="m-0 mt-2 text-[11px] font-semibold text-(--danger)">
          {rowErrors.sellCapable.message}
        </p>
      )}
    </div>
  );
}

interface CustomUnitsCardProps {
  businessId: string;
  product: ProductWithUnitsResponse;
  onSaved: (message: string) => void;
  onRequestAddUnit: () => void;
}

/**
 * The owner's own units as one card. The form holds the list; the page only supplies
 * the product and opens the add sheet when asked.
 */
export function CustomUnitsCard({
  businessId,
  product,
  onSaved,
  onRequestAddUnit,
}: CustomUnitsCardProps) {
  const { form, editing, startEditing, cancel, submit, isDirty, isSaving, error, units } =
    useCustomUnitsForm({ businessId, product, onSaved });

  const rows = useWatch({ control: form.control, name: 'units' }) ?? [];
  const baseSymbol = product.units.find((unit) => unit.unitRole === 'BASE')?.name ?? 'base unit';
  const contentSymbol =
    product.units.find((unit) => unit.unitRole === 'MOU')?.name ?? 'content unit';

  return (
    <SectionCard
      title="Custom Units"
      subtitle="Your own units. The name and selling price can be changed, but a unit cannot be deleted."
      editing={editing}
      onEdit={startEditing}
      showEdit={rows.length > 0}
      action={
        rows.length > 0 ? (
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="shrink-0"
            onClick={onRequestAddUnit}
          >
            <Plus aria-hidden className="h-4 w-4" />
            Add unit
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-(--border) bg-(--surface-secondary)/40 p-4 text-center">
            <p className="m-0 text-[12px] text-(--text-muted)">This product has no custom units.</p>
            <p className="m-0 mt-1 text-[11px] text-(--text-muted)">
              Add a portion or a friendlier name if it needs one.
            </p>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="mt-2"
              onClick={onRequestAddUnit}
            >
              Add a unit
            </Button>
          </div>
        ) : (
          rows.map((row, index) => {
            const unit = units.find((candidate) => candidate.id === row.id);
            if (!unit) return null;

            return (
              <EditableCustomUnitCard
                key={unit.id}
                control={form.control}
                register={form.register}
                index={index}
                unit={unit}
                disabled={!editing}
                errors={form.formState.errors.units}
                basisLabel={unit.dependsOn === 'MOU' ? contentSymbol : baseSymbol}
              />
            );
          })
        )}
      </div>

      <SectionFooter
        editing={editing}
        isDirty={isDirty}
        isSaving={isSaving}
        error={error}
        onSave={submit}
        onCancel={cancel}
      />
    </SectionCard>
  );
}
