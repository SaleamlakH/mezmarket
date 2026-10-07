import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export type BannerTone = 'success' | 'warning' | 'danger';

export interface BannerProps {
  tone: BannerTone;
  title: string;
  description?: string | undefined;
}

const config: Record<BannerTone, { icon: ReactNode; box: string }> = {
  success: {
    icon: <CheckCircle2 size={18} />,
    box: 'border-[color-mix(in_srgb,var(--positive)_35%,transparent)] bg-[color-mix(in_srgb,var(--positive)_12%,transparent)] text-(--positive)',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    box: 'border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-(--warning)',
  },
  danger: {
    icon: <XCircle size={18} />,
    box: 'border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-(--danger)',
  },
};

export function Banner({ tone, title, description }: BannerProps) {
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
          <p className="m-0 text-[11px] leading-relaxed text-(--text-muted)">{description}</p>
        )}
      </div>
    </div>
  );
}
