import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

type Variant = 'error' | 'warning' | 'success' | 'info';
type Position = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';

interface ToastProps {
  message: string;
  description?: string;
  variant: Variant;
  duration: number;
  position: Position;
  onDismiss: () => void;
}

const VARIANTS = {
  error: {
    symbol: <CircleAlert className="text-red-400" />,
  },
  warning: {
    symbol: <TriangleAlert className="text-(--warning)" />,
  },
  success: {
    symbol: <CircleCheck className="text-(--positive)" />,
  },
  info: {
    symbol: <Info className="text-(--accent)" />,
  },
};

export function Toast({
  message,
  description,
  variant,
  duration,
  position,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  const v = VARIANTS[variant];

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  }[position];

  // slide-in on mount, slide-out before unmount
  useEffect(() => {
    const enter = requestAnimationFrame(() => setVisible(true));
    timeoutRef.current = setTimeout(() => {
      // setVisible(false);
      setTimeout(() => onDismiss?.(), 300); // wait for exit transition
    }, duration);

    return () => {
      cancelAnimationFrame(enter);
      clearTimeout(timeoutRef.current);
    };
  }, [duration, onDismiss]);

  const handleClose = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  return (
    <div
      role="alert"
      className={`fixed z-50 ${positionClasses} w-[calc(100%-2rem)] max-w-sm
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <div
        className={`flex items-start gap-3 rounded-lg
          bg-(--surface-primary) border-(--border)
          px-4 py-3 shadow-lg`}
      >
        <span className={`mt-0.5 text-sm font-bold`}>{v.symbol}</span>

        <div className="flex-1 min-w-0">
          <p className="text-md font-medium text-(--text)">{message}</p>
          {description && <p className="mt-0.5 text-xs text-(--text-muted)">{description}</p>}
        </div>

        <button
          onClick={handleClose}
          className="text-(--text-muted) hover:text-(--text) text-sm leading-none"
          aria-label="Dismiss"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
