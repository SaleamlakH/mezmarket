import { Input } from '@/components/Input';
import { Chip } from '@/components/Chip';
import {
  DASHBOARD_PERIOD_OPTIONS,
  type DashboardCustomRange,
  type DashboardPeriodKey,
} from '../lib/period';

export interface PeriodFilterProps {
  period: DashboardPeriodKey;
  customRange: DashboardCustomRange;
  onPeriodChange: (period: DashboardPeriodKey) => void;
  onCustomRangeChange: (range: DashboardCustomRange) => void;
}

export function PeriodFilter({
  period,
  customRange,
  onPeriodChange,
  onCustomRangeChange,
}: PeriodFilterProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 md:items-end">
      <div
        role="group"
        aria-label="Dashboard period"
        className="scrollbar-none flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5"
      >
        {DASHBOARD_PERIOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={period === option.key}
            onClick={() => onPeriodChange(option.key)}
            className="focus-ring shrink-0 cursor-pointer rounded-lg"
          >
            <Chip active={period === option.key}>{option.label}</Chip>
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-(--text-muted)">
            From
            <Input
              type="date"
              size="md"
              value={customRange.start}
              max={customRange.end}
              onChange={(event) =>
                onCustomRangeChange({ ...customRange, start: event.target.value })
              }
              className="w-[9.5rem]"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-(--text-muted)">
            To
            <Input
              type="date"
              size="md"
              value={customRange.end}
              min={customRange.start}
              onChange={(event) => onCustomRangeChange({ ...customRange, end: event.target.value })}
              className="w-[9.5rem]"
            />
          </label>
        </div>
      )}
    </div>
  );
}
