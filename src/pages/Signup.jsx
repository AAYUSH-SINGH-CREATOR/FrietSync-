import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { registerUser , getFriendlyErrorMessage } from '../services/authApi';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('signup_form');
      return saved
        ? JSON.parse(saved)
        : { name: '', email: '', password: '', confirmPassword: '' };
    } catch {
      return { name: '', email: '', password: '', confirmPassword: '' };
    }
  });

  useEffect(() => {
    sessionStorage.setItem('signup_form', JSON.stringify(formData));
  }, [formData]);

  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [showRequirements, setShowRequirements] = useState(false);

  const criteria = {
    minLength: formData.password.length >= 8,
    hasUpper: /[A-Z]/.test(formData.password),
    hasLower: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const isPasswordValid = Object.values(criteria).every(Boolean);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    if (fieldErrors[id]) {
      setFieldErrors((prev) => ({ ...prev, [id]: '' }));
    }
    if (errorMessage) {
      setErrorMessage('');
    }

    if (id === 'password') {
      const updatedCriteria = {
        minLength: value.length >= 8,
        hasUpper: /[A-Z]/.test(value),
        hasLower: /[a-z]/.test(value),
        hasNumber: /[0-9]/.test(value),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      };

      if (Object.values(updatedCriteria).every(Boolean)) {
        setShowRequirements(false);
      } else if (value.length > 0) {
        setShowRequirements(true);
      }
    }
  };

  const handleSignup = async (e) => {
    if (e) e.preventDefault();

    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (!isPasswordValid) {
      errors.password = (
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

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Password doesn't match";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setErrorMessage('');
    setIsLoading(true);

    try {
      await registerUser(formData);
      sessionStorage.removeItem('signup_form');
      navigate('/verify-otp', { state: { email: formData.email } });
    } catch (error) {
      const status = error.response?.status || error.status;
      const rawMsg = (error.data?.message || error.message || '').toLowerCase();

      if (
        status === 409 ||
        rawMsg.includes('already exist') ||
        rawMsg.includes('already registered')
      ) {
        setFieldErrors({ email: 'Email already exists' });
      } else if (status === 400 && rawMsg.includes('email')) {
        setFieldErrors({ email: 'Please enter a valid email address' });
      } else if (status === 429) {
        setErrorMessage('Too many signup attempts. Please wait a moment.');
      } else if (status >= 500) {
        setErrorMessage('Something went wrong. Please try again later.');
      } else {
        setErrorMessage(getFriendlyErrorMessage(error, 'signup'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout showLeftIllustration={true}>
      <div className="text-center w-full">
        <h2 className="text-2xl sm:text-[32px] font-semibold text-gray-900 leading-tight">
          Create your account
        </h2>

        <p className="text-xs sm:text-[15px] text-gray-600 mt-1.5 mb-5 sm:mb-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-sky-600 font-semibold hover:underline"
          >
            Log in
          </Link>
        </p>

        <form onSubmit={handleSignup} className="space-y-3.5 sm:space-y-4">
          <Input
            id="name"
            label="Name*"
            type="text"
            placeholder="Enter Name"
            value={formData.name}
            onChange={handleChange}
            error={fieldErrors.name}
          />

          <Input
            id="email"
            label="Email*"
            type="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
          />

          <div className="relative">
            <Input
              id="password"
              label="Password*"
              type="password"
              placeholder="Enter Password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => {
                if (formData.password.length > 0 && !isPasswordValid) {
                  setShowRequirements(true);
                }
              }}
              error={fieldErrors.password}
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

          <Input
            id="confirmPassword"
            label="Confirm Password*"
            type="password"
            placeholder="Re-enter Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
          />

          <div className="pt-2 sm:pt-3">
            <Button type="submit" isLoading={isLoading}>
              Create account
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

export default Signup;
