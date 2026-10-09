import { useState, useEffect } from 'react';
import {
  FiHome,
  FiFolder,
  FiRefreshCw,
  FiBriefcase,
  FiUsers,
  FiSettings,
  FiChevronsLeft,
  FiChevronsRight,
  FiChevronDown,
  FiChevronRight,
} from 'react-icons/fi';
import { AiOutlineBug } from 'react-icons/ai';
import { IoChatboxEllipsesOutline } from "react-icons/io5";
import { IoMailOutline } from "react-icons/io5";

const NOTCH_BG = '#eaedf1';

const ActiveNotch = ({ icon: Icon, badge = 0 }) => (
  <>
    <svg
      className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-10"
      style={{ right: '-2px', width: 56, height: 76, color: NOTCH_BG }}
      viewBox="0 0 56 76"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M 56 0 C 34 6, 4 16, 4 38 C 4 60, 34 70, 56 76 Z" />
    </svg>

    <div
      className="absolute top-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center z-20 pointer-events-none"
      style={{ right: '-5px' }}
    >
      <Icon size={20} className="stroke-[2.2] text-[#0284c7]" />
      {badge > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </div>
  </>
);

const Sidebar = ({
  activeTab = 'dashboard',
  setActiveTab,
  projectFilter = 'all',
  setProjectFilter,
  pendingInviteCount = 0,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isCollapsed) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    {
      id: 'projects',
      label: 'Projects',
      icon: FiFolder,
      hasSubmenu: true,
      subItems: [
        { id: 'all', label: 'All Projects' },
        { id: 'active', label: 'Active' },
        { id: 'completed', label: 'Completed' },
      ],
    },
    { id: 'issues', label: 'Issues', icon: AiOutlineBug },
    { id: 'sprints', label: 'Sprints', icon: FiRefreshCw },
    { id: 'my-work', label: 'My Work', icon: FiBriefcase },
    { id: 'chats', label: 'Chats', icon: IoChatboxEllipsesOutline  },
    { id: 'invites', label: 'My Invites', icon: IoMailOutline, badge: pendingInviteCount },
  ];

  const bottomNavItems = [
    { id: 'team', label: 'Team', icon: FiUsers },
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ];

  const handleItemClick = (id) => {
    setActiveTab(id);
    if (id === 'projects' && !isCollapsed) {
      setIsProjectsExpanded((prev) => !prev);
    }
  };

  return (
    <>
           {!isCollapsed && (
  <div
    className="fixed inset-0 z-30 bg-slate-900/20 transition-opacity duration-300"
    onClick={() => setIsCollapsed(true)}
    aria-hidden="true"
  />
)}

      <aside
        aria-label="Sidebar navigation"
        className={`fixed left-2 sm:left-4 top-[74px] bottom-3 select-none z-40 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        <div
          className={`bg-white border border-slate-200/90 flex flex-col justify-between transition-all duration-300 relative h-full ${
            isCollapsed
              ? 'rounded-[36px] py-4 px-0 items-center shadow-lg shadow-slate-300/40'
              : 'rounded-3xl p-5 shadow-2xl shadow-slate-400/30'
          }`}
        >
          <div
            className={`flex items-center w-full ${
              isCollapsed ? 'justify-center pb-3' : 'justify-between pb-4 border-b border-slate-100'
            }`}
          >
            {!isCollapsed && (
              <div className="flex items-center gap-2 pl-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
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
              const isActive = activeTab === item.id;

              if (isCollapsed) {
                return (
                  <div key={item.id} className="relative w-full flex justify-center py-0.5 group">
                    <button
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      aria-label={item.label}
                      className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'text-sky-600 z-30 font-bold opacity-0'
                          : 'text-slate-800 hover:text-sky-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={21} className="stroke-[1.9]" />

                      {item.badge > 0 && !isActive && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                      )}
                    </button>

                    {isActive && <ActiveNotch icon={Icon} badge={item.badge} />}

                    <div className="absolute left-[70px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {item.label}
                      {item.badge > 0 && ` (${item.badge})`}
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className="w-full">
                  <button
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-50 text-sky-700 font-semibold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={19}
                        className={isActive ? 'text-sky-600 stroke-[2.2]' : 'text-slate-500'}
                      />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-sky-100 text-sky-700">
                          {item.badge}
                        </span>
                      )}
                      {item.hasSubmenu && (
                        <span className="text-slate-400">
                          {isProjectsExpanded ? (
                            <FiChevronDown size={15} />
                          ) : (
                            <FiChevronRight size={15} />
                          )}
                        </span>
                      )}
                    </div>
                  </button>

                  {item.hasSubmenu && isProjectsExpanded && (
                    <div className="pl-9 pr-2 py-1 space-y-1">
                      {item.subItems.map((sub) => {
                        const isSubActive = isActive && projectFilter === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab('projects');
                              if (setProjectFilter) setProjectFilter(sub.id);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                              isSubActive
                                ? 'text-sky-600 bg-sky-50/80 font-bold'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSubActive ? 'bg-sky-600' : 'bg-slate-300'
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
            className={`w-full pt-3 border-t border-slate-100 flex flex-col ${
              isCollapsed ? 'items-center gap-1.5' : 'gap-1'
            }`}
          >
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (isCollapsed) {
                return (
                  <div key={item.id} className="relative w-full flex justify-center py-0.5 group">
                    <button
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      aria-label={item.label}
                      className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'text-sky-600 z-30 font-bold opacity-0'
                          : 'text-slate-800 hover:text-sky-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={21} className="stroke-[1.9]" />
                    </button>

                    {isActive && <ActiveNotch icon={Icon} />}

                    <div className="absolute left-[70px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {item.label}
                    </div>
                  </div>
                );
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-semibold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    size={19}
                    className={isActive ? 'text-sky-600 stroke-[2.2]' : 'text-slate-500'}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;