import { useRef } from 'react';

const OtpInput = ({ otp, setOtp, error, length = 6 }) => {
  const inputRefs = useRef([]);

  const handleChange = (e, index) => {
    const val = e.target.value;

    if (val && !/^\d+$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val ? val.slice(-1) : '';
    setOtp(newOtp);

    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pasteData)) return;

    const digits = pasteData.slice(0, length).split('');
    const newOtp = [...otp];
    digits.forEach((digit, i) => {
      newOtp[i] = digit;
    });
    setOtp(newOtp);

    const nextIndex = Math.min(digits.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="w-full">
      <div className="flex justify-center gap-2 sm:gap-3 mb-2" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={(e) => e.target.select()}
            className={`w-11 h-13 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border ${error
                ? 'border-[#FF1100] dark:border-[#F87171] text-[#FF1100] dark:text-[#F87171]'
                : 'border-gray-300 dark:border-[#334155] text-gray-900 dark:text-[#F1F5F9] focus:border-sky-400 dark:focus:border-[#60A5FA]'
              } bg-white dark:bg-[#1E293B] outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-blue-900/30 transition`}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs sm:text-sm text-[#FF1100] dark:text-[#F87171] text-center font-medium mt-1 mb-2">
          {error}
        </p>
      )}
    </div>
  );
};

export default OtpInput;
