import { useState } from 'react';
import { FiArrowLeft, FiEye, FiEyeOff, FiLoader } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import OtpInput from '../../../components/ui/OtpInput';
import { getFriendlyErrorMessage, resetPassword, sendForgotPasswordOtp } from '../../auth/services/authApi';

const emptyOtp = () => new Array(6).fill('');

const SettingsPasswordReset = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email || '';
  const [otp, setOtp] = useState(emptyOtp);
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [visible, setVisible] = useState({ newPassword: false, confirmPassword: false });
  const [isLoading, setIsLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [otpError, setOtpError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const criteria = {
    minLength: passwords.newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(passwords.newPassword),
    hasLower: /[a-z]/.test(passwords.newPassword),
    hasNumber: /[0-9]/.test(passwords.newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(passwords.newPassword),
  };

  const handleResend = async () => {
    if (!email || isLoading) return;
    setErrorMessage('');
    setOtpError('');
    setResendStatus('Sending new code...');
    try {
      await sendForgotPasswordOtp(email);
      setResendStatus('Code resent successfully.');
    } catch (error) {
      setResendStatus('');
      setErrorMessage(getFriendlyErrorMessage(error, 'forgot-password'));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const code = otp.join('');
    const errors = {};
    if (!/^\d{6}$/.test(code)) setOtpError('Enter the complete 6-digit code.');
    if (!passwords.newPassword) errors.newPassword = 'New password is required.';
    else if (!Object.values(criteria).every(Boolean)) errors.newPassword = 'Password does not meet the requirements.';
    if (!passwords.confirmPassword) errors.confirmPassword = 'Confirm password is required.';
    else if (passwords.confirmPassword !== passwords.newPassword) errors.confirmPassword = "Passwords don't match.";
    setFieldErrors(errors);
    if (!/^\d{6}$/.test(code) || Object.keys(errors).length || !email) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      await resetPassword(email, code, passwords.newPassword);
      navigate('/dashboard/settings', { state: { passwordResetSuccess: true } });
    } catch (error) {
      const status = error.response?.status || error.status;
      const message = (error.data?.message || error.message || '').toLowerCase();
      if (status === 410) setOtpError('This code has expired. Resend a new code and try again.');
      else if (status === 400 || status === 401 || message.includes('otp') || message.includes('code')) setOtpError('The code is invalid. Check it and try again.');
      else setErrorMessage(getFriendlyErrorMessage(error, 'reset-password'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-700 shadow-sm dark:border-[#303641] dark:bg-[#20232b] dark:text-slate-200">
      <p className="mb-4">Start a password reset from Privacy &amp; Security to request a verification code.</p>
      <button type="button" onClick={() => navigate('/dashboard/settings')} className="font-semibold text-sky-600 hover:underline dark:text-sky-400">Back to Settings</button>
    </div>;
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10 dark:border-[#303641] dark:bg-[#20232b]">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Reset Password</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-slate-600 dark:text-slate-300">
          Enter the code sent to <span className="font-semibold text-slate-900 dark:text-white">{email}</span> and set your new password.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <OtpInput otp={otp} setOtp={(next) => { setOtp(next); setOtpError(''); setErrorMessage(''); }} error={otpError} length={6} dashboardTheme />
        <p className="-mt-2 text-center text-sm text-slate-600 dark:text-slate-300">
          Didn’t receive the code?{' '}
          <button type="button" onClick={handleResend} disabled={isLoading || resendStatus === 'Sending new code...'} className="font-semibold text-sky-600 hover:underline disabled:opacity-50 dark:text-sky-400">Resend</button>
        </p>
        {resendStatus && <p role="status" className="-mt-3 text-center text-xs text-emerald-600 dark:text-emerald-400">{resendStatus}</p>}

        {['newPassword', 'confirmPassword'].map((key) => {
          const label = key === 'newPassword' ? 'New Password' : 'Confirm Password';
          const placeholder = key === 'newPassword' ? 'Enter Password' : 'Re-enter Password';
          return (
            <div key={key}>
              <label htmlFor={key} className="mb-1.5 block text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</label>
              <div className="relative">
                <input
                  id={key}
                  type={visible[key] ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwords[key]}
                  placeholder={placeholder}
                  onChange={(event) => { setPasswords((current) => ({ ...current, [key]: event.target.value })); setFieldErrors((current) => ({ ...current, [key]: '' })); }}
                  className={`w-full rounded-2xl border bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:bg-[#171a21] dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-sky-900/40 ${fieldErrors[key] ? 'border-rose-500' : 'border-slate-300 dark:border-[#414856]'}`}
                />
                <button type="button" onClick={() => setVisible((current) => ({ ...current, [key]: !current[key] }))} aria-label={visible[key] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                  {visible[key] ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                </button>
              </div>
              {fieldErrors[key] && <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{fieldErrors[key]}</p>}
            </div>
          );
        })}

        {errorMessage && <p role="alert" className="text-center text-sm font-medium text-rose-600 dark:text-rose-400">{errorMessage}</p>}
        <button type="submit" disabled={isLoading} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-300 px-5 py-3.5 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-70 dark:bg-sky-500 dark:hover:bg-sky-400">
          {isLoading && <FiLoader className="animate-spin" size={17} />}{isLoading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <button type="button" onClick={() => navigate('/dashboard/settings')} className="mx-auto mt-6 flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline dark:text-sky-400">
        <FiArrowLeft size={16} /> Back to Settings
      </button>
    </section>
  );
};

export default SettingsPasswordReset;
