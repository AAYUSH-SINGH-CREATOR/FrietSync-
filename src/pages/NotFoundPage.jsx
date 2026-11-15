import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiHome, FiGrid, FiCheckSquare, FiFolder, FiHelpCircle } from 'react-icons/fi';
import logoIcon from '../assets/logo.svg';
import faviconLogo from '../assets/favicon.svg';
import lnheroimg from '../assets/lnheroimg.png';
import { getAccessToken } from '../features/auth/services/authApi';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(getAccessToken());

  useEffect(() => {
    const previousTitle = document.title;
    document.title = '404 - Page Not Found | Frietsync';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isAuthenticated ? '/dashboard' : '/');
    }
  };

  const quickLinks = [
    {
      label: 'Dashboard',
      description: 'Your project overview & metrics',
      icon: FiGrid,
      to: isAuthenticated ? '/dashboard' : '/login',
    },
    {
      label: 'Projects',
      description: 'Active workspaces & boards',
      icon: FiFolder,
      to: isAuthenticated ? '/dashboard/projects' : '/login',
    },
    {
      label: 'Issues & Tasks',
      description: 'Sprint backlog & assignments',
      icon: FiCheckSquare,
      to: isAuthenticated ? '/dashboard/issues' : '/login',
    },
    {
      label: 'Need Help?',
      description: 'Contact Frietsync support',
      icon: FiHelpCircle,
      to: 'mailto:frietsync@gmail.com',
      external: true,
    },
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-x-hidden bg-[#EBF6FF] font-sans text-slate-900 selection:bg-sky-200 selection:text-slate-900 dark:bg-[#1f1f23] dark:text-slate-100">
      {/* Ambient background glow orbs */}
      <div className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-75 dark:opacity-40">
        <div className="absolute -left-20 top-10 h-[450px] w-[520px] rounded-full bg-[#9CCBFF]/45 blur-[140px] animate-ambient-glow-1" />
        <div className="absolute right-[-10%] top-40 h-[480px] w-[550px] rounded-full bg-[#6250E8]/25 blur-[160px] animate-ambient-glow-2" />
        <div className="absolute bottom-10 left-1/3 h-[380px] w-[420px] rounded-full bg-[#FFAACF]/30 blur-[150px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-white/40 bg-white/60 backdrop-blur-md dark:border-white/10 dark:bg-[#18181b]/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src={logoIcon || faviconLogo}
              alt="Frietsync logo"
              className="h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Frietsync
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-white hover:text-slate-950 sm:text-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <FiArrowLeft size={14} />
              <span>Back</span>
            </button>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-sky-600 sm:text-sm"
              >
                <span>Dashboard</span>
                <FiArrowRight size={14} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 sm:text-sm dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <span>Log in</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main 404 Hero Container */}
      <main className="relative z-10 mx-auto my-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="overflow-hidden rounded-[32px] border border-white/60 bg-white/75 p-6 shadow-[0_24px_70px_rgba(2,132,199,0.12)] backdrop-blur-xl sm:p-10 lg:p-12 dark:border-white/10 dark:bg-[#18181b]/80 dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Copy & Actions */}
            <div className="space-y-6 text-left lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/80 bg-pink-50 px-3.5 py-1 text-xs font-bold text-[#FF5AA8] dark:border-pink-500/20 dark:bg-pink-950/30 dark:text-pink-300">
                <span className="h-2 w-2 rounded-full bg-[#FF5AA8] animate-pulse" />
                <span>Error 404 • Task Not Found</span>
              </div>

              <div>
                <div className="font-anton text-7xl font-normal leading-none tracking-tight text-slate-900 sm:text-8xl lg:text-9xl dark:text-white">
                  <span className="bg-gradient-to-r from-sky-500 via-indigo-500 to-[#FF5AA8] bg-clip-text text-transparent">
                    404
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
                  This page went out of sync!
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
                  The link you followed might be broken, or the page took an unscheduled break from the sprint backlog. Don't worry, your work and data are safe.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="group inline-flex items-center gap-2.5 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition-all duration-300 hover:bg-sky-600 hover:shadow-lg hover:shadow-sky-500/30 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <FiGrid size={16} />
                    <span>Return to Dashboard</span>
                    <FiArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                ) : (
                  <Link
                    to="/"
                    className="group inline-flex items-center gap-2.5 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition-all duration-300 hover:bg-sky-600 hover:shadow-lg hover:shadow-sky-500/30 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <FiHome size={16} />
                    <span>Return to Homepage</span>
                    <FiArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleGoBack}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <FiArrowLeft size={16} />
                  <span>Go Back</span>
                </button>
              </div>
            </div>

            {/* Right Column: 3D Mascot Illustration & Floating Badges */}
            <div className="relative flex items-center justify-center lg:col-span-5">
              <div className="relative w-full max-w-[340px] sm:max-w-[380px]">
                {/* Floating Tag 1 */}
                <div className="absolute -left-3 top-2 z-20 hidden rounded-2xl border border-white/60 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur-md sm:block dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-200">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-400" />
                  Sprint: Unscheduled
                </div>

                {/* Floating Tag 2 */}
                <div className="absolute -bottom-2 -right-3 z-20 hidden rounded-2xl border border-white/60 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur-md sm:block dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-200">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Sync: Safe & Sound
                </div>

                {/* 3D Mascot Image with float animation */}
                <div className="animate-hero-float">
                  <img
                    src={lnheroimg}
                    alt="Frietsync 404 illustration"
                    className="h-auto w-full object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Helpful Destinations Grid */}
          <div className="mt-10 border-t border-slate-200/80 pt-8 dark:border-white/10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Popular destinations
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                const cardContent = (
                  <div className="group flex h-full items-start gap-3 rounded-2xl border border-slate-100 bg-white/70 p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 hover:bg-white hover:shadow-md dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-sky-500/40 dark:hover:bg-white/[0.05]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 transition-transform group-hover:scale-110 dark:bg-sky-950/50 dark:text-sky-400">
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400">
                        {item.label}
                      </h3>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );

                return item.external ? (
                  <a key={item.label} href={item.to} className="block">
                    {cardContent}
                  </a>
                ) : (
                  <Link key={item.label} to={item.to} className="block">
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/60 bg-white/40 py-5 text-center text-xs text-slate-500 backdrop-blur-sm dark:border-white/5 dark:bg-transparent dark:text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 sm:px-8">
          <span>© {new Date().getFullYear()} Frietsync. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="transition hover:text-slate-900 dark:hover:text-white">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition hover:text-slate-900 dark:hover:text-white">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
