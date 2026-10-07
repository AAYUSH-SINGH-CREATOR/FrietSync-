import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import OtpInput from '../components/ui/OtpInput';
import Button from '../components/ui/Button';
import forgetPassImg from '../assets/forgetpass.svg';
import { sendForgotPasswordOtp, resetPassword, getFriendlyErrorMessage } from '../services/authApi';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(() => {
    return sessionStorage.getItem('forgot_password_email') || '';
  });

  useEffect(() => {
    sessionStorage.setItem('forgot_password_email', email);
  }, [email]);
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [otpError, setOtpError] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [showRequirements, setShowRequirements] = useState(false);

  const criteria = {
    minLength: passwords.newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(passwords.newPassword),
    hasLower: /[a-z]/.test(passwords.newPassword),
    hasNumber: /[0-9]/.test(passwords.newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(passwords.newPassword),
  };

  const isPasswordValid = Object.values(criteria).every(Boolean);

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setOtp(new Array(6).fill(''));
      setPasswords({ newPassword: '', confirmPassword: '' });
      setErrorMessage('');
      setOtpError('');
      setFieldErrors({});
      setShowRequirements(false);
    }
     else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1); }  
    else {
      navigate('/login');
    }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();

    if (!email.trim()) {
      setFieldErrors({ email: 'Email is required' });
      return;
    }

    setFieldErrors({});
    setErrorMessage('');
    setIsLoading(true);

    try {
      await sendForgotPasswordOtp(email);
      setStep(2);
    } catch (error) {
      const status = error.response?.status || error.status;
      const rawMsg = (error.data?.message || error.message || '').toLowerCase();

      if (
        status === 404 ||
        rawMsg.includes('not registered')
      ) {
        setFieldErrors({ email: 'email not registered' });
      } else if (status === 429) {
        setErrorMessage('Too many OTP requests. Please wait a moment');
      } else if (status >= 500) {
        setErrorMessage('Something went wrong. Please try again later.');
      } else {
        setErrorMessage(getFriendlyErrorMessage(error, 'forgot-password'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setErrorMessage('');
    setResendStatus('Sending new code...');
    try {
      await sendForgotPasswordOtp(email);
      setResendStatus('Code resent successfully!');
      setTimeout(() => setResendStatus(''), 4000);
    } catch (err) {
      setResendStatus('');
        const status = err.response?.status || err.status;
      if (status === 429) {
        setErrorMessage('Too many requests. Please wait a moment');
      } else if (status >= 500) {
        setErrorMessage('Something went wrong. Please try again later.');
      } else {
        setErrorMessage(getFriendlyErrorMessage(err, 'forgot-password'));
      }
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();

    const errors = {};
    const otpString = otp.join('');

    if (otpString.length < 6) {
      setOtpError('Wrong OTP entered');
      return;
    }

    if (!passwords.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (!isPasswordValid) {
      errors.newPassword = (
        <span>
          Password doesn't meet{' '}
          <button
            type="button"
            onClick={() => setShowRequirements((prev) => !prev)}
            className="underline cursor-pointer hover:text-red-700 font-semibold"
          >
            requirements
          </button>
        </span>
      );
      setShowRequirements(true);
    }

    if (!passwords.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (passwords.newPassword !== passwords.confirmPassword) {
      errors.confirmPassword = "Password doesn't match";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setOtpError('');
    setErrorMessage('');
    setIsLoading(true);

    try {
      await resetPassword(email, otpString, passwords.newPassword);
      sessionStorage.removeItem('forgot_password_email');
      navigate('/login');
    } catch (error) {
        const status = error.response?.status || error.status;
      const rawMsg = (error.data?.message || error.message || '').toLowerCase();

      if (
        status === 400 ||
        status === 401 ||
        rawMsg.includes('otp') ||
        rawMsg.includes('code')
      ) {
        setOtpError('Wrong OTP entered');
      } else if (status === 410) {
        setOtpError('This OTP has expired.');
      } else if (status === 429) {
        setErrorMessage('Too many attempts. Please wait a moment and try again.');
      } else if (status >= 500) {
        setErrorMessage('Something went wrong. Please try again later.');
      } else {
        setErrorMessage(getFriendlyErrorMessage(error, 'reset-password'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      showLeftIllustration={true}
      leftTitle="Recover your account with"
      leftBrand="Frietsync"
      leftImage={forgetPassImg}
      onBack={handleBack}
    >
      {step === 1 && (
        <div className="text-center w-full">
          <h2 className="text-2xl sm:text-[32px] font-semibold text-gray-900 leading-tight">
            Forgot Password ?
          </h2>

          <p className="text-xs sm:text-[15px] text-gray-600 mt-1.5 mb-5 sm:mb-6">
            Enter your registered email to receive an OTP.
          </p>

          <form onSubmit={handleSendOtp} className="space-y-4">
            <Input
              id="email"
              label="Enter email"
              type="email"
              placeholder="Enter registered email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors({});
                if (errorMessage) setErrorMessage('');
              }}
              error={fieldErrors.email}
            />

            <div className="pt-2 sm:pt-3">
              <Button type="submit" isLoading={isLoading} onClick={handleSendOtp}>
                Send OTP
              </Button>
            </div>
          </form>

          {errorMessage && (
            <p className="text-xs sm:text-sm text-[#FF1100] mt-4 text-center font-medium">
              {errorMessage}
            </p>
          )}

          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-sky-600 font-medium hover:text-sky-700 transition"
            >
              <FiArrowLeft size={16} /> Back to log in
            </Link>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="text-center w-full">
          <h2 className="text-2xl sm:text-[32px] font-semibold text-gray-900 leading-tight">
            Reset Password
          </h2>

          <p className="text-xs sm:text-[15px] text-gray-600 mt-1.5 mb-4 sm:mb-5">
            Enter code sent to{' '}
            <span className="font-semibold text-gray-900">{email}</span> and set your new password
          </p>

          <form onSubmit={handleResetPassword} className="space-y-3.5 sm:space-y-4">
            <div className="my-1 flex justify-center">
              <OtpInput
                otp={otp}
                setOtp={(newOtp) => {
                  setOtp(newOtp);
                  if (otpError) setOtpError('');
                  if (errorMessage) setErrorMessage('');
                }}
                error={otpError}
                length={6}
              />
            </div>

            <div className="-mt-1 mb-1">
              <p className="text-xs sm:text-sm text-gray-600">
                Didn't recieve the code ?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-sky-600 font-semibold hover:underline cursor-pointer"
                >
                  Resend
                </button>
              </p>
              {resendStatus && (
                <p className="text-xs text-green-600 font-medium mt-1">
                  {resendStatus}
                </p>
              )}
            </div>

            <div className="relative text-left">
              <Input
                id="newPassword"
                label="New Password"
                type="password"
                placeholder="Enter Password"
                value={passwords.newPassword}
                onChange={(e) => {
                  const val = e.target.value;
                  setPasswords((prev) => ({ ...prev, newPassword: val }));
                  if (fieldErrors.newPassword) {
                    setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
                  }
                  const newCriteria = {
                    minLength: val.length >= 8,
                    hasUpper: /[A-Z]/.test(val),
                    hasLower: /[a-z]/.test(val),
                    hasNumber: /[0-9]/.test(val),
                    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(val),
                  };
                  if (Object.values(newCriteria).every(Boolean)) {
                    setShowRequirements(false);
                  }
                }}
                onFocus={() => {
                  if (passwords.newPassword.length > 0 && !isPasswordValid) {
                    setShowRequirements(true);
                  }
                }}
                error={fieldErrors.newPassword}
              />

              {showRequirements && (
                <div className="absolute bottom-full right-0 mb-2 w-full sm:w-[330px] bg-white border border-gray-400 rounded-2xl p-4 shadow-xl z-50 text-left transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs sm:text-[13px] font-semibold text-gray-900">
                      Password must contain at least 8 characters
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowRequirements(false)}
                      className="text-gray-400 hover:text-gray-700 text-sm font-bold ml-2 cursor-pointer leading-none p-0.5"
                      aria-label="Close requirements"
                    >
                      ✕
                    </button>
                  </div>

                  <ul className="text-xs sm:text-[13px] space-y-1.5 pl-5 list-disc text-gray-700">
                    <li className={criteria.hasUpper ? 'text-green-600 font-medium' : ''}>
                      One uppercase letter (A–Z)
                    </li>
                    <li className={criteria.hasLower ? 'text-green-600 font-medium' : ''}>
                      One lowercase letter (a–z)
                    </li>
                    <li className={criteria.hasNumber ? 'text-green-600 font-medium' : ''}>
                      One number (0–9)
                    </li>
                    <li className={criteria.hasSpecial ? 'text-green-600 font-medium' : ''}>
                      One special character (!, @, #, $, %, etc.)
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="text-left">
              <Input
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder="Re-enter Password"
                value={passwords.confirmPassword}
                onChange={(e) => {
                  const val = e.target.value;
                  setPasswords((prev) => ({ ...prev, confirmPassword: val }));
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                error={fieldErrors.confirmPassword}
              />
            </div>

            <div className="pt-2 sm:pt-3">
              <Button type="submit" isLoading={isLoading} onClick={handleResetPassword}>
                Reset Password
              </Button>
            </div>
          </form>

          {errorMessage && (
            <p className="text-xs sm:text-sm text-[#FF1100] mt-4 text-center font-medium">
              {errorMessage}
            </p>
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-sky-600 font-medium hover:text-sky-700 transition cursor-pointer"
            >
              <FiArrowLeft size={16} /> Back to email entry
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;