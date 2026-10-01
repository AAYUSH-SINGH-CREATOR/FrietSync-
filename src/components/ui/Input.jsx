import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Input = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  className = '',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';

  return (
    <div className={`w-full text-left ${className}`}>
      {label && (
        <label
          htmlFor={id || name}
          className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={id || name}
          name={name || id}
          type={isPasswordField ? (showPassword ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full px-4 py-2.5 sm:py-3 rounded-xl border ${
            error ? 'border-red-500' : 'border-gray-300'
          } bg-white text-gray-900 placeholder-gray-400 text-sm sm:text-base outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition ${
            isPasswordField ? 'pr-11' : ''
          }`}
        />

        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition cursor-pointer"
          >
            {showPassword ? <FiEye size={18} /> : <FiEyeOff size={18} />}
          </button>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-500 mt-1 font-medium">{error}</div>
      )}
    </div>
  );
};

export default Input;
