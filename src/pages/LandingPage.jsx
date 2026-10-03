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

              <span className="text-2xl sm:text-[32px] font-black text-gray-950 tracking-tight">
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

      <main className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 py-16">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-950">
            Turn Ideas Into Progress with Frietsync
          </h1>

          <p className="mt-5 max-w-xl mx-auto text-gray-700">
            Frietsync helps teams organize projects, manage tasks,
            track issues, and collaborate in one place.
          </p>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;