import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { pendingVerification } from '../lib/pendingOtp';
import { useOtpVerification } from './useOtpVerification';

export function useVerifyEmailFlow() {
  const navigate = useNavigate();
  const { session, verifyOtp, resendSignupOtp } = useAuthContext();

  const otp = useOtpVerification({
    pendingStore: pendingVerification,
    verify: async (email, code) => {
      await verifyOtp({ email, token: code, type: 'email' });
    },
    resend: resendSignupOtp,
    onVerified: () => navigate('/', { replace: true }),
  });

  const email = otp.email;

  useEffect(() => {
    if (session.status === 'authenticated' && session.user?.emailVerifiedAt) {
      navigate('/', { replace: true });
      return;
    }

    if (!email) {
      navigate('/signup', { replace: true });
    }
  }, [email, navigate, session]);

  return otp;
}
