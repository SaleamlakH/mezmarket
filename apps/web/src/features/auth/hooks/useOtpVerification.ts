import { useEffect, useState } from 'react';
import type { ChangeEventHandler, Dispatch, SetStateAction } from 'react';
import { RESEND_COOLDOWN_MS, type PendingOtp, type PendingOtpStore } from '../lib/pendingOtp';

export const OTP_CODE_LENGTH = 6;

interface UseOtpVerificationOptions {
  pendingStore: PendingOtpStore;
  verify: (email: string, code: string) => Promise<void>;
  resend: (email: string) => Promise<void>;
  onVerified: (email: string) => void;
  clearOnVerified?: boolean;
}

export interface UseOtpVerificationReturn {
  pending: PendingOtp | null;
  email: string | null;
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  isSubmitting: boolean;
  isResending: boolean;
  resendInSeconds: number;
  start: (email: string) => void;
  clear: () => void;
  handleSubmit: ChangeEventHandler<HTMLFormElement>;
  handleResend: () => Promise<void>;
  reset: () => void;
}

export function useOtpVerification({
  pendingStore,
  verify,
  resend,
  onVerified,
  clearOnVerified = true,
}: UseOtpVerificationOptions): UseOtpVerificationReturn {
  const [pending, setPending] = useState<PendingOtp | null>(() => pendingStore.get());
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const email = pending?.email ?? null;
  const resendInMs = pending ? Math.max(0, pending.sentAt + RESEND_COOLDOWN_MS - now) : 0;
  const resendInSeconds = Math.ceil(resendInMs / 1000);

  useEffect(() => {
    if (!pending) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pending]);

  const handleSubmit: ChangeEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!pending || code.length !== OTP_CODE_LENGTH || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await verify(pending.email, code);
      setCode('');
      if (clearOnVerified) {
        pendingStore.clear();
        setPending(null);
      }
      onVerified(pending.email);
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  async function handleResend() {
    if (!pending || isResending || resendInMs > 0) return;

    const resentAt = Date.now();
    setIsResending(true);
    setError(null);

    try {
      await resend(pending.email);
      setPending(pendingStore.start(pending.email, resentAt));
      setCode('');
      setNow(resentAt);
    } catch (resendError) {
      setError((resendError as Error).message);
    } finally {
      setIsResending(false);
    }
  }

  function start(nextEmail: string) {
    const next = pendingStore.start(nextEmail);
    setPending(next);
    setCode('');
    setError(null);
    setNow(next.sentAt);
  }

  function clear() {
    pendingStore.clear();
    setPending(null);
    setCode('');
    setError(null);
  }

  function reset() {
    setCode('');
    setError(null);
  }

  return {
    pending,
    email,
    code,
    setCode,
    error,
    setError,
    isSubmitting,
    isResending,
    resendInSeconds,
    start,
    clear,
    handleSubmit,
    handleResend,
    reset,
  };
}
