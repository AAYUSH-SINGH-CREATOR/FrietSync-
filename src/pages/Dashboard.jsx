import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../services/authApi';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-sky-600 tracking-tight">
            FrietSync
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-semibold">
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-sm font-semibold text-gray-700 hover:text-red-600 disabled:opacity-50 px-3 py-1.5 rounded-lg border border-gray-300 hover:border-red-300 transition cursor-pointer"
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome to your Dashboard 
          </h1>
          <p className="text-gray-600 mb-6">
            You are logged in successfully with FrietSync.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;