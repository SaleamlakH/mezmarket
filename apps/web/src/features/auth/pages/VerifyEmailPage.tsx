import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { LedgerLine } from '@/components/LedgerLine';
import { Toast } from '@/components/Toast';
import { VerificationCodeInput } from '../components/VerificationCodeInput';
import { OTP_CODE_LENGTH } from '../hooks/useOtpVerification';
import { useVerifyEmailFlow } from '../hooks/useVerifyEmailFlow';

export function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showVerificationSent, setShowVerificationSent] = useState(() =>
    Boolean((location.state as { verificationSent?: boolean } | null)?.verificationSent),
  );
  const {
    email,
    code,
    setCode,
    error,
    setError,
    isSubmitting,
    isResending,
    resendInSeconds,
    handleSubmit,
    handleResend,
  } = useVerifyEmailFlow();

  if (!email) return null;

  function dismissVerificationSent() {
    setShowVerificationSent(false);
    navigate(location.pathname, { replace: true, state: null });
  }

  return (
    <>
      {showVerificationSent && !error && (
        <Toast position="top-right" duration={5000} onDismiss={dismissVerificationSent}>
          <Banner
            tone="success"
            title="Verification code sent"
            description={`We sent a 6-digit code to ${email}. Check your inbox.`}
            onDismiss={dismissVerificationSent}
          />
        </Toast>
      )}

      {error && (
        <Toast position="top-right" duration={5000} onDismiss={() => setError(null)}>
          <Banner tone="danger" title={error} onDismiss={() => setError(null)} />
        </Toast>
      )}

      <div className="mt-6 mb-6">
        <h1 className="text-3xl font-bold text-(--text) leading-tighter">
          Verify your <br /> email
        </h1>
        <LedgerLine />
        <p className="text-left text-md text-(--text-muted) mt-1">
          Enter the 6-digit code we sent to <span className="font-semibold">{email}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
        <VerificationCodeInput value={code} onChange={setCode} disabled={isSubmitting} />

        <div className="flex-1"></div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={code.length !== OTP_CODE_LENGTH}
          className="w-full h-11 rounded-2xl"
        >
          Verify email
        </Button>

        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resendInSeconds > 0 || isSubmitting || isResending}
          className="focus-ring mx-auto text-sm font-semibold text-(--text-muted) underline underline-offset-2 transition-colors hover:text-(--text) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending
            ? 'Sending...'
            : resendInSeconds > 0
              ? `Resend code in ${resendInSeconds}s`
              : 'Resend code'}
        </button>

        <p className="text-center text-sm text-(--text-muted)">
          Wrong email?{' '}
          <Link
            to="/signup"
            className="text-(--accent) font-bold no-underline cursor-pointer hover:text-(--accent-hover)"
          >
            Sign up again
          </Link>
        </p>
      </form>
    </>
  );
}
