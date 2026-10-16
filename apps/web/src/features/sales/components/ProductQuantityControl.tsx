import type { ProductUnitOptionResponse } from '@mez/types';
import { Select } from '@/components/Select';
import { Stepper } from '@/components/Stepper';
import { formatMoney } from '@/lib/format';

export interface ProductQuantityControlProps {
  units: ProductUnitOptionResponse[];
  unitId: string;
  onUnitChange: (unitId: string) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  /** Currency for the unit price note. */
  currency?: string;
  /** The chosen unit. */
  activeUnit?: ProductUnitOptionResponse | undefined;
  /** The control's size. */
  size?: 'sm' | 'md' | 'lg';
  selectId?: string;
  placeholder?: string;
  className?: string;
}

/** Picks a product's sellable unit and sets its quantity. */
export function ProductQuantityControl({
  units,
  unitId,
  onUnitChange,
  quantity,
  onQuantityChange,
  currency,
  activeUnit,
  size = 'lg',
  selectId,
  placeholder = 'Select the unit',
  className = '',
}: ProductQuantityControlProps) {
  const empty = units.length === 0;
  const gap = size === 'sm' ? 'gap-1.5' : size === 'md' ? 'gap-2' : 'gap-3';

  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      <Select
        id={selectId}
        value={unitId}
        placeholder={empty ? 'No units available' : placeholder}
        disabled={empty}
        onChange={(event) => onUnitChange(event.currentTarget.value)}
        options={units.map((unit) => ({ value: unit.id, label: unit.name }))}
        size={size}
      />

      {activeUnit?.price != null && currency && (
        <p
          className="m-0 text-right font-mono text-[11px] text-(--text-muted)"
          aria-label={`Unit price of ${activeUnit.name}`}
        >
          {formatMoney(activeUnit.price, currency)} / {activeUnit.name}
        </p>
      )}

      <Stepper size={size} value={quantity} onChange={onQuantityChange} />
    </div>
  );
}
