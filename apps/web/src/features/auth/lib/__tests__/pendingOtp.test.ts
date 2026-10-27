import { beforeEach, describe, expect, it } from 'vitest';
import { RESEND_COOLDOWN_MS, createPendingOtpStore, pendingVerification } from '../pendingOtp';

describe('pending OTP store', () => {
  const store = createPendingOtpStore();

  beforeEach(() => {
    store.clear();
    pendingVerification.clear();
    sessionStorage.clear();
  });

  it('keeps the pending email in memory', () => {
    const pending = store.start('a@b.com', 1_000);

    expect(pending).toEqual({
      email: 'a@b.com',
      sentAt: 1_000,
    });
    expect(store.get()).toEqual(pending);
    expect(sessionStorage.length).toBe(0);
  });

  it('clears the pending OTP', () => {
    store.start('a@b.com');

    store.clear();

    expect(store.get()).toBeNull();
  });

  it('reports the remaining resend cooldown', () => {
    store.start('a@b.com', 1_000);

    expect(store.resendAvailableInMs(1_000)).toBe(RESEND_COOLDOWN_MS);
    expect(store.resendAvailableInMs(1_000 + RESEND_COOLDOWN_MS)).toBe(0);
  });
});
