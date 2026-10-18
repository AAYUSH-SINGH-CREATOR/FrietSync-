import { useState, useMemo } from 'react';
import { FiSearch, FiX, FiPlus, FiMessageSquare } from 'react-icons/fi';
import { getInitials, getAvatarColor } from '../services/chatApi';

const ChatSidebar = ({
  groups = [],
  activeConversationId,
  onSelectConversation,
  searchQuery = '',
  onSearchChange,
  isLoadingProjects = false,
  onNewChat,
}) => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredConversations = useMemo(() => {
    let list = groups;
    if (activeFilter === 'Unread') {
      list = list.filter((g) => (g.unreadCount || 0) > 0);
    } else if (activeFilter === 'Groups') {
      list = list.filter((g) => g.isGroup !== false);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((g) =>
      (g.name || '').toLowerCase().includes(q) ||
      (g.lastMessage && g.lastMessage.toLowerCase().includes(q)) ||
      (g.description && g.description.toLowerCase().includes(q))
    );
  }, [groups, activeFilter, searchQuery]);

  return (
    <div className="bg-[#F3F4F6] dark:bg-[#252525] rounded-2xl p-3 sm:p-4 flex flex-col h-full min-h-0 min-w-0 w-full overflow-hidden border border-slate-200/60 dark:border-white/5">
      {/* 1. Header with Title and Plus Button */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Chats</h2>
        <button
          type="button"
          onClick={onNewChat}
          title="Start new conversation"
          className="w-8 h-8 rounded-full bg-[#007DFE] hover:bg-sky-600 active:bg-sky-700 text-white flex items-center justify-center transition shadow-xs cursor-pointer"
        >
          <FiPlus size={18} />
        </button>
      </div>

      {/* 2. Capsule Search Input */}
      <div className="relative flex items-center mt-3 shrink-0">
        <FiSearch className="absolute left-3 text-slate-400" size={15} />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-1.5 rounded-full bg-white dark:bg-[#171717] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm border border-slate-200/80 dark:border-white/5 focus:outline-none focus:border-sky-400 transition"
        />
        {searchQuery && (
          <button type="button" onClick={() => onSearchChange('')} className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <FiX size={13} />
          </button>
        )}
      </div>

      {/* 3. Filter Pills (All, Unread, Groups) */}
      <div className="flex items-center gap-1.5 mt-3 shrink-0">
        {['All', 'Unread', 'Groups'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveFilter(tab)}
            className={`flex-1 py-1 rounded-full text-xs font-semibold text-center transition cursor-pointer ${
              activeFilter === tab
                ? 'bg-white dark:bg-[#171717] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 4. Scrollable Conversations List */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 mt-3 pr-0.5 min-h-0">
        {isLoadingProjects ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-white/70 dark:bg-[#171717]/70 rounded-2xl" />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-10 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#171717] text-slate-400 flex items-center justify-center mx-auto mb-2">
              <FiMessageSquare size={18} />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {searchQuery ? 'No matching conversations' : activeFilter === 'Unread' ? 'No unread messages' : 'No conversations yet'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery ? `No chats match "${searchQuery}"` : 'Your project team chats will appear here.'}
            </p>
          </div>
        ) : (
          filteredConversations.map((item) => {
            const isSelected = activeConversationId === item.id;
            const initials = getInitials(item.name);
            const avatarColor = getAvatarColor(item.name);
            const unread = item.unreadCount || 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectConversation(item.id)}
                className={`w-full rounded-2xl p-2.5 flex items-center gap-3 transition cursor-pointer text-left ${
                  isSelected
                    ? 'bg-white dark:bg-[#171717] border-2 border-sky-400 shadow-sm'
                    : 'bg-white dark:bg-[#171717] border border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 shadow-2xs'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full ${avatarColor} text-white font-bold text-xs flex items-center justify-center shadow-xs select-none`}>
                      {initials}
                    </div>
                  )}
                  {item.status === 'Online' && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#171717]" />
                  )}
                </div>

                {/* Name & Latest Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{item.timestamp || ''}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">{item.lastMessage || 'No messages yet'}</p>
                    {unread > 0 && (
                      <span className="w-4 h-4 rounded-full bg-[#007DFE] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
