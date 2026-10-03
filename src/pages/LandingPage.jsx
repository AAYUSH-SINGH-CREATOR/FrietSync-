import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen w-full bg-[#EBF6FF] text-gray-900">
      <header className="w-full bg-white">
        <div className="w-full max-w-[1440px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black text-gray-950">
            Frietsync
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-6 py-2 rounded-2xl bg-[#90D6FF] text-gray-950"
            >
              Log in
            </Link>

            <Link
              to="/signup"
              className="px-6 py-2 rounded-2xl bg-[#90D6FF] text-gray-950"
            >
              Join us
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto px-6 py-16">
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