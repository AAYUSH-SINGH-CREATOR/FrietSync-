import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import circlesSvg from '../../assets/circles.svg';
import dotsSvg from '../../assets/dots.svg';
import wavesSvg from '../../assets/waves.svg';
import signupImg from '../../assets/signupimg.svg';
import lgtEllipse from "../../assets/lgtEllipse.svg"
import drkEllipse from  "../../assets/drkEllipse.svg"
import downelps from "../../assets/dwnelps.svg"
import downelps1 from "../../assets/dwnelps1.svg"

const AuthLayout = ({
  children,
  onBack,
  showLeftIllustration = false,
  leftTitle = 'Turn Ideas Into Progress with',
  leftBrand = 'Frietsync',
  leftImage = signupImg,
  cardMaxWidth = 'max-w-[440px]',
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
    <div className="min-h-screen w-full relative bg-[#EBF6FF] flex items-center justify-center font-sans overflow-hidden p-0 sm:p-6 md:p-8">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
        <img
          src={wavesSvg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-90 select-none pointer-events-none"
        />

        <img
          src={circlesSvg}
          alt=""
          className="absolute top-0 left-0 sm:top-0 sm:left-0 w-48 sm:w-72 md:w-[354px] h-auto select-none pointer-events-none"
        />

        <img src={lgtEllipse} alt="" 
        className='absolute right-70 select-none pointer-events-none'
        />
        <img src={drkEllipse} alt="" 
        className='absolute left-100 select-none pointer-events-none'
        />
        <img src={downelps1} alt="" 
        className='absolute right-70 bottom-0 select-none pointer-events-none'
        />
        <img src={downelps} alt="" 
        className='absolute left-100 bottom-0 select-none pointer-events-none'
        />

        
          
        <img
          src={circlesSvg}
          alt=""
          className="absolute -bottom-10 -right-10 sm:bottom-0 sm:right-0 w-48 sm:w-72 md:w-[354px] h-auto rotate-180 select-none pointer-events-none"
        />

        <img
          src={dotsSvg}
          alt=""
          className="absolute top-0 right-0 w-36 sm:w-56 md:w-[271px] h-auto select-none pointer-events-none"
        />

        <img
          src={dotsSvg}
          alt=""
          className="absolute bottom-0 left-0 w-36 sm:w-56 md:w-[271px] h-auto rotate-180 select-none pointer-events-none"
        />
      </div>

      <button
        type="button"
        onClick={handleBack}
        aria-label="Go back"
        className="fixed top-3 left-3 sm:top-6 sm:left-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-md transition cursor-pointer z-30"
      >
        <FiArrowLeft className="text-base sm:text-xl" />
      </button>

      <div className="w-full max-w-6xl rounded-2xl sm:rounded-3xl bg-transparent  sm:border sm:border-[#9EDCFF]/60 shadow-xl sm:backdrop-blur-sm  sm:p-6 md:p-8 relative z-10 my-auto">
        {showLeftIllustration ? (
          <div>
            <div className="flex lg:hidden flex-col items-center justify-center pt-1 pb-2">
              {leftImage && (
                <img
                  src={leftImage}
                  alt="Illustration"
                  className="w-64 sm:w-80 max-h-56 object-contain select-none pointer-events-none"
                />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
              <div className="hidden lg:flex flex-col items-center justify-center text-center px-2 xl:px-4">
                <h1 className="text-2xl xl:text-3xl 2xl:text-4xl font-extrabold text-gray-950 tracking-tight whitespace-nowrap">
                  {leftTitle}
                </h1>
                <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-gray-950 mt-1 mb-6">
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
                  className={`w-full ${cardMaxWidth} bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-lg border border-gray-100`}
                >
                  {children}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center py-2 sm:py-6">
            <div
              className={`w-full ${cardMaxWidth} bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-lg border border-gray-100`}
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
