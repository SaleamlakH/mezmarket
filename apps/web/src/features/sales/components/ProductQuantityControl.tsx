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
  /** Currency for the unit price note; ignored when `activeUnit` has no price. */
  currency?: string;
  /** The chosen unit; its price renders between the selector and the stepper. */
  activeUnit?: ProductUnitOptionResponse | undefined;
  /** `md` — the editor's roomy stack (default); `sm` — the grid card's overlay. */
  size?: 'sm' | 'md';
  selectId?: string;
  placeholder?: string;
  className?: string;
}

/**
 * The selector-and-stepper control for a product: picks the sellable unit and
 * sets the quantity in one piece. Shared by the docked line editor and the grid
 * card's quick-edit controller.
 */
export function ProductQuantityControl({
  units,
  unitId,
  onUnitChange,
  quantity,
  onQuantityChange,
  currency,
  activeUnit,
  size = 'md',
  selectId,
  placeholder = 'Select the unit',
  className = '',
}: ProductQuantityControlProps) {
  const empty = units.length === 0;
  const gap = size === 'sm' ? 'gap-1.5' : 'gap-3';

  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      <Select
        id={selectId}
        value={unitId}
        placeholder={empty ? 'No units available' : placeholder}
        disabled={empty}
        onChange={(event) => onUnitChange(event.currentTarget.value)}
        options={units.map((unit) => ({ value: unit.id, label: unit.name }))}
        className={
          size === 'sm' ? '[&>select]:px-2.5 [&>select]:py-[7px] [&>select]:text-[13px]' : ''
        }
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
