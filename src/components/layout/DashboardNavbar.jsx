import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiPlus, FiBell, FiLogOut, FiSearch, FiSun, FiMoon } from 'react-icons/fi';
import { logoutUser, getUserProfile } from '../../features/auth/services/authApi';
import { getMyInvites } from '../../features/invites/services/inviteApi';
import { getMyWorkspace } from '../../features/dashboard/services/workspaceApi';
import { useTheme } from '../../context/ThemeContext';
import InviteModal from '../../features/invites/components/InviteModal';
import InvitesBellModal from '../../features/invites/components/InvitesBellModal';
import logo from '../../assets/logo.svg';


const DashboardNavbar = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme() || {};
  const [userProfile] = useState(() => getUserProfile());
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [workspace, setWorkspace] = useState(null);

  const refreshInviteCount = useCallback(() => {
    getMyInvites()
      .then((data) => {
        if (Array.isArray(data)) {
          setPendingCount(data.length);
        }
      })
      .catch(() => {

      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    getMyInvites()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setPendingCount(data.length);
        }
      })
      .catch(() => {
      });

    getMyWorkspace()
      .then((ws) => {
        if (isMounted && ws && (ws.name || ws.id || ws._id)) {
          setWorkspace(ws);
        }
      })
      .catch(() => {
      });

    return () => {
      isMounted = false;
    };
  }, []);
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
    }
    catch (err) {
      console.error('Logout error:', err);
    }
    finally {
      setIsLoggingOut(false);
      navigate('/login');
    }
  };

  return (
    <>
      <header className="bg-white dark:bg-[#1f1f1f] border-b border-gray-200 dark:border-[#303030] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-30 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <img
              src={logo}
              alt="FrietSync Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400 tracking-tight group-hover:text-sky-700 dark:group-hover:text-sky-300 transition">
              FrietSync
            </span>
          </Link>

        </div>

        <div className="flex items-center gap-2 sm:gap-3">

             {toggleTheme && (
              <button
                type="button"
                onClick={toggleTheme}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label="Toggle theme"
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-gray-200 dark:border-[#303030] hover:border-sky-300 dark:hover:border-[#454545] hover:bg-sky-50/50 dark:hover:bg-[#242424] text-gray-700 dark:text-[#e0e0e0] hover:text-sky-600 dark:hover:text-[#F1F5F9] flex items-center justify-center transition cursor-pointer"
              >
                {isDarkMode ? (
                  <FiSun size={17} className="text-amber-400" />
                ) : (
                  <FiMoon size={17} className="text-slate-600" />
                )}
              </button>
            )}

          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 shadow-sm shadow-sky-600/20 transition cursor-pointer"
          >
            <FiPlus size={16} />
            <span>Invite</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBellOpen(true)}
            title="Invitations"
            aria-label="View Invitations"
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-gray-200 dark:border-[#303030] hover:border-sky-300 dark:hover:border-[#454545] hover:bg-sky-50/50 dark:hover:bg-[#242424] text-gray-700 dark:text-[#e0e0e0] hover:text-sky-600 dark:hover:text-[#F1F5F9] flex items-center justify-center transition cursor-pointer"
          >
            <FiBell size={18} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

      

          <div className="flex items-center gap-2 sm:gap-3">



            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Logout"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-600 dark:text-[#e0e0e0] hover:text-red-600 dark:hover:text-[#F87171] hover:bg-red-50 dark:hover:bg-rose-950/30 border border-gray-200 dark:border-[#303030] hover:border-red-200 dark:hover:border-rose-800/50 transition cursor-pointer disabled:opacity-50"
            >
              <FiLogOut size={16} />
              <span className="hidden md:inline">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            </button>
          </div>
          </div>
      </header>

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInviteSent={refreshInviteCount}
      />

      <InvitesBellModal
        isOpen={isBellOpen}
        onClose={() => setIsBellOpen(false)}
        onInviteAction={refreshInviteCount}
      />
    </>
  );
};


export default DashboardNavbar;
