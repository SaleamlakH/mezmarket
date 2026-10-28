import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOtpVerification } from '../useOtpVerification';
import { RESEND_COOLDOWN_MS, type PendingOtp } from '../../lib/pendingOtp';
import type { ChangeEvent } from 'react';

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as ChangeEvent<HTMLFormElement>;
}

function mockPendingStore(pending: PendingOtp | null) {
  return {
    get: vi.fn(() => pending),
    start: vi.fn(),
    clear: vi.fn(),
    resendAvailableInMs: vi.fn(),
  };
}

interface RenderOtpOptions {
  pendingStore: ReturnType<typeof mockPendingStore>;
  clearOnVerified?: boolean;
}

function renderOtp({ pendingStore, clearOnVerified }: RenderOtpOptions) {
  const verify = vi.fn();
  const resend = vi.fn();
  const onVerified = vi.fn();

  const rendered = renderHook(() =>
    useOtpVerification({
      pendingStore,
      verify,
      resend,
      onVerified,
      ...(clearOnVerified === undefined ? {} : { clearOnVerified }),
    }),
  );

  return {
    ...rendered,
    pendingStore,
    verify,
    resend,
    onVerified,
  };
}

describe('useOtpVerification', () => {
  it('loads an existing pending OTP from the store', () => {
    const pending = {
      email: 'a@b.com',
      sentAt: Date.now() - RESEND_COOLDOWN_MS - 1_000,
    };
    const pendingStore = mockPendingStore(pending);

    const { result } = renderOtp({ pendingStore });

    expect(pendingStore.get).toHaveBeenCalled();
    expect(result.current.pending).toEqual(pending);
    expect(result.current.email).toBe('a@b.com');
    expect(result.current.resendInSeconds).toBe(0);
  });

  it('starts a pending OTP and clears the current code and error', () => {
    const nextPending = { email: 'a@b.com', sentAt: Date.now() };
    const pendingStore = mockPendingStore(null);

    const { result } = renderOtp({ pendingStore });
    pendingStore.start.mockReturnValue(nextPending);

    act(() => {
      result.current.setCode('123456');
      result.current.setError('Old error');
    });
    act(() => result.current.start('a@b.com'));

    expect(pendingStore.start).toHaveBeenCalledWith('a@b.com');
    expect(result.current.pending).toEqual(nextPending);
    expect(result.current.email).toBe('a@b.com');
    expect(result.current.code).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.resendInSeconds).toBeGreaterThan(0);
  });

  it('clears the pending OTP and the current code and error', () => {
    const pending = { email: 'a@b.com', sentAt: Date.now() };
    const pendingStore = mockPendingStore(pending);

    const { result } = renderOtp({ pendingStore });

    act(() => {
      result.current.setCode('123456');
      result.current.setError('Old error');
    });
    act(() => result.current.clear());

    expect(pendingStore.clear).toHaveBeenCalledOnce();
    expect(result.current.pending).toBeNull();
    expect(result.current.email).toBeNull();
    expect(result.current.code).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('resets the code and error without clearing the pending OTP', () => {
    const pending = { email: 'a@b.com', sentAt: Date.now() };
    const pendingStore = mockPendingStore(pending);

    const { result } = renderOtp({ pendingStore });

    act(() => {
      result.current.setCode('123456');
      result.current.setError('Old error');
    });
    act(() => result.current.reset());

    expect(pendingStore.clear).not.toHaveBeenCalled();
    expect(result.current.pending).toEqual(pending);
    expect(result.current.code).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('ignores submit without a pending OTP', async () => {
    const pendingStore = mockPendingStore(null);

    const { result, verify } = renderOtp({ pendingStore });

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(verify).not.toHaveBeenCalled();
  });

  it('ignores submit until a complete code is entered', async () => {
    const pending = { email: 'a@b.com', sentAt: Date.now() };
    const pendingStore = mockPendingStore(pending);

    const { result, verify } = renderOtp({ pendingStore });

    act(() => result.current.setCode('12345'));

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(verify).not.toHaveBeenCalled();
  });

  it('verifies the code, clears the pending OTP, and reports the email', async () => {
    const pending = { email: 'a@b.com', sentAt: Date.now() };
    const pendingStore = mockPendingStore(pending);

    const { result, verify, onVerified } = renderOtp({ pendingStore });

    verify.mockResolvedValue(undefined);
    act(() => result.current.setCode('123456'));
    const event = submitEvent();

    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(verify).toHaveBeenCalledWith('a@b.com', '123456');
    expect(pendingStore.clear).toHaveBeenCalledOnce();
    expect(result.current.pending).toBeNull();
    expect(result.current.code).toBe('');
    expect(onVerified).toHaveBeenCalledWith('a@b.com');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('keeps the pending OTP when clearOnVerified is false', async () => {
    const pending = { email: 'a@b.com', sentAt: Date.now() };
    const pendingStore = mockPendingStore(pending);

    const { result, verify, onVerified } = renderOtp({
      pendingStore,
      clearOnVerified: false,
    });

    verify.mockResolvedValue(undefined);
    act(() => result.current.setCode('123456'));

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(pendingStore.clear).not.toHaveBeenCalled();
    expect(result.current.pending).toEqual(pending);
    expect(onVerified).toHaveBeenCalledWith('a@b.com');
  });

  it('exposes the verification error and keeps the pending OTP', async () => {
    const pending = { email: 'a@b.com', sentAt: Date.now() };
    const pendingStore = mockPendingStore(pending);

    const { result, verify, onVerified } = renderOtp({ pendingStore });

    verify.mockRejectedValue(new Error('Invalid code'));
    act(() => result.current.setCode('123456'));

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(result.current.error).toBe('Invalid code');
    expect(pendingStore.clear).not.toHaveBeenCalled();
    expect(result.current.pending).toEqual(pending);
    expect(onVerified).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('clears an error on the next verification attempt', async () => {
    const pending = { email: 'a@b.com', sentAt: Date.now() };
    const pendingStore = mockPendingStore(pending);

    const { result, verify } = renderOtp({ pendingStore });

    verify.mockRejectedValueOnce(new Error('Invalid code')).mockResolvedValue(undefined);
    act(() => result.current.setCode('123456'));

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });
    expect(result.current.error).toBe('Invalid code');

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(result.current.error).toBeNull();
  });

  it('blocks resend during the cooldown', async () => {
    const pending = { email: 'a@b.com', sentAt: Date.now() };
    const pendingStore = mockPendingStore(pending);

    const { result, resend } = renderOtp({ pendingStore });

    await act(async () => {
      await result.current.handleResend();
    });

    expect(resend).not.toHaveBeenCalled();
    expect(pendingStore.start).not.toHaveBeenCalled();
  });

  it('resends the code and restarts the cooldown', async () => {
    const oldSentAt = Date.now() - RESEND_COOLDOWN_MS - 1_000;
    const pending = { email: 'a@b.com', sentAt: oldSentAt };
    const resentPending = { email: 'a@b.com', sentAt: Date.now() };
    const pendingStore = mockPendingStore(pending);

    const { result, resend } = renderOtp({ pendingStore });
    pendingStore.start.mockReturnValue(resentPending);
    resend.mockResolvedValue(undefined);
    act(() => result.current.setCode('123456'));

    await act(async () => {
      await result.current.handleResend();
    });

    expect(resend).toHaveBeenCalledWith('a@b.com');
    expect(pendingStore.start).toHaveBeenCalledWith('a@b.com', expect.any(Number));
    expect(result.current.pending).toEqual(resentPending);
    expect(result.current.code).toBe('');
    expect(result.current.resendInSeconds).toBeGreaterThan(0);
    expect(result.current.isResending).toBe(false);
  });

  it('exposes the resend error without changing the pending OTP', async () => {
    const oldSentAt = Date.now() - RESEND_COOLDOWN_MS - 1_000;
    const pending = { email: 'a@b.com', sentAt: oldSentAt };
    const pendingStore = mockPendingStore(pending);

    const { result, resend } = renderOtp({ pendingStore });

    resend.mockRejectedValue(new Error('Email rate limit exceeded'));

    await act(async () => {
      await result.current.handleResend();
    });

    expect(result.current.error).toBe('Email rate limit exceeded');
    expect(pendingStore.start).not.toHaveBeenCalled();
    expect(result.current.pending).toEqual(pending);
    expect(result.current.isResending).toBe(false);
  });
});
