import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'md' | 'lg';
}

const SIZES: Record<NonNullable<DialogProps['size']>, string> = {
  md: 'md:max-w-[420px]',
  lg: 'md:max-w-[640px]',
};

export interface DialogHeaderProps {
  title: string;
  onClose: () => void;
}

/**
 * The header and close button a sheet leads with. Kept separate from `Dialog`
 * so each sheet owns its own title while the container stays a plain shell.
 */
export function DialogHeader({ title, onClose }: DialogHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 pt-3 pb-2">
      <h2 className="m-0 text-base font-bold text-(--text)">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="focus-ring -mr-1 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-(--border) bg-(--field) text-(--text-muted) transition-colors hover:text-(--text)"
      >
        <X size={16} aria-hidden />
      </button>
    </header>
  );
}

/**
 * A plain sheet shell: a bottom modal on phones and a centered dialog on larger
 * screens. It handles opening, backdrop dismissal and scroll locking only — the
 * content, including any header, is entirely up to the caller.
 */
export function Dialog({ open, onClose, children, size = 'md' }: DialogProps) {
  const panelRef = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    previousFocus.current = document.activeElement as HTMLElement;
    if (!panel.open) panel.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
      previousFocus.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    panel.addEventListener('cancel', onCancel);
    return () => panel.removeEventListener('cancel', onCancel);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={panelRef}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`dialog-panel-enter mt-auto mb-0 max-w-none max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[20px] border-t border-(--border) bg-(--surface-primary) shadow-(--shadow-lg) md:mx-auto md:mt-10 md:mb-10 md:max-h-[calc(100dvh-5rem)] md:rounded-b-[20px] md:border ${SIZES[size]}`}
    >
      <div
        aria-hidden
        className="mx-auto mt-2 mb-1 h-1 w-9 shrink-0 rounded-full bg-(--border) md:hidden"
      />
      <div className="min-h-0 grow overflow-y-auto overscroll-contain px-4.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:overflow-y-auto">
        {children}
      </div>
    </dialog>
  );
}
