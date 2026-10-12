const Button = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  isLoading = false,
  className = '',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full bg-[#90D6FF] hover:bg-[#7bc8f8] active:bg-[#68bdf3] text-gray-950 dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] dark:text-white font-semibold py-2.5 sm:py-3 rounded-xl sm:rounded-2xl transition duration-150 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed text-sm sm:text-base shadow-xs dark:shadow-md dark:shadow-blue-900/30 ${className}`}
    >
      {isLoading ? 'Please wait...' : children}
    </button>
  );
};

export default Button;
