import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { pendingVerification } from '../lib/pendingOtp';
import { useOtpVerification } from './useOtpVerification';

export function useVerifyEmailFlow() {
  const navigate = useNavigate();
  const { session, verifyOtp, resendSignupOtp } = useAuthContext();
  const [verified, setVerified] = useState(false);

  const otp = useOtpVerification({
    pendingStore: pendingVerification,
    verify: async (email, code) => {
      await verifyOtp({ email, token: code, type: 'email' });
    },
    resend: resendSignupOtp,
    onVerified: () => setVerified(true),
  });

  const email = otp.email;

  useEffect(() => {
    if (session.status === 'authenticated' && session.user?.emailVerifiedAt) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!email && !verified) {
      navigate('/signup', { replace: true });
    }
  }, [email, navigate, session, verified]);

  return otp;
}
