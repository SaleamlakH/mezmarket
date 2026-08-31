import { Minus, Plus } from 'lucide-react';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}

export function Stepper({ value, onChange, min = 0 }: StepperProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(value + 1);
  return (
    <div className="inline-flex items-center gap-2.5">
      <button
        type="button"
        aria-label="Decrease"
        onClick={dec}
        className="focus-ring flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-(--border) bg-(--field) text-(--text) transition-colors hover:bg-(--accent) hover:text-white"
      >
        <Minus size={16} />
      </button>
      <span className="min-w-8 text-center font-mono text-sm font-bold text-(--text)">{value}</span>
      <button
        type="button"
        aria-label="Increase"
        onClick={inc}
        className="focus-ring flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-(--border) bg-(--field) text-(--text) transition-colors hover:bg-(--accent) hover:text-white"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
