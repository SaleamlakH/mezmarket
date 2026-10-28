import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';

export type BannerTone = 'success' | 'warning' | 'danger' | 'info';

export interface BannerProps {
  tone: BannerTone;
  title: string;
  description?: string | undefined;
  onDismiss?: (() => void) | undefined;
}

const config: Record<BannerTone, { icon: ReactNode; box: string }> = {
  success: {
    icon: <CheckCircle2 size={18} />,
    box: 'border-[color-mix(in_srgb,var(--positive)_45%,transparent)] bg-[color-mix(in_srgb,var(--surface-primary)_88%,var(--positive)_12%)] text-(--positive)',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    box: 'border-[color-mix(in_srgb,var(--warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--surface-primary)_88%,var(--warning)_12%)] text-(--warning)',
  },
  danger: {
    icon: <XCircle size={18} />,
    box: 'border-[color-mix(in_srgb,var(--danger)_45%,transparent)] bg-[color-mix(in_srgb,var(--surface-primary)_88%,var(--danger)_12%)] text-(--danger)',
  },
  info: {
    icon: <Info size={18} />,
    box: 'border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--surface-primary)_88%,var(--accent)_12%)] text-(--accent)',
  },
};

export function Banner({ tone, title, description, onDismiss }: BannerProps) {
  const { icon, box } = config[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={`flex items-start gap-2.5 rounded-lg border p-3 ${box}`}
    >
      <span className="mt-0.5 flex shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-xs font-bold text-(--text)">{title}</p>
        {description && (
          <p className="m-0 text-[11px] leading-relaxed text-(--text) opacity-80">{description}</p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="-mt-0.5 shrink-0 text-(--text-muted) hover:text-(--text)"
          aria-label="Dismiss"
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
