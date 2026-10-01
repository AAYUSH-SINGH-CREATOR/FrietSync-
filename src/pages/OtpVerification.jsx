import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import AuthLayout from '../components/layout/AuthLayout';
import OtpInput from '../components/ui/OtpInput';
import Button from '../components/ui/Button';
import { verifyOtp, sendForgotPasswordOtp } from '../services/authApi';

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';

  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    if (!email) {
      navigate('/signup', { replace: true });
    }
  }, [email, navigate]);

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setErrorMessage('Please enter all 6 digits.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await verifyOtp(email, otpString);
      navigate('/login');
    } catch (error) {
      setErrorMessage(error.message || 'Wrong OTP entered');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage('');
    setResendStatus('Sending new code...');
    try {
      await sendForgotPasswordOtp(email);
      setResendStatus('Code resent successfully!');
      setTimeout(() => setResendStatus(''), 4000);
    } catch (err) {
      setResendStatus('');
      setErrorMessage(err.message || 'Failed to resend code.');
    }
  };

  return (
    <AuthLayout showLeftIllustration={false} onBack={() => navigate('/signup')}>
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Verify your account
        </h2>

        <p className="text-xs sm:text-sm text-gray-600 mb-6 sm:mb-8">
          Enter code sent to{' '}
          <span className="font-semibold text-gray-900">{email}</span>
        </p>

        <div className="my-4">
          <OtpInput
            otp={otp}
            setOtp={(newOtp) => {
              setOtp(newOtp);
              if (errorMessage) setErrorMessage('');
            }}
            error={errorMessage}
            length={6}
          />
        </div>

        <p className="text-xs sm:text-sm text-gray-600 my-5">
          Didn't recieve the code ?{' '}
          <button
            type="button"
            onClick={handleResend}
            className="text-sky-600 font-semibold hover:underline cursor-pointer"
          >
            Resend
          </button>
        </p>

        {resendStatus && (
          <p className="text-xs text-green-600 font-medium -mt-3 mb-4">
            {resendStatus}
          </p>
        )}

        <Button onClick={handleVerify} isLoading={isLoading}>
          Verify account
        </Button>

        <div className="mt-6">
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-medium hover:text-sky-700 transition"
          >
            <FiArrowLeft size={16} /> Back to sign up
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default OtpVerification;