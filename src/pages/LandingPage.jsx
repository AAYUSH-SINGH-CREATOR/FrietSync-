import { Link } from 'react-router-dom';
import faviconLogo from '../assets/favicon.svg';

const LandingPage = () => {
  return (
    <div className="min-h-screen w-full bg-[#EBF6FF] text-gray-900">
      <header className="relative z-30 w-full bg-white shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]">
        <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 h-20 sm:h-24 flex items-center justify-between">
          <div className="flex items-center gap-8 lg:gap-14">
            <Link to="/" className="flex items-center gap-3">
              <img
                src={faviconLogo}
                alt="Frietsync Logo"
                className="w-9 h-9 sm:w-11 sm:h-11 object-contain"
              />

              <span className="text-2xl sm:text-[32px] font-black text-gray-950">
                Frietsync
              </span>
            </Link>

            <a
              href="#features"
              className="text-base sm:text-lg font-medium text-gray-900 underline underline-offset-4"
            >
              Features
            </a>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/login"
              className="px-6 sm:px-7 py-2 sm:py-2.5 rounded-2xl bg-[#90D6FF] text-gray-950 text-sm sm:text-base font-medium"
            >
              Log in
            </Link>

            <Link
              to="/signup"
              className="px-6 sm:px-7 py-2 sm:py-2.5 rounded-2xl bg-[#90D6FF] text-gray-950 text-sm sm:text-base font-medium"
            >
              Join us
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 py-12 sm:py-16">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="max-w-xl text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-bold text-gray-950 leading-[1.12]">
              Turn Ideas Into
              <br />
              Progress with
              <br />
              Frietsync
            </h1>

            <p className="mt-5 sm:mt-6 text-sm sm:text-[15px] text-gray-700 max-w-[360px] mx-auto lg:mx-0 leading-relaxed">
              Frietsync helps teams turn ideas into organized projects,
              track issues, manage tasks, and collaborate seamlessly
              all in one place.
            </p>

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-3.5 sm:gap-4">
              <button
                type="button"
                className="px-6 sm:px-7 py-3 rounded-2xl bg-white text-gray-950 border border-blue-200/80 shadow-sm font-medium text-sm sm:text-base"
              >
                Watch demo
              </button>

              <Link
                to="/signup"
                className="px-6 sm:px-7 py-3 rounded-2xl bg-white text-gray-950 border border-blue-200/80 shadow-sm font-medium text-sm sm:text-base"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;