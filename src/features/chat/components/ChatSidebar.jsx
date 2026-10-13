import { useMemo } from 'react';
import { FiSearch, FiX, FiPlus, FiUserPlus, FiUsers } from 'react-icons/fi';

const ChatSidebar = ({
  groups = [],
  people = [],
  activeConversationId,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onOpenCreateGroup,
  onOpenAddMember,
  isLoadingChannels = false,
}) => {
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      (g.name || '').toLowerCase().includes(q) ||
      (g.lastMessage && g.lastMessage.toLowerCase().includes(q))
    );
  }, [groups, searchQuery]);

  const filteredPeople = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.role && p.role.toLowerCase().includes(q)) ||
      (p.lastMessage && p.lastMessage.toLowerCase().includes(q))
    );
  }, [people, searchQuery]);

  const showGroups = activeFilter === 'all' || activeFilter === 'groups';
  const showPeople = activeFilter === 'all' || activeFilter === 'direct';

  const hasAnyResults = (showGroups && filteredGroups.length > 0) || (showPeople && filteredPeople.length > 0);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="bg-white dark:bg-[#172033] rounded-3xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-[#293548] shadow-xs shrink-0">
        <div className="relative flex items-center">
          <FiSearch className="absolute left-3.5 text-slate-400 dark:text-[#94A3B8]" size={18} />
          <input
            type="text"
            placeholder="Search groups, people, messages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-2xl bg-slate-50 dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#64748B] text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:focus:ring-sky-400/20 border border-transparent dark:border-[#334155] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-[#F1F5F9] cursor-pointer"
            >
              <FiX size={15} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-[#293548] flex-wrap">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-sky-600 dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-[#253247]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('groups')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeFilter === 'groups'
                  ? 'bg-sky-600 dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-[#253247]'
              }`}
            >
              Groups
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('direct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeFilter === 'direct'
                  ? 'bg-sky-600 dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-[#253247]'
              }`}
            >
              Direct
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenCreateGroup}
              title="Create new group"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-[#253247] border border-transparent dark:border-[#334155] text-xs font-medium transition cursor-pointer"
            >
              <FiPlus size={13} />
              <span className="hidden sm:inline">+ Group</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddMember}
              title="Add member"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-[#253247] border border-transparent dark:border-[#334155] text-xs font-medium transition cursor-pointer"
            >
              <FiUserPlus size={13} />
              <span className="hidden sm:inline">+ Member</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4 pr-0.5 min-h-0">
        {isLoadingChannels && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#172033] rounded-3xl p-5 border border-slate-200/80 dark:border-[#293548] animate-pulse space-y-3">
              <div className="h-4 w-32 bg-slate-100 dark:bg-[#1E293B] rounded" />
              <div className="h-12 bg-slate-50 dark:bg-[#1E293B]/60 rounded-2xl" />
              <div className="h-12 bg-slate-50 dark:bg-[#1E293B]/60 rounded-2xl" />
            </div>
          </div>
        )}

        {!isLoadingChannels && !hasAnyResults && (
          <div className="bg-white dark:bg-[#172033] rounded-3xl p-8 border border-slate-200/80 dark:border-[#293548] text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-500 dark:text-[#60A5FA] mx-auto flex items-center justify-center mb-3">
              <FiUsers size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-[#F1F5F9]">
              {searchQuery ? 'No matching conversations' : 'No conversations found'}
            </p>
            <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1 mb-4">
              {searchQuery
                ? `No groups or members match "${searchQuery}"`
                : 'Create a group to start messaging with your team.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={onOpenCreateGroup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                <FiPlus size={14} />
                <span>Create Group</span>
              </button>
            )}
          </div>
        )}

        {!isLoadingChannels && hasAnyResults && (
          <div className="bg-white dark:bg-[#172033] rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-[#293548] shadow-xs">
            <div className="space-y-1">
              {showGroups &&
                filteredGroups.map((group, idx) => {
                  const isSelected = activeConversationId === group.id;
                  const memberCount = Array.isArray(group.members) ? group.members.length : 0;

                  return (
                    <div key={group.id}>
                      <button
                        type="button"
                        onClick={() => onSelectConversation(group.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50/80 dark:bg-[#1E3A5F]/50 border border-sky-200/80 dark:border-blue-700/60 shadow-2xs'
                            : 'hover:bg-slate-50 dark:hover:bg-[#1E293B]/70 border border-transparent'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                            {group.name ? group.name.slice(0, 2).toUpperCase() : 'GP'}
                          </div>
                          <span
                            title="Active Group"
                            className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#172033]"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-1 mb-0.5">
                            <p className={`text-sm font-bold truncate ${
                              isSelected
                                ? 'text-sky-950 dark:text-[#F1F5F9]'
                                : 'text-slate-900 dark:text-[#F1F5F9]'
                            }`}>
                              {group.name}
                            </p>
                            <span className="text-[11px] text-slate-400 dark:text-[#94A3B8] shrink-0 font-normal">
                              {group.timestamp || ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs truncate ${
                              isSelected
                                ? 'text-sky-800/80 dark:text-[#CBD5E1]'
                                : 'text-slate-500 dark:text-[#94A3B8]'
                            }`}>
                              {group.lastMessage || 'Live group chat'}
                            </p>
                            {memberCount > 0 && (
                              <span className="text-[10px] text-slate-400 dark:text-[#64748B] shrink-0">
                                {memberCount} {memberCount === 1 ? 'member' : 'members'}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {idx < filteredGroups.length - 1 && (
                        <div className="h-px bg-slate-100 dark:bg-[#293548]/60 my-1 mx-2" />
                      )}
                    </div>
                  );
                })}

              {showGroups && showPeople && filteredGroups.length > 0 && filteredPeople.length > 0 && (
                <div className="h-px bg-slate-100 dark:bg-[#293548]/60 my-2 mx-2" />
              )}

              {showPeople &&
                filteredPeople.map((person, idx) => {
                  const isSelected = activeConversationId === person.id;

                  return (
                    <div key={person.id || idx}>
                      <button
                        type="button"
                        onClick={() => onSelectConversation(person.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50/80 dark:bg-[#1E3A5F]/50 border border-sky-200/80 dark:border-blue-700/60 shadow-2xs'
                            : 'hover:bg-slate-50 dark:hover:bg-[#1E293B]/70 border border-transparent'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                            {person.name ? person.name.slice(0, 2).toUpperCase() : 'US'}
                          </div>
                          <span
                            title="Active Teammate"
                            className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#172033]"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-1 mb-0.5">
                            <p className={`text-sm font-bold truncate ${
                              isSelected
                                ? 'text-sky-950 dark:text-[#F1F5F9]'
                                : 'text-slate-900 dark:text-[#F1F5F9]'
                            }`}>
                              {person.name}
                            </p>
                            {person.role && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-[#334155] shrink-0">
                                {person.role}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs truncate ${
                            isSelected
                              ? 'text-sky-800/80 dark:text-[#CBD5E1]'
                              : 'text-slate-500 dark:text-[#94A3B8]'
                          }`}>
                            {person.email || person.lastMessage || 'Direct message'}
                          </p>
                        </div>
                      </button>

                      {idx < filteredPeople.length - 1 && (
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
