import { Image } from 'lucide-react';
import type { ReactNode } from 'react';

export interface RailCardProps {
  variant?: 'thumbnail' | 'card';
  badge?: ReactNode;
  badgePosition?: 'inline' | 'overlay';
  thumb?: {
    imageUrl?: string | null;
    imageAlt?: string;
  };
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  fixedWidth?: string;
}

export function RailCard({
  variant = 'card',
  badge,
  badgePosition = 'inline',
  thumb,
  children,
  footer,
  className = '',
  fixedWidth,
}: RailCardProps) {
  const widthClass = fixedWidth ? '' : 'w-full';

  return (
    <div
      className={`relative flex cursor-pointer flex-col gap-2 rounded-2xl border border-(--border) bg-(--surface-primary) px-2 pt-2 pb-4 transition-[border-color,background-color] duration-150 hover:border-(--border-strong) hover:bg-(--surface-primary) ${widthClass} ${className}`}
      style={fixedWidth ? { width: fixedWidth } : undefined}
    >
      {variant === 'thumbnail' && (
        <div className="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-[10px] border border-(--border) bg-(--surface-secondary) text-(--text-muted)">
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
            <Image className="h-11 w-11" aria-hidden />
          )}
        </div>
      )}

      <div className="min-w-0 flex flex-1 flex-col gap-1">{children}</div>

      {badge ? (
        <div className={badgePosition === 'overlay' ? 'absolute top-3 right-3' : 'mt-1'}>
          {badge}
        </div>
      ) : null}

      {footer && (
        <div className="flex flex-col gap-1 border-t border-dashed border-(--border) pt-2.5">
          {footer}
        </div>
      )}
    </div>
  );
}
