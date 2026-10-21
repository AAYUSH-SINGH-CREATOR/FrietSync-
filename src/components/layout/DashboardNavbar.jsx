import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiPlus, FiBell, FiLogOut, FiSun, FiMoon, FiUser, FiSettings } from 'react-icons/fi';
import { logoutUser } from '../../features/auth/services/authApi';
import { getMyInvites } from '../../features/invites/services/inviteApi';
import { useTheme } from '../../context/ThemeContext';
import InviteModal from '../../features/invites/components/InviteModal';
import InvitesBellModal from '../../features/invites/components/InvitesBellModal';
import { canSendInvites } from '../../features/invites/utils/invitePermissions';
import logo from '../../assets/logo.svg';
import defaultAvatar from '../../assets/oggy-img.png';


const DashboardNavbar = ({ currentUserProfile, isLoadingUserProfile }) => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme() || {};
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const canSendInvite = !isLoadingUserProfile && canSendInvites(currentUserProfile);

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

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
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
            {/* <span className="text-2xl font-black fon text-black dark:text-white tracking-tight group-hover:text-sky-700 dark:group-hover:text-sky-300 transition">
              FrietSync
            </span> */}
            <span className="text-[32px] leading-none font-semibold tracking-normal text-black dark:text-white group-hover:text-sky-700 dark:group-hover:text-sky-300 transition">
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

          {canSendInvite && (
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 shadow-sm shadow-sky-600/20 transition cursor-pointer"
            >
              <FiPlus size={16} />
              <span>Invite</span>
            </button>
          )}

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

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              aria-label="Open profile menu"
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1f1f1f] cursor-pointer"
            >
              <img
                src={currentUserProfile?.profilePictureUrl || defaultAvatar}
                alt={currentUserProfile?.name ? `${currentUserProfile.name} profile` : 'Profile'}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = defaultAvatar;
                }}
                className="w-full h-full rounded-full object-cover border border-gray-200 dark:border-[#454545]"
              />
            </button>

            {isProfileMenuOpen && (
              <div
                role="menu"
                aria-label="Profile menu"
                className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#252525] shadow-xl z-50"
              >
                <div className="px-4 py-3 border-b border-gray-100 dark:border-[#383838]">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {currentUserProfile?.name || 'Your account'}
                  </p>
                  {currentUserProfile?.email && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                      {currentUserProfile.email}
                    </p>
                  )}
                </div>
                <Link
                  to="/dashboard/settings/profile"
                  role="menuitem"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#303030] transition"
                >
                  <FiUser size={16} /> Profile
                </Link>
                <Link
                  to="/dashboard/settings"
                  role="menuitem"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#303030] transition"
                >
                  <FiSettings size={16} /> Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/30 transition disabled:opacity-50"
                >
                  <FiLogOut size={16} /> {isLoggingOut ? 'Logging out…' : 'Logout'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {canSendInvite && (
        <InviteModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          onInviteSent={refreshInviteCount}
        />
      )}

      <InvitesBellModal
        isOpen={isBellOpen}
        onClose={() => setIsBellOpen(false)}
        onInviteAction={refreshInviteCount}
      />
    </>
  );
};


export default DashboardNavbar;
