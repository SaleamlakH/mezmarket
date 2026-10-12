import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

const MARGIN = 12;
const GAP = 10;
const MAX_WIDTH = 352;

export interface ProductReviewPopoverProps {
  /** The card the popover floats above, used for anchoring. */
  triggerRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A floating panel anchored to a product card, holding the review controls for
 * its lines. It sits directly above the card, centered over it, and clamps to
 * the viewport so it never clips; scrolled or resized, it follows the card
 * again.
 */
export function ProductReviewPopover({ triggerRef, onClose, children }: ProductReviewPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const place = () => {
      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const width = Math.min(MAX_WIDTH, viewportWidth - MARGIN * 2);

      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(MARGIN, Math.min(left, viewportWidth - MARGIN - width));

      let top = rect.top - popover.offsetHeight - GAP;
      top = Math.max(MARGIN, top);

      setPosition({ top, left });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [triggerRef]);

  useEffect(() => {
    // The popover can be mounted while not painted (its wrapper is display:none
    // below `md`), yet its global listeners still fire. Only dismiss while it
    // is actually visible so the mobile sheet is never closed by a stray tap.
    const isPainted = () =>
      popoverRef.current ? popoverRef.current.getClientRects().length > 0 : false;

    const onPointerDown = (event: PointerEvent) => {
      if (!isPainted()) return;
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [triggerRef, onClose]);

  const width = Math.min(MAX_WIDTH, window.innerWidth - MARGIN * 2);

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Review sale lines"
      className="z-50 max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-xl bg-(--surface-primary) shadow-(--shadow-lg)"
      style={{
        position: 'fixed',
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>
  );
}
