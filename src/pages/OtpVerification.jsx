import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { verifyOtp } from '../services/authApi';
import { FiSun, FiArrowLeft } from "react-icons/fi";
import { FaMoon } from "react-icons/fa";

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, setIsDarkMode } = useTheme();

  const email = location.state?.email || '';

  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/signup', { replace: true });
    }
  }, [email, navigate]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    if (element.nextSibling && element.value !== "") {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length < 6) {
      setErrorMessage("Please enter all 6 digits.");
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await verifyOtp(email, otpString);
      navigate('/login');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#6BBAEC00] to-[#02A2FF] dark:bg-gradient-to-b dark:from-zinc-900 dark:to-cyan-950 font-sans p-3 sm:p-4 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96 bg-pink-100 rounded-full blur-[70px] sm:blur-[100px] opacity-60 dark:opacity-0 transition-opacity"></div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-2 sm:gap-3 z-50">
        <span className="text-sm sm:text-sm font-medium text-zinc-900 dark:text-zinc-200"><FiSun /></span>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="relative inline-flex h-6 w-11 sm:w-12 items-center rounded-full bg-zinc-300 dark:bg-zinc-700 transition-colors duration-300 focus:outline-none">
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ease-in-out ${isDarkMode ? 'translate-x-6 sm:translate-x-7' : 'translate-x-1'}`} />
        </button>
        <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-200"><FaMoon /></span>
      </div>
      <div className="text-center mt-20 sm:mt-20 lg:mt-16 px-2 sm:px-4">
        <button className="bg-gradient-to-r from-blue-300 to-pink-300 text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 rounded-full text-zinc-900 shadow-sm border border-transparent dark:border-zinc-700">
          Get started in minutes
        </button>
        
        <div className='flex flex-wrap justify-center items-end gap-3 sm:gap-4 mt-4 leading-tight'>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-950 dark:text-white transition-colors">
            Turn Ideas Into Progress with
          </h1>
          <h1 className="inline-block text-3xl sm:text-4xl lg:text-[64px] font-semibold leading-none pb-2 bg-gradient-to-r from-[#B5E4FF] via-[#3A4BBD] to-[#FD8DAF] bg-clip-text text-transparent transition-colors">
            FrietSync
          </h1>
        </div>
      </div>

      <div className="flex justify-center items-start mt-8 sm:mt-10 lg:mt-12 px-0 sm:px-4 relative z-10">
        <div className="bg-white dark:bg-[#1e1e1e] p-5 sm:p-7 md:p-10 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[480px] border border-zinc-100 dark:border-zinc-800 transition-colors">
          
          <h2 className="text-xl sm:text-2xl font-bold text-center text-zinc-950 dark:text-white">
            Verify your account
          </h2>
          
          <p className="text-sm text-center text-zinc-600 dark:text-zinc-400 mt-2 mb-8">
            Enter code sent to <span className="font-semibold text-zinc-800 dark:text-zinc-200">{email}</span>
          </p>

          <div className="flex justify-center gap-2 sm:gap-3 mb-6">
            {otp.map((data, index) => {
              return (
                <input
                  className="w-10 h-12 sm:w-12 sm:h-14 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg text-center text-xl font-semibold text-zinc-900 dark:text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                  type="text"
                  name="otp"
                  maxLength="1"
                  key={index}
                  value={data}
                  onChange={e => handleChange(e.target, index)}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => handleKeyDown(e, index)}
                  ref={ref => inputRefs.current[index] = ref}
                />
              );
            })}
          </div>

          <p className="text-xs sm:text-sm text-center text-zinc-700 dark:text-zinc-400 mb-6">
            Didn't recieve the code ?{' '}
            <button className="text-sky-500 font-semibold hover:underline outline-none">
              Resend
            </button>
          </p>

          <button
            onClick={handleVerify}
            disabled={isLoading}
            className="w-full bg-[#B7E4FF] hover:bg-sky-300 text-zinc-950 text-sm sm:text-base font-semibold py-2.5 sm:py-3 rounded-lg shadow-md transition duration-150 disabled:opacity-70 mb-6"
          >
            {isLoading ? 'Verifying...' : 'Verify account'}
          </button>

          <div className="text-center">
            <Link to="/signup" className="inline-flex items-center gap-2 text-sm text-sky-500 font-medium hover:text-sky-600 transition-colors">
              <FiArrowLeft /> Back to sign up
            </Link>
          </div>

          {errorMessage && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-4 text-center">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;