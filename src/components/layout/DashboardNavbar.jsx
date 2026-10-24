import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiPlus,
  FiBell,
  FiLogOut,
  FiSun,
  FiMoon,
  FiUser,
  FiSettings,
  FiCheck,
  FiCheckCircle,
  FiMessageSquare,
  FiUserPlus,
  FiRefreshCw,
  FiMenu,
} from 'react-icons/fi';
import { IoPersonCircle } from 'react-icons/io5';
import { logoutUser } from '../../features/auth/services/authApi';
import { getMyInvites } from '../../features/invites/services/inviteApi';
import {
  getUnreadNotificationCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  parseUnreadCount,
  parseNotificationPage,
  formatNotificationTime,
  subscribeToNotifications,
  getFriendlyErrorMessage,
} from '../../features/dashboard/services/notificationApi';
import { getSharedStompClient } from '../../features/chat/services/stompClient';
import { useTheme } from '../../context/ThemeContext';
import InviteModal from '../../features/invites/components/InviteModal';
import InvitesBellModal from '../../features/invites/components/InvitesBellModal';
import { canSendInvites } from '../../features/invites/utils/invitePermissions';
import logo from '../../assets/logo.svg';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'INVITE_RECEIVED':
      return (
        <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
          <FiUserPlus size={15} />
        </div>
      );
    case 'INVITE_ACCEPTED':
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
          <FiCheckCircle size={15} />
        </div>
      );
    case 'CHAT_MESSAGE':
      return (
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
          <FiMessageSquare size={15} />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#2b2b2b] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
          <FiBell size={15} />
        </div>
      );
  }
};

const getNotificationFallbackTitle = (type) => {
  switch (type) {
    case 'INVITE_RECEIVED':
      return 'Invitation Received';
    case 'INVITE_ACCEPTED':
      return 'Invitation Accepted';
    case 'CHAT_MESSAGE':
      return 'New Message';
    default:
      return 'Notification';
  }
};

