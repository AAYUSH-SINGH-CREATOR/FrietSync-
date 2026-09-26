import { useState } from 'react';
import { Link } from 'react-router-dom';
import teamAvatar1 from '../assets/team-avatar1.png'; 
import teamAvatar2 from '../assets/team-avatar2.png';
import teamAvatar3 from '../assets/team-avatar3.png';
import { BiSolidStarHalf } from "react-icons/bi";
import { FaBug } from "react-icons/fa";
import { FaPaintbrush } from "react-icons/fa6";
import { FaRocket } from "react-icons/fa";
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
 
  const { isDarkMode, setIsDarkMode } = useTheme();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleLogin = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      console.log("Logging in with:", formData);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gradient-to-b dark:from-zinc-900 dark:to-cyan-950 font-sans p-4 relative overflow-hidden transition-colors duration-300">
  
      <div className="absolute top-0 right-0 w-96 h-96 bg-pink-100 rounded-full blur-[100px] opacity-60 dark:opacity-0 transition-opacity"></div>

      <div className="absolute top-6 right-8 flex items-center gap-3 z-50">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Light</span>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="relative inline-flex h-6 w-12 items-center rounded-full bg-zinc-300 dark:bg-zinc-700 transition-colors duration-300 focus:outline-none"
        >
          <span 
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ease-in-out ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}`} 
          />
        </button>
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Dark</span>
      </div>

      <div className="text-center mt-6">
        <button className="bg-gradient-to-r from-blue-300 to-pink-300 text-sm font-medium px-4 py-1.5 rounded-full text-zinc-900 shadow-sm border border-transparent dark:border-zinc-700">
          Get started in minutes
        </button>
        <h1 className="text-5xl font-extrabold text-zinc-950 dark:text-white mt-4 leading-tight transition-colors">
          Welcome back to
        </h1>
        <h1 className="text-5xl font-extrabold text-indigo-700 dark:text-indigo-400 transition-colors">
          FrietSync
        </h1>
      </div>

      <div className="flex justify-center items-start mt-12 relative z-10">
 
        <div className="flex flex-col gap-6 mr-6 pt-16 relative">
       
          <div className="bg-white/80 dark:bg-[#1e1e1e] backdrop-blur-sm p-4 rounded-2xl shadow-xl flex items-start gap-3 w-64 border border-zinc-100 dark:border-zinc-800 -rotate-3 transition-transform hover:-translate-y-1">
            <div className="text-xl">👥</div> 
            <div>
              <p className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">Work better</p>
              <p className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">together</p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-[#1e1e1e] backdrop-blur-sm p-5 rounded-2xl shadow-xl w-72 border border-zinc-100 dark:border-zinc-800 -rotate-6 transition-transform hover:-translate-y-1">
            <ul className="space-y-4 text-sm font-medium text-zinc-900 dark:text-zinc-100 list-none">
              <li className="flex items-center justify-between gap-2">
                <FaBug className="text-red-500 shrink-0" />
                <span className="flex items-center gap-2">Fix login issue</span>
                <span className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 px-3 py-1 text-xs rounded-full">In Progress</span>
              </li>
              <li className="flex items-center justify-between gap-2 border-y border-zinc-100 dark:border-zinc-700/50 py-3">
                <FaPaintbrush className="text-blue-500 shrink-0" />
                <span>Design system update</span>
                <span className="bg-blue-100 text-indigo-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 text-xs rounded-full">Review</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <FaRocket className="text-emerald-500 shrink-0" />
                <span>Release v1.2</span>
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 px-3 py-1 text-xs rounded-full">Done</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] p-10 rounded-3xl shadow-2xl w-[480px] border border-zinc-100 dark:border-zinc-800 transition-colors">
          <h2 className="text-2xl font-bold text-center text-zinc-950 dark:text-white">Log back in</h2>
          <p className="text-sm text-center text-zinc-700 dark:text-zinc-400 mt-1 mb-6">
            Dont have an account ?{' '}
            <Link to="/signup" className="text-indigo-700 dark:text-indigo-400 font-semibold hover:underline">
              Sign Up
            </Link>
          </p>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="eg: admin@gmail.com"
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#2a2a2a] text-zinc-950 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 focus:border-indigo-600 dark:focus:border-indigo-500 outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter Password"
                  className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#2a2a2a] text-zinc-950 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 focus:border-indigo-600 dark:focus:border-indigo-500 outline-none transition pr-10"
                />
                
              </div>
              <div className="text-right mt-2">
                <a href="#" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  Forgot password ?
                </a>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-sky-400 hover:bg-sky-500 text-zinc-950 font-semibold py-3 rounded-lg mt-4 shadow-md transition duration-150 disabled:opacity-70"
            >
              {isLoading ? 'Logging In...' : 'Login'}
            </button>
          </form>

          {errorMessage && <p className="text-red-600 dark:text-red-400 text-sm mt-4 text-center">{errorMessage}</p>}
        </div>

        <div className="flex flex-col gap-6 ml-6 relative">
          <div className="bg-transparent p-4 rounded-2xl w-64 pt-6 relative flex flex-col items-center">
            <div className="flex justify-center -space-x-4">
              <img src={teamAvatar1} alt="Team 1" className="w-14 h-14 rounded-full border-2 border-white dark:border-zinc-800 z-10 object-cover shadow-sm" />
              <img src={teamAvatar2} alt="Team 2" className="w-14 h-14 rounded-full border-2 border-white dark:border-zinc-800 z-20 object-cover shadow-sm" />
              <img src={teamAvatar3} alt="Team 3" className="w-14 h-14 rounded-full border-2 border-white dark:border-zinc-800 z-30 object-cover shadow-sm" />
            </div>
            
            <span className="inline-block mt-4 text-zinc-950 bg-gradient-to-r from-blue-200 to-pink-200 text-sm font-semibold px-5 py-2 rounded-full shadow-md z-40">
              Join your Team
            </span>
          </div>

          <div className="bg-white/80 dark:bg-[#1e1e1e] backdrop-blur-sm p-5 rounded-2xl shadow-xl w-72 border border-zinc-100 dark:border-zinc-800 relative mt-16 rotate-3 transition-transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-zinc-900 dark:text-white">Project Progress</span>
              <span><BiSolidStarHalf className='text-amber-400 dark:text-yellow-300 text-2xl' /></span>
            </div> 

            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden">
              <div className="bg-gradient-to-r from-sky-400 to-blue-500 h-2.5 rounded-full" style={{ width: '80%' }}></div>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 font-medium">12 of 15 Tasks Complete</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

