import { Link } from 'react-router-dom';
import { FiX, FiBarChart2 } from 'react-icons/fi';
import { BsLightningChargeFill } from 'react-icons/bs';
import { AiOutlineTeam, AiFillBug } from 'react-icons/ai';
import faviconLogo from '../assets/favicon.svg';
import heroTeamImg from '../assets/hero-team.png';
import wavesSvg from '../assets/waves.svg';
import { FaCirclePlay } from "react-icons/fa6";

const LandingPage = () => {
    const isAuthenticated = Boolean(localStorage.getItem('frietSyncToken'));

    const features = [
        {
            icon: <BsLightningChargeFill className="text-gray-950 text-2xl sm:text-[26px]" />,
            title: 'Organize',
            subtitle: 'Projects',
        },
        {
            icon: <AiOutlineTeam className="text-gray-950 text-2xl sm:text-[26px]" />,
            title: 'Collaborate',
            subtitle: 'with teams',
        },
        {
            icon: <FiBarChart2 className="text-gray-950 text-2xl sm:text-[26px]" />,
            title: 'Track real',
            subtitle: 'progress',
        },
        {
            icon: <AiFillBug className="text-gray-950 text-2xl sm:text-[26px]" />,
            title: 'Resolve',
            subtitle: 'issues',
        },
    ];

    return (
        <div className="min-h-screen w-full relative bg-[#EBF6FF] text-gray-900 font-sans overflow-x-hidden flex flex-col justify-between selection:bg-[#90D6FF] selection:text-gray-950">
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
                <img
                    src={wavesSvg}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-90 select-none pointer-events-none"
                />
            </div>

            <header className="relative z-30 w-full bg-white shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]">
                <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 h-20 sm:h-24 flex items-center justify-between">
                    <div className="flex items-center gap-8 lg:gap-14">
                        <Link to="/" className="flex items-center gap-3 group">
                            <img
                                src={faviconLogo}
                                alt="Frietsync Logo"
                                className="w-9 h-9 sm:w-11 sm:h-11 object-contain transition-transform group-hover:scale-105"
                            />
                            <span className="text-2xl sm:text-[32px] font-black text-gray-950 tracking-tight">
                                Frietsync
                            </span>
                        </Link>
                        <a
                            href="#features"
                            onClick={(e) => {
                                e.preventDefault();
                                const el = document.getElementById('features');
                                el?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="text-base sm:text-lg font-medium text-gray-900 underline underline-offset-4 decoration-gray-900 transition hover:text-sky-600 hover:decoration-sky-600"
                        >
                            Features
                        </a>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        {isAuthenticated ? (
                            <Link
                                to="/dashboard"
                                className="px-6 sm:px-7 py-2 sm:py-2.5 rounded-2xl bg-[#90D6FF] hover:bg-sky-400 text-gray-950 text-sm sm:text-base font-semibold shadow-xs transition cursor-pointer"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="px-6 sm:px-7 py-2 sm:py-2.5 rounded-2xl bg-[#90D6FF] hover:bg-sky-400 text-gray-950 text-sm sm:text-base font-medium transition cursor-pointer"
                                >
                                    Log in
                                </Link>
                                <Link
                                    to="/signup"
                                    className="px-6 sm:px-7 py-2 sm:py-2.5 rounded-2xl bg-[#90D6FF] hover:bg-sky-400 text-gray-950 text-sm sm:text-base font-medium transition cursor-pointer"
                                >
                                    Join us
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 py-8 sm:py-12 lg:py-16 flex flex-col justify-center">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                    <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
                        <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-bold text-gray-950 leading-[1.12] tracking-tight">
                            Turn Ideas Into
                            <br />
                            Progress with
                            <br />
                            Frietsync
                        </h1>

                        <p className="mt-5 sm:mt-6 text-sm sm:text-[15px] text-gray-700 max-w-[360px] leading-relaxed">
                            Frietsync helps teams turn ideas into organized projects, track
                            issues, manage tasks, and collaborate seamlessly all in one place.
                        </p>

                        <div className="mt-8 flex flex-row items-center gap-3.5 sm:gap-4">
                            <button
                                type="button"
                                onClick={() => setShowDemoModal(true)}
                                className="px-6 sm:px-7 py-3 rounded-2xl bg-white hover:bg-gray-50 text-gray-950 border border-blue-200/80 shadow-sm hover:shadow transition flex items-center justify-center gap-2.5 font-medium text-sm sm:text-base cursor-pointer"
                            >
                                <span>Watch demo</span>
                                 <span><FaCirclePlay/></span>
                            </button>
                            <Link
                                to="/signup"
                                className="px-6 sm:px-7 py-3 rounded-2xl bg-white hover:bg-gray-50 text-gray-950 border border-blue-200/80 shadow-sm hover:shadow transition flex items-center justify-center font-medium text-sm sm:text-base cursor-pointer"
                            >
                                <span>Get started</span>
                            </Link>
                        </div>
                    </div>

                    <div className="lg:col-span-7 flex flex-col items-center lg:items-end">
                        <div className="w-full max-w-[700px] rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl bg-white">
                            <img
                                src={heroTeamImg}
                                alt="Collaborative teamwork around laptop"
                                className="w-full h-auto object-cover select-none pointer-events-none"
                            />
                        </div>
                        <div
                            id="features"
                            className="w-full max-w-[700px] mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-2"
                        >
                            {features.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3 sm:gap-3.5 p-1 text-left"
                                >
                                    <div className="shrink-0">{item.icon}</div>
                                    <div>
                                        <p className="text-xs sm:text-sm font-semibold text-gray-950 leading-tight">
                                            {item.title}
                                        </p>
                                        <p className="text-xs sm:text-sm font-semibold text-gray-950 leading-tight">
                                            {item.subtitle}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LandingPage;