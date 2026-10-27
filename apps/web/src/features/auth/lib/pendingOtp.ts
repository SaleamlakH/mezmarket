export const RESEND_COOLDOWN_MS = 60 * 1000;

export interface PendingOtp {
  email: string;
  sentAt: number;
}

export interface PendingOtpStore {
  start(email: string, now?: number): PendingOtp;
  get(): PendingOtp | null;
  clear(): void;
  resendAvailableInMs(now?: number): number;
}

export function createPendingOtpStore(): PendingOtpStore {
  let pending: PendingOtp | null = null;

  return {
    start(email, now = Date.now()) {
      pending = {
        email,
        sentAt: now,
      };

      return pending;
    },

    get() {
      return pending;
    },

    clear() {
      pending = null;
    },

    resendAvailableInMs(now = Date.now()) {
      if (!pending) return 0;

      return Math.max(0, pending.sentAt + RESEND_COOLDOWN_MS - now);
    },
  };
}

export const pendingVerification = createPendingOtpStore();