const DashboardNavbar = ({
  currentUserProfile,
  isLoadingUserProfile,
  unreadNotificationCount: initialUnreadCount,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
}) => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme() || {};
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInvitesModalOpen, setIsInvitesModalOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const mobileProfileMenuRef = useRef(null);

  // Notifications state
  const [localUnreadCount, setLocalUnreadCount] = useState(null);
  const unreadCount = localUnreadCount !== null ? localUnreadCount : (typeof initialUnreadCount === 'number' ? initialUnreadCount : 0);
  const initialUnreadCountRef = useRef(initialUnreadCount);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const isNotificationsOpenRef = useRef(isNotificationsOpen);
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [notifError, setNotifError] = useState('');
  const notificationMenuRef = useRef(null);

  const canSendInvite = !isLoadingUserProfile && canSendInvites(currentUserProfile);

  useEffect(() => {
    initialUnreadCountRef.current = initialUnreadCount;
  }, [initialUnreadCount]);

  useEffect(() => {
    isNotificationsOpenRef.current = isNotificationsOpen;
  }, [isNotificationsOpen]);

  const refreshInviteCount = useCallback(() => {
    getMyInvites()
      .then((data) => {
        if (Array.isArray(data)) {
          setPendingCount(data.length);
        }
      })
      .catch(() => {});
  }, []);

  const refreshUnreadCount = useCallback(() => {
    getUnreadNotificationCount()
      .then((res) => {
        setLocalUnreadCount(parseUnreadCount(res));
      })
      .catch(() => {});
  }, []);

  const loadNotifications = useCallback(async (pageToLoad = 0, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingNotifications(true);
    }
    setNotifError('');

    try {
      const res = await getNotifications({ unread: false, page: pageToLoad, size: 20 });
      const { items, last } = parseNotificationPage(res);
      setNotifications((prev) => (append ? [...prev, ...items] : items));
      setHasMore(!last);
      setPage(pageToLoad);
    } catch (err) {
      setNotifError(getFriendlyErrorMessage(err, 'notifications'));
    } finally {
      setIsLoadingNotifications(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    refreshInviteCount();
    refreshUnreadCount();

    const unsubscribe = subscribeToNotifications((payload) => {
      const raw = payload?.notification || payload?.data || payload;
      if (!raw) return;

      const newNotif = {
        id: raw.id || raw._id || raw.notificationId || `notif-${Date.now()}`,
        title: raw.title || getNotificationFallbackTitle(raw.type),
        message: raw.message || raw.body || raw.content || '',
        type: raw.type || 'SYSTEM',
        read: raw.read ?? raw.isRead ?? false,
        createdAt: raw.createdAt || raw.timestamp || new Date().toISOString(),
        ...raw,
      };

      setLocalUnreadCount((prev) => {
        const initial = typeof initialUnreadCountRef.current === 'number' ? initialUnreadCountRef.current : 0;
        const current = prev !== null ? prev : initial;
        return newNotif.read ? current : current + 1;
      });
      setNotifications((prev) => {
        const id = newNotif.id || newNotif._id;
        if (prev.some((n) => (n.id || n._id) === id)) return prev;
        return [newNotif, ...prev];
      });
    });

    const client = getSharedStompClient();
    const unbindConnect = client.addConnectListener(() => {
      refreshUnreadCount();
      refreshInviteCount();
      if (isNotificationsOpenRef.current) {
        loadNotifications(0, false);
      }
    });

    return () => {
      unsubscribe();
      unbindConnect();
    };
  }, [refreshUnreadCount, refreshInviteCount, loadNotifications]);

  const handleToggleNotifications = () => {
    if (!isNotificationsOpen) {
      loadNotifications(0, false);
      refreshUnreadCount();
    }
    setIsNotificationsOpen((open) => !open);
  };

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    loadNotifications(page + 1, true);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setLocalUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      refreshUnreadCount();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = async (item) => {
    const itemId = item.id || item._id || item.notificationId;

    if (!item.read && itemId) {
      setNotifications((prev) =>
        prev.map((n) => ((n.id || n._id || n.notificationId) === itemId ? { ...n, read: true } : n))
      );
      setLocalUnreadCount((prev) => {
        const initial = typeof initialUnreadCountRef.current === 'number' ? initialUnreadCountRef.current : 0;
        const current = prev !== null ? prev : initial;
        return Math.max(0, current - 1);
      });
      try {
        await markNotificationRead(itemId);
      } catch (err) {
        console.warn('Failed to mark notification read:', err);
      }
    }

    setIsNotificationsOpen(false);

    if (item.type === 'CHAT_MESSAGE') {
      const projectId = item.projectId || item.metadata?.projectId || item.data?.projectId;
      if (projectId) {
        navigate(`/dashboard/chats?projectId=${projectId}`);
      } else {
        navigate('/dashboard/chats');
      }
    } else if (item.type === 'INVITE_RECEIVED') {
      setIsInvitesModalOpen(true);
    }
  };

  useEffect(() => {
    if (!isNotificationsOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!notificationMenuRef.current?.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsNotificationsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (
        !profileMenuRef.current?.contains(event.target) &&
        !mobileProfileMenuRef.current?.contains(event.target)
      ) {
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
      {/* Desktop Header */}
      <header className="hidden md:flex bg-white dark:bg-[#1f1f1f] border-b border-gray-200 dark:border-[#303030] px-4 sm:px-8 py-3.5 items-center justify-between shadow-xs sticky top-0 z-30 transition-colors duration-200">
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

          <div className="relative" ref={notificationMenuRef}>
            <button
              type="button"
              onClick={handleToggleNotifications}
              title="Notifications"
              aria-label="View Notifications"
              aria-expanded={isNotificationsOpen}
              aria-haspopup="true"
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-gray-200 dark:border-[#303030] hover:border-sky-300 dark:hover:border-[#454545] hover:bg-sky-50/50 dark:hover:bg-[#242424] text-gray-700 dark:text-[#e0e0e0] hover:text-sky-600 dark:hover:text-[#F1F5F9] flex items-center justify-center transition cursor-pointer"
            >
              <FiBell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div
                role="region"
                aria-label="Notifications popover"
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1f1f1f] shadow-2xl z-50 overflow-hidden flex flex-col"
              >
                {/* Popover Header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2f2f2f] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={isMarkingAll}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <FiCheck size={13} />
                      <span>{isMarkingAll ? 'Marking...' : 'Mark all read'}</span>
                    </button>
                  )}
                </div>

                {pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      setIsInvitesModalOpen(true);
                    }}
                    className="w-full px-4 py-2 bg-sky-50/80 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border-b border-sky-100 dark:border-sky-900/40 text-left flex items-center justify-between text-xs font-medium text-sky-700 dark:text-sky-300 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <FiUserPlus size={14} />
                      <span>You have {pendingCount} pending {pendingCount === 1 ? 'invite' : 'invites'}</span>
                    </span>
                    <span className="text-[11px] font-semibold underline">Review</span>
                  </button>
                )}

                {/* Popover List */}
                <div className="max-h-[380px] sm:max-h-[420px] overflow-y-auto divide-y divide-gray-100 dark:divide-[#272727]">
                  {isLoadingNotifications && notifications.length === 0 ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="flex gap-3 animate-pulse">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#2b2b2b] shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-gray-200 dark:bg-[#2b2b2b] rounded w-3/4" />
                            <div className="h-3 bg-gray-100 dark:bg-[#252525] rounded w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : notifError && notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-xs text-rose-500 mb-2">{notifError}</p>
                      <button
                        type="button"
                        onClick={() => loadNotifications(0, false)}
                        className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-400 dark:text-[#777] flex items-center justify-center mb-2.5">
                        <FiCheckCircle size={20} />
                      </div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No notifications</p>
                      <p className="text-xs text-gray-500 dark:text-[#888] mt-1 max-w-[220px]">
                        You are all caught up! When updates or alerts arrive, they will appear here.
                      </p>
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const itemId = item.id || item._id || item.notificationId;
                      const isUnread = !item.read;

                      return (
                        <div
                          key={itemId}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNotificationClick(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleNotificationClick(item);
                            }
                          }}
                          className={`p-3.5 flex items-start gap-3 transition cursor-pointer text-left select-none ${
                            isUnread
                              ? 'bg-sky-50/60 dark:bg-sky-950/25 hover:bg-sky-100/60 dark:hover:bg-sky-900/35'
                              : 'hover:bg-gray-50 dark:hover:bg-[#262626]'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {getNotificationIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-xs sm:text-sm truncate ${
                                isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'
                              }`}>
                                {item.title || getNotificationFallbackTitle(item.type)}
                              </p>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1" />
                              )}
                            </div>
                            {(item.message || item.body || item.content) && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                                {item.message || item.body || item.content}
                              </p>
                            )}
                            <span className="inline-block text-[11px] text-gray-400 dark:text-[#777] mt-1">
                              {formatNotificationTime(item.createdAt || item.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Popover Footer */}
                {hasMore && (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="w-full py-2.5 text-center text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-gray-50 dark:hover:bg-[#252525] border-t border-gray-100 dark:border-[#2f2f2f] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isLoadingMore ? (
                      <>
                        <FiRefreshCw size={12} className="animate-spin" />
                        <span>Loading older...</span>
                      </>
                    ) : (
                      <span>Load older notifications</span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              aria-label="Open profile menu"
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1f1f1f] cursor-pointer"
            >
              <IoPersonCircle className="w-full h-full text-slate-400 dark:text-slate-500" aria-hidden="true" />
              {currentUserProfile?.profilePictureUrl && (
                <img
                  src={currentUserProfile.profilePictureUrl}
                  alt={currentUserProfile?.name ? `${currentUserProfile.name} profile` : 'Profile'}
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  className="absolute inset-0 w-full h-full rounded-full object-cover border border-gray-200 dark:border-[#454545]"
                />
              )}
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

      {/* Mobile Navbar Header */}
      <header className="flex md:hidden bg-[#81ebfe] px-4 h-[54px] items-center justify-between sticky top-0 z-40 w-full shadow-xs select-none">
        {/* Left: Hamburger Icon */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label={isMobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="flex items-center justify-center p-2 -ml-2 text-black hover:opacity-75 active:scale-95 transition cursor-pointer"
        >
          <FiMenu size={24} className="stroke-[2.5]" />
        </button>

        {/* Center: Logo + "Frietsync" */}
        <Link to="/dashboard" className="flex items-center gap-2 select-none">
          <img
            src={logo}
            alt="FrietSync Logo"
            className="w-7 h-7 object-contain"
          />
          <span className="text-[22px] font-bold text-black tracking-tight font-sans">
            Frietsync
          </span>
        </Link>

        {/* Right: Circular Profile Avatar with White Border */}
        <div className="relative" ref={mobileProfileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            aria-label="Profile"
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-xs focus:outline-none cursor-pointer shrink-0 block"
          >
            {currentUserProfile?.profilePictureUrl ? (
              <img
                src={currentUserProfile.profilePictureUrl}
                alt={currentUserProfile?.name || 'Profile'}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full bg-sky-300 flex items-center justify-center text-slate-800 font-bold text-xs">
                {(currentUserProfile?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {isProfileMenuOpen && (
            <div
              role="menu"
              aria-label="Profile menu"
              className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-2xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#252525] shadow-2xl z-50 animate-fadeIn text-left"
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
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/30 transition disabled:opacity-50 text-left cursor-pointer"
              >
                <FiLogOut size={16} /> {isLoggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          )}
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
        isOpen={isInvitesModalOpen}
        onClose={() => setIsInvitesModalOpen(false)}
        onInviteAction={() => {
          refreshInviteCount();
          refreshUnreadCount();
        }}
      />
    </>
  );
};

export default DashboardNavbar;
