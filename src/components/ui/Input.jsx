import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Input = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  onFocus,
  onBlur,
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
          className="block text-xs sm:text-[13px] font-semibold text-gray-800 dark:text-[#e0e0e0] mb-1"
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
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          className={`w-full px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border ${error
              ? 'border-[#FF1100] dark:border-[#F87171]'
              : 'border-gray-300 dark:border-[#3a3a3a] focus:border-sky-400 dark:focus:border-[#60A5FA]'
            } bg-white dark:bg-[#242424] text-gray-900 dark:text-[#F1F5F9] placeholder:text-gray-400 dark:placeholder:text-[#858585] text-sm sm:text-base outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-blue-900/30 transition ${isPasswordField ? 'pr-11' : ''
            }`}
        />

        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-[#858585] hover:text-gray-800 dark:hover:text-[#F1F5F9] transition cursor-pointer p-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <FiEye size={18} /> : <FiEyeOff size={18} />}
          </button>
        )}
      </div>

      {error && (
        <div className="text-xs text-[#FF1100] dark:text-[#F87171] mt-1 font-medium">{error}</div>
      )}
    </div>
  );
};

export default Input;
