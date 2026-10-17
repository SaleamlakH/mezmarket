import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export interface SuccessStateProps {
  /** The result's content. */
  children?: ReactNode;
  /** Container styles. */
  className?: string;
}

/** A completed operation's result: a check mark above the caller's content. */
export function SuccessState({ children, className }: SuccessStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--positive)_35%,transparent)] bg-[color-mix(in_srgb,var(--positive)_12%,transparent)] px-6 py-8 text-center ${className ?? ''}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-(--positive) text-white">
        <Check size={22} aria-hidden />
      </div>

      {children}
    </div>
  );
}
