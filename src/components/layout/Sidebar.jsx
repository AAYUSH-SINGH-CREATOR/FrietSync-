import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiFolder,
  FiRefreshCw,
  FiBriefcase,
  FiCalendar,
  FiUsers,
  FiSettings,
  FiChevronsLeft,
  FiChevronsRight,
  FiChevronDown,
  FiChevronRight,
  FiX,
  FiSun,
  FiMoon,
  FiLogOut,
} from 'react-icons/fi';
import { AiOutlineBug } from 'react-icons/ai';
import { IoChatboxEllipsesOutline, IoMailOutline } from 'react-icons/io5';
import logo from '../../assets/logo.svg';
import { useTheme } from '../../context/ThemeContext';
import { logoutUser } from '../../features/auth/services/authApi';

const ActiveNotch = ({ icon: Icon, badge = 0 }) => (
  <>
      <svg
      className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-10 text-[#eaedf1] dark:text-[#292929]"
      style={{ right: '-2px', width: 60, height: 96 }}
      viewBox="0 0 60 96"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M 60 4.1 L 58 4.1 A 14 14 0 0 1 43.05 18.07 A 30 30 0 1 0 43.05 77.93 A 14 14 0 0 1 58 91.9 L 60 91.9 Z" />
    </svg>

    <div
      className="absolute top-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-full bg-white dark:bg-[#1d1d1d] shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] dark:border dark:border-[#454545] flex items-center justify-center z-20 pointer-events-none"
      style={{ right: '-5px' }}
    >
      <Icon size={20} className="stroke-[2.2] text-[#0284c7] dark:text-[#60A5FA]" />
      {badge > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </div>
  </>
);

const Sidebar = ({
  projectFilter = 'all',
  setProjectFilter,
  pendingInviteCount = 0,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme() || {};
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!isCollapsed) setIsCollapsed(true);
        if (isMobileOpen) onCloseMobile?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, isMobileOpen, onCloseMobile]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const mainNavItems = [
    { id: 'dashboard', to: '/dashboard', end: true, label: 'Dashboard', icon: FiHome },
    {
      id: 'projects',
      to: '/dashboard/projects',
      label: 'Projects',
      icon: FiFolder,
      hasSubmenu: true,
      subItems: [
        { id: 'all', label: 'All Projects' },
        { id: 'active', label: 'Active' },
        { id: 'completed', label: 'Completed' },
      ],
    },
    { id: 'issues', to: '/dashboard/issues', label: 'Issues', icon: AiOutlineBug },
    { id: 'sprints', to: '/dashboard/sprints', label: 'Sprints', icon: FiRefreshCw },
    { id: 'my-work', to: '/dashboard/my-work', label: 'My Work', icon: FiBriefcase },
    { id: 'calendar', to: '/dashboard/calendar', label: 'Calendar', icon: FiCalendar },
    { id: 'chats', to: '/dashboard/chats', label: 'Chats', icon: IoChatboxEllipsesOutline },
    { id: 'invites', to: '/dashboard/invites', label: 'My Invites', icon: IoMailOutline, badge: pendingInviteCount },
  ];

  const bottomNavItems = [
    { id: 'team', to: '/dashboard/team', label: 'Team', icon: FiUsers },
    { id: 'settings', to: '/dashboard/settings', label: 'Settings', icon: FiSettings },
  ];

  const checkIsActive = (item) => {
    if (item.end) {
      return location.pathname === item.to;
    }
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  return (
    <>
      {!isCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/20 dark:bg-black/40 transition-opacity duration-300"
          onClick={() => setIsCollapsed(true)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Sidebar navigation"
        className={`hidden md:block fixed left-2 sm:left-4 top-[74px] bottom-3 select-none z-40 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        <div
          className={`bg-white dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#303030] flex flex-col justify-between transition-all duration-300 relative h-full ${
            isCollapsed
              ? 'rounded-[36px] py-4 px-0 items-center shadow-lg shadow-slate-300/40 dark:shadow-black/60'
              : 'rounded-3xl p-5 shadow-2xl shadow-slate-400/30 dark:shadow-black/60'
          }`}
        >
          <div
            className={`flex items-center w-full ${
              isCollapsed ? 'justify-center pb-3' : 'justify-between pb-4 border-b border-slate-100 dark:border-[#303030]'
            }`}
          >
            {!isCollapsed && (
              <div className="flex items-center gap-2 pl-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#b3b3b3]">
                  Workspace
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="w-8 h-8 rounded-full bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white flex items-center justify-center shadow-md shadow-sky-600/30 transition-transform duration-200 hover:scale-105 cursor-pointer shrink-0"
            >
              {isCollapsed ? <FiChevronsRight size={17} /> : <FiChevronsLeft size={17} />}
            </button>
          </div>

          <div
            className={`flex-1 flex flex-col w-full ${
              isCollapsed ? 'gap-1.5 items-center justify-start pt-1' : 'gap-1.5 pt-3 overflow-y-auto'
            }`}
          >
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isItemActive = checkIsActive(item);

              if (isCollapsed) {
                return (
                  <div key={item.id} className="relative w-full flex justify-center py-0.5 group">
                    <NavLink
                      to={item.to}
                      end={item.end}
                      aria-label={item.label}
                      className={({ isActive }) =>
                        `relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'text-sky-600 dark:text-[#d7d0ff] z-30 font-bold opacity-0'
                            : 'text-slate-800 dark:text-[#e0e0e0] hover:text-sky-600 dark:hover:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#242424]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={21} className="stroke-[1.9]" />

                          {item.badge > 0 && !isActive && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#1f1f1f]" />
                          )}
                        </>
                      )}
                    </NavLink>

                    {isItemActive && <ActiveNotch icon={Icon} badge={item.badge} />}

                    <div className="absolute left-[70px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-[#242424] text-white dark:text-[#F1F5F9] dark:border dark:border-[#454545] text-xs font-medium whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {item.label}
                      {item.badge > 0 && ` (${item.badge})`}
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className="w-full">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => {
                      if (item.hasSubmenu) {
                        setIsProjectsExpanded((prev) => !prev);
                      }
                    }}
                    className={({ isActive }) =>
                      `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-50 dark:bg-[#302477] text-sky-700 dark:text-[#d7d0ff] font-semibold shadow-xs'
                          : 'text-slate-700 dark:text-[#e0e0e0] hover:bg-slate-50 dark:hover:bg-[#242424] hover:text-slate-900 dark:hover:text-[#F1F5F9]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <Icon
                            size={19}
                            className={isActive ? 'text-sky-600 dark:text-[#d7d0ff] stroke-[2.2]' : 'text-slate-500 dark:text-[#b3b3b3]'}
                          />
                          <span>{item.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {item.badge > 0 && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-sky-100 dark:bg-[#302477] text-sky-700 dark:text-[#d7d0ff]">
                              {item.badge}
                            </span>
                          )}
                          {item.hasSubmenu && (
                            <span className="text-slate-400 dark:text-[#b3b3b3]">
                              {isProjectsExpanded ? (
                                <FiChevronDown size={15} />
                              ) : (
                                <FiChevronRight size={15} />
                              )}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </NavLink>

                  {item.hasSubmenu && isProjectsExpanded && (
                    <div className="pl-9 pr-2 py-1 space-y-1">
                      {item.subItems.map((sub) => {
                        const isSubActive = isItemActive && projectFilter === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/dashboard/projects');
                              if (setProjectFilter) setProjectFilter(sub.id);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                              isSubActive
                                ? 'text-sky-600 dark:text-[#d7d0ff] bg-sky-50/80 dark:bg-[#302477]/60 font-bold'
                                : 'text-slate-500 dark:text-[#b3b3b3] hover:text-slate-800 dark:hover:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#242424]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSubActive ? 'bg-sky-600 dark:bg-[#60A5FA]' : 'bg-slate-300 dark:bg-[#3a3a3a]'
                              }`}
                            />
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className={`w-full pt-3 border-t border-slate-100 dark:border-[#303030] flex flex-col ${
              isCollapsed ? 'items-center gap-1.5' : 'gap-1'
            }`}
          >
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isItemActive = checkIsActive(item);

              if (isCollapsed) {
                return (
                  <div key={item.id} className="relative w-full flex justify-center py-0.5 group">
                    <NavLink
                      to={item.to}
                      end={item.end}
                      aria-label={item.label}
                      className={({ isActive }) =>
                        `relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'text-sky-600 dark:text-[#d7d0ff] z-30 font-bold opacity-0'
                            : 'text-slate-800 dark:text-[#e0e0e0] hover:text-sky-600 dark:hover:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#242424]'
                        }`
                      }
                    >
                      <Icon size={21} className="stroke-[1.9]" />
                    </NavLink>

                    {isItemActive && <ActiveNotch icon={Icon} />}

                    <div className="absolute left-[70px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-[#242424] text-white dark:text-[#F1F5F9] dark:border dark:border-[#454545] text-xs font-medium whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {item.label}
                    </div>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-50 dark:bg-[#302477] text-sky-700 dark:text-[#d7d0ff] font-semibold shadow-xs'
                        : 'text-slate-700 dark:text-[#e0e0e0] hover:bg-slate-50 dark:hover:bg-[#242424] hover:text-slate-900 dark:hover:text-[#F1F5F9]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={19}
                        className={isActive ? 'text-sky-600 dark:text-[#d7d0ff] stroke-[2.2]' : 'text-slate-500 dark:text-[#b3b3b3]'}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay + Drawer */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden animate-fadeIn"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            aria-label="Mobile navigation drawer"
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-[#181818] border-r border-slate-200 dark:border-[#303030] shadow-2xl flex flex-col justify-between p-4 sm:p-5 md:hidden text-left select-none overflow-y-auto"
          >
            <div>
              {/* Header with Logo and Close */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#2e2e2e]">
                <div className="flex items-center gap-2.5">
                  <img src={logo} alt="FrietSync Logo" className="w-7 h-7 object-contain" />
                  <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                    FrietSync
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="Close navigation"
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#252525] transition cursor-pointer"
                >
                  <FiX size={19} />
                </button>
              </div>

              {/* Main Nav Items */}
              <nav className="mt-4 space-y-1">
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = checkIsActive(item);

                  return (
                    <div key={item.id}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => {
                          if (item.hasSubmenu) {
                            setIsProjectsExpanded((prev) => !prev);
                          } else {
                            onCloseMobile?.();
                          }
                        }}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                          isActive
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-[#60A5FA] font-semibold'
                            : 'text-slate-700 dark:text-[#d0d0d0] hover:bg-slate-100 dark:hover:bg-[#242424] hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            size={19}
                            className={isActive ? 'text-sky-600 dark:text-[#60A5FA]' : 'text-slate-500 dark:text-[#999]'}
                          />
                          <span>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.badge > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                          {item.hasSubmenu && (
                            isProjectsExpanded ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />
                          )}
                        </div>
                      </NavLink>

                      {/* Submenu for Projects */}
                      {item.hasSubmenu && isProjectsExpanded && (
                        <div className="pl-9 pr-2 py-1 space-y-1">
                          {item.subItems.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => {
                                setProjectFilter?.(sub.id);
                                onCloseMobile?.();
                                navigate('/dashboard/projects');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                                projectFilter === sub.id
                                  ? 'text-sky-600 dark:text-sky-400 bg-sky-50/60 dark:bg-sky-950/20 font-semibold'
                                  : 'text-slate-500 dark:text-[#a0a0a0] hover:text-slate-800 dark:hover:text-white'
                              }`}
                            >
                              {sub.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              {/* Divider */}
              <div className="my-3.5 border-t border-slate-100 dark:border-[#2e2e2e]" />

              {/* Bottom Nav Items */}
              <div className="space-y-1">
                {bottomNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = checkIsActive(item);

                  return (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      onClick={onCloseMobile}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                        isActive
                          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-[#60A5FA] font-semibold'
                          : 'text-slate-700 dark:text-[#d0d0d0] hover:bg-slate-100 dark:hover:bg-[#242424] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon
                        size={19}
                        className={isActive ? 'text-sky-600 dark:text-[#60A5FA]' : 'text-slate-500 dark:text-[#999]'}
                      />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions: Theme Toggle & Logout */}
            <div className="pt-3.5 border-t border-slate-100 dark:border-[#2e2e2e] space-y-1.5">
              {toggleTheme && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#242424] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    {isDarkMode ? <FiSun size={16} className="text-amber-400" /> : <FiMoon size={16} className="text-slate-600" />}
                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{isDarkMode ? 'Dark' : 'Light'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={async () => {
                  onCloseMobile?.();
                  await logoutUser();
                  window.location.replace('/login');
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer text-left"
              >
                <FiLogOut size={16} />
                <span>Log out</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;
