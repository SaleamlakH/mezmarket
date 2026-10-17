import { Image } from 'lucide-react';
import type { ReactNode } from 'react';

export type RailThumbVariant = 'square-padded' | 'wide';

const THUMB_STYLES: Record<RailThumbVariant, string> = {
  // Square photo, set in from the card edge with a rounded, bordered frame.
  'square-padded': 'mx-2 mt-2 aspect-4/3 rounded-[10px] border border-(--border)',
  // Wide photo bleeding edge-to-edge, square corners.
  wide: 'aspect-4/3',
};

export interface RailCardProps {
  variant?: 'card' | 'thumbnail';
  /** How the thumb is presented when `variant` is `thumbnail`. */
  thumbVariant?: RailThumbVariant;
  badge?: ReactNode;
  badgePosition?: 'inline' | 'overlay';
  thumb?: {
    imageUrl?: string | null;
    imageAlt?: string;
  };
  /** What to draw inside the image area, over the photo — e.g. an inline quick
   * controller. Positioned with absolute utilities by the caller. */
  thumbOverlay?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  fixedWidth?: string;
}

/**
 * The vertical rail primitive. In `thumbnail` variant the photo is shown in one
 * of two ways: `square-padded` — a photo in a rounded, bordered frame set in
 * from the card edge; or `wide` — a 4:3 photo bleeding edge-to-edge with square
 * corners. The children and the optional dashed footer live in a container that
 * keeps the regular padding. `card` variant is the compact, image-free form;
 * both can carry a badge and a dashed footer.
 */
export function RailCard({
  variant = 'card',
  thumbVariant = 'square-padded',
  badge,
  badgePosition = 'inline',
  thumb,
  thumbOverlay,
  children,
  footer,
  className = '',
  fixedWidth,
}: RailCardProps) {
  const widthClass = fixedWidth ? '' : 'w-full';
  const hasFooter = footer != null;

  return (
    <div
      className={`relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-(--border) bg-(--surface-primary) transition-[border-color,background-color] duration-150 hover:border-(--border-strong) hover:bg-(--surface-primary) ${widthClass} ${className}`}
      style={fixedWidth ? { width: fixedWidth } : undefined}
    >
      {variant === 'thumbnail' && (
        <div
          className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-(--surface-secondary) text-(--text-muted) ${THUMB_STYLES[thumbVariant]}`}
        >
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
          {thumbOverlay}
        </div>
      )}

      <div
        className={`flex min-w-0 flex-1 flex-col gap-1 px-2 pt-2 ${hasFooter ? 'pb-2' : 'pb-4'}`}
      >
        {children}
        {badge && badgePosition !== 'overlay' ? <div className="mt-1">{badge}</div> : null}
      </div>

      {hasFooter && (
        <div className="flex flex-col gap-1 border-t border-dashed border-(--border) px-2 pt-2.5 pb-4">
          {footer}
        </div>
      )}

      {badge && badgePosition === 'overlay' ? (
        <div className="absolute top-2 right-2">{badge}</div>
      ) : null}
    </div>
  );
}
