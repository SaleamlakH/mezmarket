import { useWatch, type FieldPath } from 'react-hook-form';
import { Plus } from 'lucide-react';
import type { ProductUnitResponse, ProductWithUnitsResponse } from '@mez/types';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { usePlatformUnitsForm, type PlatformUnitsFormValues } from '../hooks/usePlatformUnitsForm';
import { SectionCard } from './SectionCard';
import { SectionFooter } from './SectionFooter';
import { ROLE_LABELS } from './unitRoleLabels';

interface PlatformUnitCardProps {
  label: string;
  unit: ProductUnitResponse;
  price: string;
  disabled: boolean;
  priceError?: string | undefined;
  onPriceChange: (price: string) => void;
  conversionBasis?: string;
}

/**
 * A base or content unit on the product detail page. Its name, basis and rate belong
 * to the platform; only the selling price is editable, and only when it is sold.
 */
export function PlatformUnitCard({
  label,
  unit,
  price,
  disabled,
  priceError,
  onPriceChange,
  conversionBasis,
}: PlatformUnitCardProps) {
  const base = conversionBasis ?? (unit.dependsOn === 'MOU' ? 'content' : 'base');
  const conversion =
    unit.dependsOn != null && unit.conversionRate != null
      ? `1 ${unit.name} = ${unit.conversionRate} ${base}`
      : null;

  return (
    <div className="rounded-lg border border-(--border) bg-(--surface-secondary)/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-(--text-muted)">
          {label}
        </span>
        {!unit.sellCapable && <Badge tone="neutral">Not sold</Badge>}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <span className="text-[11px] font-medium text-(--text-muted)">Name</span>
          <p className="m-0 mt-0.5 text-[13px] text-(--text)">{unit.name}</p>
        </div>
        <Field id={`edit-unit-${unit.id}-price`} label="Sell price" compact error={priceError}>
          <Input
            id={`edit-unit-${unit.id}-price`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={unit.sellCapable ? price : ''}
            disabled={disabled || !unit.sellCapable}
            onChange={(event) => onPriceChange(event.target.value)}
          />
        </Field>
      </div>

      {conversion && <p className="m-0 mt-2 text-[11px] text-(--text-muted)">{conversion}</p>}
    </div>
  );
}

interface PlatformUnitsCardProps {
  businessId: string;
  product: ProductWithUnitsResponse;
  onSaved: (message: string) => void;
  onRequestAddContentUnit: () => void;
}

/**
 * The platform-owned unit card. Both rows are held and saved by one form, as one list
 * to the units endpoint.
 */
export function PlatformUnitsCard({
  businessId,
  product,
  onSaved,
  onRequestAddContentUnit,
}: PlatformUnitsCardProps) {
  const {
    form,
    editing,
    startEditing,
    cancel,
    submit,
    isDirty,
    isSaving,
    error,
    baseUnit,
    contentUnit,
  } = usePlatformUnitsForm({ businessId, product, onSaved });

  const rows = useWatch({ control: form.control, name: 'units' }) ?? [];
  const baseIndex = rows.findIndex((row) => row.unitRole === 'BASE');
  const contentIndex = rows.findIndex((row) => row.unitRole === 'MOU');

  const setPrice = (index: number, price: string) => {
    form.setValue(`units.${index}.price` as FieldPath<PlatformUnitsFormValues>, price, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const contentSymbol = contentUnit?.name ?? 'content unit';
  const baseSymbol = baseUnit?.name ?? 'base unit';

  return (
    <SectionCard
      title="Base And Content Unit"
      subtitle="The units the platform measures this product in. Only the selling price can be changed."
      editing={editing}
      onEdit={startEditing}
    >
      <div className="flex flex-col gap-3">
        {baseUnit && baseIndex >= 0 && (
          <PlatformUnitCard
            label={ROLE_LABELS.BASE}
            unit={baseUnit}
            price={rows[baseIndex]?.price ?? ''}
            disabled={!editing}
            priceError={form.formState.errors.units?.[baseIndex]?.price?.message}
            onPriceChange={(price) => setPrice(baseIndex, price)}
          />
        )}

        {contentUnit && contentIndex >= 0 ? (
          <PlatformUnitCard
            label={ROLE_LABELS.MOU}
            unit={contentUnit}
            price={rows[contentIndex]?.price ?? ''}
            disabled={!editing}
            priceError={form.formState.errors.units?.[contentIndex]?.price?.message}
            onPriceChange={(price) => setPrice(contentIndex, price)}
            conversionBasis={baseSymbol}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-(--border) bg-(--surface-secondary)/40 p-4">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-(--text-muted)">
              {ROLE_LABELS.MOU}
            </span>
            <p className="m-0 mt-1 text-[12px] text-(--text)">This product has no content unit.</p>
            <p className="m-0 mt-1 text-[11px] text-(--text-muted)">
              Add one if this product is opened or sold in a smaller unit &mdash; like{' '}
              {contentSymbol} for a bottle. It must be in a different dimension from {baseSymbol}.
            </p>
            <Button
              type="button"
              size="lg"
              variant="primary"
              className="mt-2"
              onClick={onRequestAddContentUnit}
            >
              <Plus aria-hidden className="h-4 w-4" />
              Add content unit
            </Button>
          </div>
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
