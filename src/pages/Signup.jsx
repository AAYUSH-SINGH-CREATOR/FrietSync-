import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { registerUser } from '../services/authApi';

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { isDarkMode, setIsDarkMode } = useTheme();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleCreateAccount = async () => {
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    try {
      await registerUser(formData);
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
        <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Light
        </span>

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="relative inline-flex h-6 w-11 sm:w-12 items-center rounded-full bg-zinc-300 dark:bg-zinc-700 transition-colors duration-300 focus:outline-none"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ease-in-out ${
              isDarkMode ? 'translate-x-6 sm:translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>

        <span className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Dark
        </span>
      </div>

      <div className="text-center mt-20 sm:mt-20 lg:mt-16 px-2 sm:px-4">
        <button className="bg-gradient-to-r from-blue-300 to-pink-300 text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 rounded-full text-zinc-900 shadow-sm border border-transparent dark:border-zinc-700">
          Get started in minutes
        </button>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-950 dark:text-white mt-4 leading-tight transition-colors">
          Turn Ideas Into Progress
        </h1>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-indigo-700 dark:text-indigo-400 transition-colors">
          with FrietSync
        </h1>
      </div>

      <div className="flex justify-center items-start mt-8 sm:mt-10 lg:mt-12 px-0 sm:px-4 relative z-10">

        <div className="bg-white dark:bg-[#1e1e1e] p-5 sm:p-7 md:p-8 lg:p-10 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[480px] border border-zinc-100 dark:border-zinc-800 transition-colors">

          <h2 className="text-xl sm:text-2xl font-bold text-center text-zinc-950 dark:text-white">
            Create your account
          </h2>

          <p className="text-xs sm:text-sm text-center text-zinc-700 dark:text-zinc-400 mt-1 mb-5 sm:mb-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-indigo-700 dark:text-indigo-400 font-semibold hover:underline"
            >
              Log in
            </Link>
          </p>

          <form
            className="space-y-3.5 sm:space-y-4"
            onSubmit={(e) => e.preventDefault()}
          >
            {[
              { label: 'Name', id: 'name', type: 'text', placeholder: 'Enter name' },
              { label: 'Email', id: 'email', type: 'email', placeholder: 'eg: admin@gmail.com' },
              { label: 'Password', id: 'password', type: 'password', placeholder: 'Enter Password' },
              { label: 'Re-enter Password', id: 'confirmPassword', type: 'password', placeholder: 'Re-enter Password' },
            ].map((field) => (
              <div key={field.id}>
                <label
                  htmlFor={field.id}
                  className="block text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-1.5"
                >
                  {field.label}
                </label>

                <input
                  type={field.type}
                  id={field.id}
                  value={formData[field.id]}
                  onChange={handleInputChange}
                  placeholder={field.placeholder}
                  className="w-full px-3 sm:px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#2a2a2a] text-sm sm:text-base text-zinc-950 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 focus:border-indigo-600 dark:focus:border-indigo-500 outline-none transition"
                />
              </div>
            ))}

            <button
              onClick={handleCreateAccount}
              disabled={isLoading}
              className="w-full bg-[#B7E4FF] hover:bg-sky-300 text-zinc-950 text-sm sm:text-base font-semibold py-2.5 sm:py-3 rounded-lg mt-5 sm:mt-6 shadow-md transition duration-150 disabled:opacity-70"
            >
              {isLoading ? 'Creating Account...' : 'Create account'}
            </button>
          </form>

          {errorMessage && (
            <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm mt-4 text-center">
              {errorMessage}
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default Signup;
