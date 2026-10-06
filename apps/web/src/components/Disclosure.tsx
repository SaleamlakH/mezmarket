import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DisclosureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /**
   * What stands in for the heading when the section is shut. A node rather than a
   * string, because a summary is made of parts that do not all read the same — a
   * value worth noticing next to a label that is only there to be scanned past.
   */
  description?: ReactNode;
  /**
   * The single message standing in for everything inside the panel. A section that
   * cannot be shown because it is closed still has to say what is wrong with it,
   * otherwise a problem hides behind a control the user has to guess they need.
   */
  error?: string | undefined;
  /** Rendered beside the chevron, for a control acting on the section itself. */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * A section that shows its heading and keeps its contents hidden until asked for.
 *
 * The open state is the caller's, because what a section has to say about itself
 * usually depends on what is inside it: a section that now holds an error wants to
 * be open, or at least to be marked as holding one.
 */
export function Disclosure({
  open,
  onOpenChange,
  title,
  description,
  error,
  action,
  children,
}: DisclosureProps) {
  const panelId = useId();
  const descriptionId = useId();

  return (
    <div
      className={`flex flex-col rounded-[13px] border bg-(--surface-secondary) transition-colors ${
        open ? 'border-(--accent)' : 'border-(--border) hover:border-(--border-strong)'
      }`}
    >
      {/*
        The row is a flex line with the toggle in it rather than a button with
        everything inside it: `action` is a control of its own, and a button inside a
        button is not one the browser will keep, let alone one that should also open
        the section when it is used.
      */}
      <div className="flex items-start gap-1 rounded-t-[13px] pr-3 transition-colors hover:bg-(--surface-primary)">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          // The summary describes the section rather than naming it, so it is pointed
          // at from outside the button. Were it read as part of the heading, every
          // one of these would be announced as its whole name.
          aria-describedby={description ? descriptionId : undefined}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-3.5 py-3 text-left focus-visible:outline-2 focus-visible:outline-(--accent) focus-visible:-outline-offset-2"
        >
          <span className="min-w-0 truncate text-[13px] font-semibold text-(--text)">{title}</span>
          <ChevronDown
            size={18}
            aria-hidden
            className={`mt-0.5 ml-auto shrink-0 text-(--text-muted) transition-transform duration-150 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {action && <span className="flex shrink-0 items-center self-center">{action}</span>}
      </div>

      {/*
        Shown only while shut, which is the whole of its job: it stands in for what
        is inside. Once the section is open its own fields say all of this, and saying
        it twice would be noise in the middle of the thing being read.
      */}
      {!open && (description || error) && (
        <div className="flex flex-col gap-1.5 rounded-b-[13px] border-t border-(--border) px-3.5 py-2.5">
          {description && (
            <div id={descriptionId} className="text-[11px] text-(--text-muted)">
              {description}
            </div>
          )}
          {error && (
            <p role="alert" className="m-0 text-[11px] font-semibold text-(--danger)">
              {error}
            </p>
          )}
        </div>
      )}

      {open && (
        <div
          id={panelId}
          className="flex flex-col gap-3 rounded-b-[13px] border-t border-(--border) bg-(--surface-primary) px-3.5 py-3"
        >
          {children}
        </div>
      )}
    </div>
  );
}
