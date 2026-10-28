import { Link } from 'react-router';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { LedgerLine } from '@/components/LedgerLine';
import { PasswordInput } from '@/components/PasswordInput';
import { Toast } from '@/components/Toast';
import { VerificationCodeInput } from '../components/VerificationCodeInput';
import { OTP_CODE_LENGTH } from '../hooks/useOtpVerification';
import { usePasswordResetFlow } from '../hooks/usePasswordResetFlow';

export function ForgotPasswordPage() {
  const {
    step,
    email,
    showResetSent,
    dismissResetSent,
    restart,
    emailForm,
    codeForm,
    newPasswordForm,
  } = usePasswordResetFlow();

  if (step === 'code') {
    if (!email) return null;

    return (
      <>
        {showResetSent && !codeForm.error && (
          <Toast position="top-right" duration={5000} onDismiss={dismissResetSent}>
            <Banner
              tone="info"
              title="Reset code sent"
              description={`If an account exists, we sent a 6-digit code to ${email}.`}
              onDismiss={dismissResetSent}
            />
          </Toast>
        )}

        {codeForm.error && (
          <Toast position="top-right" duration={5000} onDismiss={() => codeForm.setError(null)}>
            <Banner
              tone="danger"
              title={codeForm.error}
              onDismiss={() => codeForm.setError(null)}
            />
          </Toast>
        )}

        <div className="mt-6 mb-6">
          <h1 className="text-3xl font-bold text-(--text) leading-tighter">
            Enter reset <br /> code
          </h1>
          <LedgerLine />
          <p className="text-left text-md text-(--text-muted) mt-1">
            Enter the 6-digit code sent to <span className="font-semibold">{email}</span>.
          </p>
        </div>

        <form onSubmit={codeForm.handleSubmit} className="flex flex-col gap-4 flex-1">
          <VerificationCodeInput
            value={codeForm.code}
            onChange={codeForm.setCode}
            disabled={codeForm.isSubmitting}
          />

          <div className="flex-1"></div>

          <Button
            type="submit"
            size="lg"
            isLoading={codeForm.isSubmitting}
            disabled={codeForm.code.length !== OTP_CODE_LENGTH}
          >
            Verify code
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => void codeForm.handleResend()}
            disabled={codeForm.resendInSeconds > 0 || codeForm.isSubmitting || codeForm.isResending}
          >
            {codeForm.isResending
              ? 'Sending...'
              : codeForm.resendInSeconds > 0
                ? `Resend code in ${codeForm.resendInSeconds}s`
                : 'Resend code'}
          </Button>

          <p className="text-center text-sm text-(--text-muted)">
            Wrong email?
            <button
              type="button"
              onClick={restart}
              className="pl-1 cursor-pointer focus-ring mx-auto text-sm font-semibold text-(--accent) underline underline-offset-2 transition-colors hover:text-(--text)"
            >
              Use Different Email
            </button>
          </p>
        </form>
      </>
    );
  }

  if (step === 'password') {
    return (
      <>
        {newPasswordForm.formState.errors.root?.message && (
          <Toast
            position="top-right"
            duration={5000}
            onDismiss={() => newPasswordForm.clearErrors('root')}
          >
            <Banner
              tone="danger"
              title={newPasswordForm.formState.errors.root.message}
              onDismiss={() => newPasswordForm.clearErrors('root')}
            />
          </Toast>
        )}

        <div className="mt-6 mb-6">
          <h1 className="text-3xl font-bold text-(--text) leading-tighter">
            Choose a new <br /> password
          </h1>
          <LedgerLine />
          <p className="text-left text-md text-(--text-muted) mt-1">
            Your code was verified for <span className="font-semibold">{email}</span>. Choose a new
            password to finish.
          </p>
        </div>

        <form onSubmit={newPasswordForm.submit} className="flex flex-col gap-4 flex-1">
          <Field
            id="password"
            label="New password"
            error={newPasswordForm.formState.errors.password?.message}
          >
            <PasswordInput
              id="password"
              placeholder="••••••••"
              {...newPasswordForm.register('password')}
              autoComplete="new-password"
            />
          </Field>

          <Field
            id="confirm-password"
            label="Confirm new password"
            error={newPasswordForm.formState.errors.confirmPassword?.message}
          >
            <PasswordInput
              id="confirm-password"
              placeholder="••••••••"
              {...newPasswordForm.register('confirmPassword')}
              autoComplete="new-password"
            />
          </Field>

          <div className="flex-1"></div>

          <Button
            type="submit"
            isLoading={newPasswordForm.formState.isSubmitting}
            className="w-full h-11 rounded-2xl font-bold"
          >
            Update password
          </Button>
        </form>
      </>
    );
  }

  return (
    <>
      {emailForm.formState.errors.root?.message && (
        <Toast position="top-right" duration={5000} onDismiss={() => emailForm.clearErrors('root')}>
          <Banner
            tone="danger"
            title={emailForm.formState.errors.root.message}
            onDismiss={() => emailForm.clearErrors('root')}
          />
        </Toast>
      )}

      <div className="mt-6 mb-6">
        <h1 className="text-3xl font-bold text-(--text) leading-tighter">
          Reset your <br /> password
        </h1>
        <LedgerLine />
        <p className="text-left text-md text-(--text-muted) mt-1">
          Enter your email and we'll send a 6-digit code if an account exists.
        </p>
      </div>

      <form onSubmit={emailForm.submit} className="flex flex-col gap-4 flex-1">
        <Field id="email" label="Email" error={emailForm.formState.errors.email?.message}>
          <Input
            type="email"
            id="email"
            placeholder="you@example.com"
            {...emailForm.register('email')}
            autoComplete="email"
          />
        </Field>

        <div className="flex-1"></div>

        <Button
          type="submit"
          isLoading={emailForm.formState.isSubmitting}
          className="w-full h-11 rounded-2xl font-bold"
        >
          Send reset code
        </Button>

        <p className="text-center text-sm text-(--text-muted)">
          Remembered it?{' '}
          <Link
            to="/login"
            className="pl-1 cursor-pointer focus-ring mx-auto text-sm font-semibold text-(--accent) underline underline-offset-2 transition-colors hover:text-(--text)"
          >
            Back to login
          </Link>
        </p>
      </form>
    </>
  );
}
