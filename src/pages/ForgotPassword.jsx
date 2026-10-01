import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import OtpInput from '../components/ui/OtpInput';
import Button from '../components/ui/Button';
import forgetPassImg from '../assets/forgetpass.svg';
import { sendForgotPasswordOtp, resetPassword } from '../services/authApi';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
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
      setShowRequirements(false);
    } else {
      navigate('/login');
    }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();

    if (!email.trim()) {
      setFieldErrors({ email: 'Please enter your registered email' });
      return;
    }

    setFieldErrors({});
    setErrorMessage('');
    setIsLoading(true);

    try {
      await sendForgotPasswordOtp(email);
      setStep(2);
    } catch (error) {
      const msg = error.message || 'Failed to send OTP.';
      if (
        msg.toLowerCase().includes('not registered') ||
        msg.toLowerCase().includes('user') ||
        msg.toLowerCase().includes('email')
      ) {
        setFieldErrors({ email: msg });
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();

    const errors = {};
    const otpString = otp.join('');
    
    if (otpString.length < 6) {
      setErrorMessage('Please enter the complete 6-digit OTP.');
      return;
    }

    // Password requirements check matching the Signup flow
    if (!passwords.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (!isPasswordValid) {
      errors.newPassword = (
        <span className="text-red-500 text-xs">
          Password doesn't meet{' '}
          <span
            onClick={() => setShowRequirements((prev) => !prev)}
            className="underline cursor-pointer hover:text-red-700 font-semibold"
          >
            requirements
          </span>
        </span>
      );
      setShowRequirements(true);
    }

    if (!passwords.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (passwords.newPassword !== passwords.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match!';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setErrorMessage('');
    setIsLoading(true);

    try {
      await resetPassword(email, otpString, passwords.newPassword);
      navigate('/login');
    } catch (error) {
      const msg = error.message || 'Failed to reset password. Please check your OTP.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      showLeftIllustration={step === 1}
      leftTitle="Recover your account with"
      leftBrand="Frietsync"
      leftImage={forgetPassImg}
      onBack={handleBack}
    >
      {step === 1 && (
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            Forgot Password ?
          </h2>

          <form onSubmit={handleSendOtp} className="space-y-5">
            <Input
              id="email"
              label="Enter email"
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors({});
                if (errorMessage) setErrorMessage('');
              }}
              error={fieldErrors.email}
            />

            <div className="pt-2">
              <Button type="submit" isLoading={isLoading} onClick={handleSendOtp}>
                Send OTP
              </Button>
            </div>
          </form>

          {errorMessage && (
            <p className="text-xs sm:text-sm text-red-500 mt-4 text-center font-medium">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Reset Password
          </h2>

          <p className="text-xs sm:text-sm text-gray-600 mb-6">
            Enter the code sent to <span className="font-semibold text-gray-900">{email}</span> and your new password.
          </p>

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="my-2 flex justify-center">
              <OtpInput
                otp={otp}
                setOtp={(newOtp) => {
                  setOtp(newOtp);
                  if (errorMessage) setErrorMessage('');
                }}
                error={errorMessage.includes('OTP') ? errorMessage : ''}
                length={6}
              />
            </div>

            <div className="relative">
              <Input
                id="newPassword"
                label="New Password"
                type="password"
                placeholder="Enter Password"
                value={passwords.newPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setPasswords({ ...passwords, newPassword: value });
                  if (fieldErrors.newPassword) setFieldErrors({ ...fieldErrors, newPassword: '' });
                  
                  const newCriteria = {
                    minLength: value.length >= 8,
                    hasUpper: /[A-Z]/.test(value),
                    hasLower: /[a-z]/.test(value),
                    hasNumber: /[0-9]/.test(value),
                    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(value),
                  };
                  if (Object.values(newCriteria).every(Boolean)) {
                    setShowRequirements(false);
                  }
                }}
                error={fieldErrors.newPassword}
              />

              {showRequirements && (
                <div className="absolute bottom-full right-0 mb-2 w-full sm:w-[330px] bg-white border border-gray-400 rounded-[20px] p-4 shadow-xl z-50 text-left transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs sm:text-[13px] font-semibold text-gray-900">
                      Password must contain at least 8 characters
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowRequirements(false)}
                      className="text-gray-400 hover:text-gray-700 text-sm font-bold ml-2 cursor-pointer leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  <ul className="text-xs sm:text-[13px] space-y-1.5 pl-5 list-disc text-gray-800">
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

            <Input
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="Confirm Password"
              value={passwords.confirmPassword}
              onChange={(e) => {
                setPasswords({ ...passwords, confirmPassword: e.target.value });
                if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
              }}
              error={fieldErrors.confirmPassword}
            />

            <div className="pt-2">
              <Button type="submit" isLoading={isLoading} onClick={handleResetPassword}>
                Reset Password
              </Button>
            </div>
          </form>

          {errorMessage && !errorMessage.includes('OTP') && (
            <p className="text-xs sm:text-sm text-red-500 mt-4 text-center font-medium">
              {errorMessage}
            </p>
          )}

          <p className="text-xs sm:text-sm text-gray-600 mt-5">
            Didn't receive the code?{' '}
            <button
              type="button"
              onClick={handleSendOtp}
              className="text-sky-600 font-semibold hover:underline cursor-pointer"
            >
              Resend
            </button>
          </p>
        </div>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;