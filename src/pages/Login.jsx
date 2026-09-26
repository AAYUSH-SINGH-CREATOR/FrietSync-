import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { loginUser } from '../services/authApi';

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { isDarkMode, setIsDarkMode } = useTheme();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleLogin = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      await loginUser(formData);
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-dvh w-full bg-linear-to-b from-[#6BBAEC00] to-[#02A2FF] dark:bg-linear-to-b dark:from-zinc-900 dark:to-cyan-950 font-sans px-4 py-3 sm:px-6 sm:py-4 relative overflow-hidden transition-colors duration-300">

      <div className="absolute top-0 right-0 w-56 h-56 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-pink-100 rounded-full blur-[80px] sm:blur-[100px] opacity-60 dark:opacity-0 transition-opacity"></div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:right-8 flex items-center gap-1.5 sm:gap-3 z-50">
        <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">Light</span>

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="relative inline-flex h-5 w-10 sm:h-6 sm:w-12 items-center rounded-full bg-zinc-300 dark:bg-zinc-700 transition-colors duration-300 focus:outline-none"
        >
          <span
            className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition duration-300 ease-in-out ${
              isDarkMode ? 'translate-x-5.5 sm:translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>

        <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">Dark</span>
      </div>

      <div className="text-center mt-14 sm:mt-12 lg:mt-10">
        <button className="bg-linear-to-r from-blue-300 to-pink-300 text-xs sm:text-sm font-medium px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-zinc-900 shadow-sm border border-transparent dark:border-zinc-700">
          Get started in minutes
        </button>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-950 dark:text-white mt-3 sm:mt-4 leading-tight transition-colors">
          Welcome back to
        </h1>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-indigo-700 dark:text-indigo-400 transition-colors">
          FrietSync
        </h1>
      </div>

      <div className="flex justify-center items-start mt-6 sm:mt-8 lg:mt-10 relative z-10">
        <div className="bg-white dark:bg-[#1e1e1e] p-5 sm:p-7 lg:p-10 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[480px] border border-zinc-100 dark:border-zinc-800 transition-colors">

          <h2 className="text-xl sm:text-2xl font-bold text-center text-zinc-950 dark:text-white">
            Log back in
          </h2>

          <p className="text-xs sm:text-sm text-center text-zinc-700 dark:text-zinc-400 mt-1 mb-4 sm:mb-6">
            Dont have an account ?{' '}
            <Link
              to="/signup"
              className="text-indigo-700 dark:text-indigo-400 font-semibold hover:underline"
            >
              Sign Up
            </Link>
          </p>

          <form className="space-y-3.5 sm:space-y-5" onSubmit={(e) => e.preventDefault()}>

            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-1 sm:mb-1.5"
              >
                Email
              </label>

              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="eg: admin@gmail.com"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#2a2a2a] text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 focus:border-indigo-600 dark:focus:border-indigo-500 outline-none transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-1 sm:mb-1.5"
              >
                Password
              </label>

              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter Password"
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#2a2a2a] text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 focus:border-indigo-600 dark:focus:border-indigo-500 outline-none transition pr-10"
                />
              </div>

              <div className="text-right mt-1.5 sm:mt-2">
                <a
                  href="#"
                  className="text-[11px] sm:text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Forgot password ?
                </a>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-[#B7E4FF] hover:bg-sky-300 text-zinc-950 text-sm sm:text-base font-semibold py-2.5 sm:py-3 rounded-lg mt-3 sm:mt-4 shadow-md transition duration-150 disabled:opacity-70"
            >
              {isLoading ? 'Logging In...' : 'Login'}
            </button>
          </form>

          {errorMessage && (
            <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm mt-3 sm:mt-4 text-center">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;