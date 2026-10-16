import { useState, useMemo } from 'react';
import { FiSearch, FiX, FiRefreshCw, FiFolder } from 'react-icons/fi';

const AVATAR_GRADIENTS = [
  'bg-gradient-to-tr from-sky-500 to-blue-600',
  'bg-gradient-to-tr from-indigo-500 to-purple-600',
  'bg-gradient-to-tr from-emerald-500 to-teal-600',
  'bg-gradient-to-tr from-rose-500 to-amber-500',
  'bg-gradient-to-tr from-violet-500 to-fuchsia-600',
  'bg-gradient-to-tr from-cyan-500 to-blue-500',
];

const getAvatarGradient = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

const formatSidebarTimestamp = (timeStr) => {
  if (!timeStr) return '';
  if (typeof timeStr !== 'string') return String(timeStr);

  if (timeStr.startsWith('Today, ')) {
    return timeStr.replace('Today, ', '').trim();
  }
  if (timeStr.startsWith('Yesterday')) {
    return 'Yesterday';
  }
  if (timeStr.includes(',')) {
    return timeStr.split(',')[0].trim();
  }
  return timeStr;
};

const ChatSidebar = ({
  projects = [],
  groups,
  activeConversationId,
  onSelectConversation,
  searchQuery = '',
  onSearchChange,
  isLoadingChannels = false,
  onRefresh,
}) => {
  const [activeFilter, setActiveFilter] = useState('all');

  const channelList = useMemo(() => {
    return projects && projects.length > 0 ? projects : groups || [];
  }, [projects, groups]);

  const filteredProjects = useMemo(() => {
    let list = channelList;
    if (activeFilter === 'unread') {
      list = list.filter((p) => p.unreadCount && p.unreadCount > 0);
    }
    // 'groups' represents group project chats (all FrietSync chats are project group chats)
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.lastMessage && p.lastMessage.toLowerCase().includes(q))
    );
  }, [channelList, searchQuery, activeFilter]);

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#fcf6f6] dark:bg-[#2a2a2a] rounded-xl border border-slate-200/80 dark:border-transparent p-2 sm:p-2.5 shadow-xs transition-colors w-[350px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Chats
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh chats"
          aria-label="Refresh chats"
          className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
        >
          <FiRefreshCw size={14} className={isLoadingChannels ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center mb-3">
        <FiSearch className="absolute left-3.5 text-slate-400 dark:text-[#717680] pointer-events-none" size={16} />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-100 dark:bg-[#131418] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#6b7280] text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 dark:focus:ring-[#38bdf8]/60 border border-transparent dark:border-[#272930] transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange?.('')}
            className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
          >
            <FiX size={14} />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-3.5">
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread' },
          { key: 'groups', label: 'Groups' },
        ].map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-slate-200 dark:bg-[#353535] text-slate-900 dark:text-white border border-slate-300 dark:border-[#484848] shadow-xs'
                  : 'text-slate-500 dark:text-[#b3b3b3] hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#333333]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-1 pr-0.5 min-h-0">
        {isLoadingChannels && (
          <div className="space-y-2 p-1 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#1f2128]">
                <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-[#2d303b] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-200 dark:bg-[#2d303b] rounded w-28" />
                  <div className="h-3 bg-slate-100 dark:bg-[#262833] rounded w-36" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoadingChannels && filteredProjects.length === 0 && (
          <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-[#282b36]">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#20232c] text-slate-400 dark:text-[#94a3b8] mx-auto flex items-center justify-center mb-2.5">
              <FiFolder size={20} />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {searchQuery ? 'No matching projects' : 'No project chats found'}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-[#858585] mt-1 leading-normal">
              {searchQuery
                ? `No project matches "${searchQuery}"`
                : 'When you are part of a project, its team chat channel will appear here.'}
            </p>
          </div>
        )}

        {!isLoadingChannels &&
          filteredProjects.map((project) => {
            const isSelected = activeConversationId === project.id;
            const initials = (project.name || 'PR')
              .trim()
              .split(/\s+/)
              .map((w) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectConversation(project.id)}
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50/90 dark:bg-[#1d2b37] border border-sky-400/70 dark:border-[#38bdf8]/70 shadow-xs'
                    : 'bg-white dark:bg-[#1d1d1d] border border-transparent hover:bg-slate-100/70 dark:hover:bg-[#252525]'
                }`}
              >
                {/* Project Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs ${getAvatarGradient(
                      project.name
                    )}`}
                  >
                    {initials}
                  </div>
                </div>

                {/* Project Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1 mb-0.5">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isSelected
                          ? 'text-sky-950 dark:text-white'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {project.name}
                    </p>
                    <span className="text-[11px] text-slate-400 dark:text-[#94a3b8] shrink-0 font-normal">
                      {formatSidebarTimestamp(project.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        isSelected
                          ? 'text-sky-800/80 dark:text-slate-300'
                          : 'text-slate-500 dark:text-[#94a3b8]'
                      }`}
                    >
                      {project.lastMessage || 'No messages yet'}
                    </p>
                    {project.unreadCount > 0 && (
                      <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-[#0284c7] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                        {project.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
};

export default ChatSidebar;

