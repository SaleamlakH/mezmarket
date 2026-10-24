import { Image } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ListCardProps {
  icon?: ReactNode;
  thumb?: {
    imageUrl?: string | null;
    imageAlt?: string;
  };
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  /** `field` sits inside a form or sheet; `primary` matches content cards. */
  surface?: 'field' | 'primary';
  className?: string;
}

export function ListCard({
  icon,
  thumb,
  title,
  meta,
  trailing,
  surface = 'field',
  className = '',
}: ListCardProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-(--border) p-3 ${
        surface === 'primary' ? 'bg-(--surface-primary)' : 'bg-(--field)'
      } ${className}`}
    >
      {(icon || thumb) && (
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-(--border) bg-(--surface-secondary) text-(--text-muted)">
          {thumb?.imageUrl ? (
            <img
              src={thumb.imageUrl}
              alt={thumb.imageAlt ?? ''}
              width={640}
              height={480}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain p-1"
            />
          ) : (
            (icon ?? <Image size={18} aria-hidden />)
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[13px] font-semibold text-(--text)">{title}</p>
        {meta && <p className="m-0 mt-0.5 truncate text-[11px] text-(--text-muted)">{meta}</p>}
      </div>

      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
