import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type Position = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';

interface ToastProps {
  children: ReactNode;
  duration: number;
  position: Position;
  onDismiss: () => void;
}

export function Toast({ children, duration, position, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const autoDismissRef = useRef<number | undefined>(undefined);
  const exitTimeoutRef = useRef<number | undefined>(undefined);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  }[position];

  const hiddenClasses = position.endsWith('right')
    ? 'opacity-0 translate-x-full'
    : 'opacity-0 translate-x-8';

  const hide = useCallback(() => {
    window.clearTimeout(autoDismissRef.current);
    setVisible(false);
    window.clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = window.setTimeout(() => onDismissRef.current(), 300);
  }, []);

  // slide in from the side on mount, then slide out before unmount
  useEffect(() => {
    const enter = requestAnimationFrame(() => setVisible(true));
    autoDismissRef.current = window.setTimeout(hide, duration);

    return () => {
      cancelAnimationFrame(enter);
      window.clearTimeout(autoDismissRef.current);
      window.clearTimeout(exitTimeoutRef.current);
    };
  }, [duration, hide]);

  return (
    <div className={`fixed z-50 ${positionClasses} w-[calc(100%-2rem)] max-w-sm`}>
      <div
        className={`transition-all duration-300 ease-out
          ${visible ? 'opacity-100 translate-x-0' : hiddenClasses}
        `}
      >
        {children}
      </div>
    </div>
  );
}
