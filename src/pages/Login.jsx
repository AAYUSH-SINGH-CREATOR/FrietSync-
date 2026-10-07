import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { loginUser, getFriendlyErrorMessage } from '../services/authApi';
import loginImg from '../assets/loginimg.svg';

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('login_form');
      return saved ? JSON.parse(saved) : { email: '', password: '' };
    } catch {
      return { email: '', password: '' };
    }
  });

  useEffect(() => {
    sessionStorage.setItem('login_form', JSON.stringify(formData));
  }, [formData]);

  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    if (fieldErrors[id]) {
      setFieldErrors((prev) => ({ ...prev, [id]: '' }));
    }
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();

    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setErrorMessage('');
    setIsLoading(true);

    try {
      await loginUser(formData);
      sessionStorage.removeItem('login_form');
      navigate('/dashboard');
    } catch (error) {
      const status = error.response?.status || error.status;
      const rawMsg = (error.data?.message || error.message || '').toLowerCase();

      if (
        status === 404 ||
        rawMsg.includes('not registered')
      ) {
        setFieldErrors({ email: 'Email not registered' });
      } else if (
        status === 401 ||
        rawMsg.includes('password') ||
        rawMsg.includes('invalid credential')
      ) {
        setFieldErrors({ password: 'Incorrect email or password.' });
      } else if (status === 429) {
        setErrorMessage('Too many login attempts. Please wait a moment');
      } else if (status >= 500) {
        setErrorMessage('Something went wrong. Please try again later.');
      } else {
        setErrorMessage(getFriendlyErrorMessage(error, 'login'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      leftTitle="Welcome back to Frietsync"
      leftBrand=""
      leftImage={loginImg}
      showLeftIllustration={true}
    >
      <div className="text-center w-full">
        <h2 className="text-2xl sm:text-[32px] font-semibold text-gray-900 leading-tight">
          Log back in
        </h2>

        <p className="text-xs sm:text-[15px] text-gray-600 mt-1.5 mb-5 sm:mb-6">
          Dont have an account ?{' '}
          <Link
            to="/signup"
            className="text-sky-600 font-semibold hover:underline"
          >
            Sign Up
          </Link>
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
          />

          <div>
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Enter Password"
              value={formData.password}
              onChange={handleChange}
              error={fieldErrors.password}
            />

            <div className="text-right mt-1.5">
              <Link
                to="/forgot-password"
                className="text-xs text-gray-500 hover:text-gray-800 transition"
              >
                Forgot password ?
              </Link>
            </div>
          </div>

          <div className="pt-2 sm:pt-3">
            <Button type="submit" isLoading={isLoading} onClick={handleLogin}>
              Login
            </Button>
          </div>
        </form>

        {errorMessage && (
          <p className="text-xs sm:text-sm text-[#FF1100] mt-4 text-center font-medium">
            {errorMessage}
          </p>
        )}
      </div>
    </AuthLayout>
  );
};

export default Login;