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
      className={`w-full bg-[#87CEFA] hover:bg-[#70c2f7] active:bg-[#5bb7f5] text-gray-900 font-semibold py-2.5 sm:py-3 rounded-xl transition duration-150 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed text-sm sm:text-base ${className}`}
    >
      {isLoading ? 'Please wait...' : children}
    </button>
  );
};

export default Button;
