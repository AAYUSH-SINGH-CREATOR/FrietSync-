import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { sendForgotPasswordOtp, resetPassword } from '../services/authApi';
import { FiSun, FiEye, FiEyeOff, FiArrowLeft } from "react-icons/fi";
import { FaMoon } from "react-icons/fa";
import forgetpassImg from '../assets/forgetpass.svg';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { isDarkMode, setIsDarkMode } = useTheme();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const inputRefs = useRef([]);

  const handleSendOtp = async () => {
    if (!email) {
      setErrorMessage("Please enter your registered email.");
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    try {
      await sendForgotPasswordOtp(email);
      setStep(2); 
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;
    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);
    if (element.nextSibling && element.value !== "") {
      element.nextSibling.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = () => {
    const otpString = otp.join("");
    if (otpString.length < 6) {
      setErrorMessage("Please enter all 6 digits.");
      return;
    }
    setErrorMessage('');
    setStep(3); 
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.id]: e.target.value });
  };

  const handleResetPassword = async () => {
    if (!passwords.newPassword || !passwords.confirmPassword) {
      setErrorMessage("Please fill in all fields.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }
    
    setErrorMessage('');
    setIsLoading(true);
    
    try {
      const otpString = otp.join("");
      await resetPassword(email, otpString, passwords.newPassword);
      navigate('/login'); 
    } catch (error) {
      setErrorMessage(error.message);
      if (error.message.toLowerCase().includes("otp") || error.message.toLowerCase().includes("code")) {
         setStep(2);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#6BBAEC00] to-[#02A2FF] dark:bg-gradient-to-b dark:from-zinc-900 dark:to-cyan-950 font-sans p-3 sm:p-4 relative overflow-hidden transition-colors duration-300 flex flex-col items-center justify-center">
      
      <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96 bg-pink-100 rounded-full blur-[70px] sm:blur-[100px] opacity-60 dark:opacity-0 transition-opacity"></div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-2 sm:gap-3 z-50">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200"><FiSun /></span>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="relative inline-flex h-6 w-11 sm:w-12 items-center rounded-full bg-zinc-300 dark:bg-zinc-700 transition-colors duration-300 focus:outline-none">
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ease-in-out ${isDarkMode ? 'translate-x-6 sm:translate-x-7' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200"><FaMoon /></span>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[500px] border border-zinc-100 dark:border-zinc-800 relative z-10 transition-colors mt-12 sm:mt-0">
        
        {step === 1 && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl sm:text-[28px] font-bold text-zinc-950 dark:text-white mb-6 text-center">
              Forgot Password ?
            </h2>
            
            <img src={forgetpassImg} alt="Forgot Password Illustration" className="w-100 h-auto mb-8 object-contain" />
            
            <div className="w-full mb-6">
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-800 dark:text-zinc-300 mb-1.5 ml-1">
                Enter email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter registered email"
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#2a2a2a] text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600 outline-none transition-all"
              />
            </div>
            
            <button
              onClick={handleSendOtp}
              disabled={isLoading}
              className="w-full bg-[#B7E4FF] hover:bg-sky-300 text-zinc-950 font-bold py-3 rounded-xl shadow-sm transition duration-150 disabled:opacity-70"
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold text-zinc-950 dark:text-white mb-2 text-center">Verify OTP</h2>
            <p className="text-sm text-center text-zinc-600 dark:text-zinc-400 mb-8">
              Enter code sent to <span className="font-semibold text-zinc-800 dark:text-zinc-200">{email}</span>
            </p>

            <div className="flex justify-center gap-2 sm:gap-3 mb-8">
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  value={data}
                  ref={ref => inputRefs.current[index] = ref}
                  onChange={e => handleOtpChange(e.target, index)}
                  onKeyDown={e => handleOtpKeyDown(e, index)}
                  onFocus={e => e.target.select()}
                  className="w-10 h-12 sm:w-12 sm:h-14 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg text-center text-xl font-semibold text-zinc-900 dark:text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-300 outline-none transition-all"
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOtp}
              className="w-full bg-[#B7E4FF] hover:bg-sky-300 text-zinc-950 font-bold py-3 rounded-xl shadow-sm transition duration-150"
            >
              Verify OTP
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col w-full">
            <h2 className="text-2xl font-bold text-zinc-950 dark:text-white mb-8 text-center">Create New Password</h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-300 mb-1.5 ml-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 pr-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#2a2a2a] text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-sky-300 outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    {showPassword ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-300 mb-1.5 ml-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-3 pr-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#2a2a2a] text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-sky-300 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleResetPassword}
              disabled={isLoading}
              className="w-full bg-[#B7E4FF] hover:bg-sky-300 text-zinc-950 font-bold py-3 rounded-xl shadow-sm transition duration-150 disabled:opacity-70"
            >
              {isLoading ? 'Updating...' : 'Confirm Password'}
            </button>
          </div>
        )}

        {errorMessage && (
          <p className="text-red-500 text-sm mt-4 font-medium text-center">{errorMessage}</p>
        )}

        <div className="text-center mt-6">
          <Link to="/login" className="inline-flex items-center justify-center gap-2 text-sm text-sky-500 font-medium hover:text-sky-600 transition-colors outline-none">
            <FiArrowLeft /> Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;