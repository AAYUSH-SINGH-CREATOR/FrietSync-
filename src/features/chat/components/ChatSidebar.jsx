import { useMemo } from 'react';
import { FiSearch, FiX, FiFolder } from 'react-icons/fi';

const ChatSidebar = ({
  projects = [],
  groups,
  activeConversationId,
  onSelectConversation,
  searchQuery = '',
  onSearchChange,
  isLoadingChannels = false,
}) => {
  const channelList = useMemo(() => {
    return projects && projects.length > 0 ? projects : groups || [];
  }, [projects, groups]);

  const filteredProjects = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return channelList;
    return channelList.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.lastMessage && p.lastMessage.toLowerCase().includes(q))
    );
  }, [channelList, searchQuery]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="bg-white dark:bg-[#172033] rounded-3xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-[#293548] shadow-xs shrink-0">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] flex items-center justify-center">
              <FiFolder size={15} />
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-[#F1F5F9] tracking-tight">
              Project Channels
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 dark:text-[#94A3B8] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E293B]">
            {channelList.length} {channelList.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        <div className="relative flex items-center">
          <FiSearch className="absolute left-3.5 text-slate-400 dark:text-[#94A3B8]" size={16} />
          <input
            type="text"
            placeholder="Filter projects..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-2xl bg-slate-50 dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#64748B] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:focus:ring-sky-400/20 border border-transparent dark:border-[#334155] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-[#F1F5F9] cursor-pointer"
            >
              <FiX size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4 pr-0.5 min-h-0">
        {isLoadingChannels && (
          <div className="bg-white dark:bg-[#172033] rounded-3xl p-5 border border-slate-200/80 dark:border-[#293548] animate-pulse space-y-3">
            <div className="h-4 w-32 bg-slate-100 dark:bg-[#1E293B] rounded" />
            <div className="h-14 bg-slate-50 dark:bg-[#1E293B]/60 rounded-2xl" />
            <div className="h-14 bg-slate-50 dark:bg-[#1E293B]/60 rounded-2xl" />
            <div className="h-14 bg-slate-50 dark:bg-[#1E293B]/60 rounded-2xl" />
          </div>
        )}

        {!isLoadingChannels && filteredProjects.length === 0 && (
          <div className="bg-white dark:bg-[#172033] rounded-3xl p-8 border border-slate-200/80 dark:border-[#293548] text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-500 dark:text-[#60A5FA] mx-auto flex items-center justify-center mb-3">
              <FiFolder size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-[#F1F5F9]">
              {searchQuery ? 'No matching projects' : 'No project channels found'}
            </p>
            <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">
              {searchQuery
                ? `No project matches "${searchQuery}"`
                : 'You are not assigned to any projects yet. When you join or create a project, its team chat channel will appear here.'}
            </p>
          </div>
        )}

        {!isLoadingChannels && filteredProjects.length > 0 && (
          <div className="bg-white dark:bg-[#172033] rounded-3xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-[#293548] shadow-xs">
            <div className="space-y-1">
              {filteredProjects.map((project, idx) => {
                const isSelected = activeConversationId === project.id;
                const initials = (project.name || 'PR')
                  .trim()
                  .split(/\s+/)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div key={project.id}>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(project.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50/80 dark:bg-[#1E3A5F]/50 border border-sky-200/80 dark:border-blue-700/60 shadow-2xs'
                          : 'hover:bg-slate-50 dark:hover:bg-[#1E293B]/70 border border-transparent'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                          {initials}
                        </div>
                        <span
                          title="Project Channel"
                          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#172033]"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1 mb-0.5">
                          <p
                            className={`text-sm font-bold truncate ${
                              isSelected
                                ? 'text-sky-950 dark:text-[#F1F5F9]'
                                : 'text-slate-900 dark:text-[#F1F5F9]'
                            }`}
                          >
                            {project.name}
                          </p>
                          <span className="text-[11px] text-slate-400 dark:text-[#94A3B8] shrink-0 font-normal">
                            {project.timestamp || ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate ${
                              isSelected
                                ? 'text-sky-800/80 dark:text-[#CBD5E1]'
                                : 'text-slate-500 dark:text-[#94A3B8]'
                            }`}
                          >
                            {project.lastMessage || 'Team discussion channel'}
                          </p>
                          {project.status && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#334155] shrink-0">
                              {project.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {idx < filteredProjects.length - 1 && (
                      <div className="h-px bg-slate-100 dark:bg-[#293548]/60 my-1 mx-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
