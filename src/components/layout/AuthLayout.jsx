import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import authBg from '../../assets/authbg.svg';
import signupImg from '../../assets/signupimg.svg';

const AuthLayout = ({
  children,
  onBack,
  showLeftIllustration = false,
  leftTitle = 'Turn Ideas Into Progress with',
  leftBrand = 'Frietsync',
  leftImage = signupImg,
  cardMaxWidth = 'max-w-[460px]',
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      className="min-h-screen w-screen relative bg-cover bg-no-repeat flex items-center justify-center bg-center font-sans overflow-x-hidden"
      style={{
        backgroundImage: `url(${authBg})`,
      }}
    >
      <button w-full relative flex items-center justify-center  bg-center font-sans overflow-x-hidden
        type="button"
        onClick={handleBack}
        aria-label="Go back"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow-md transition cursor-pointer z-20"
      >
        <FiArrowLeft size={20} />
      </button>

      <div className="w-full max-w-6xl rounded-2xl sm:rounded-3xl bg-[#9EDCFF]/30 border border-[#9EDCFF]/60 shadow-xl backdrop-blur-sm p-4 sm:p-6 md:p-8 relative z-10 my-auto">
        {showLeftIllustration ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="hidden lg:flex flex-col items-center justify-center text-center px-4">
              <h1 className="text-3xl xl:text-4xl font-extrabold text-gray-900 leading-tight">
                {leftTitle}
              </h1>
              <h2 className="text-3xl xl:text-4xl font-extrabold text-gray-900 mb-6">
                {leftBrand}
              </h2>
              {leftImage && (
                <img
                  src={leftImage}
                  alt="Illustration"
                  className="w-full max-w-[480px] h-auto object-contain select-none pointer-events-none"
                />
              )}
            </div>

            <div className="w-full flex justify-center">
              <div
                className={`w-full ${cardMaxWidth} bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg border border-gray-100`}
              >
                {children}
              </div>
            </div>
          </div>
        ) : (

          <div className="flex justify-center items-center py-4 sm:py-8">
            <div
              className={`w-full ${cardMaxWidth} bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg border border-gray-100`}
            >
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;