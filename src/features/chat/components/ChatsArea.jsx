import { useState, useRef, useEffect, useMemo } from 'react';
import {
  FiSend,
  FiMoreVertical,
  FiArrowLeft,
  FiPaperclip,
  FiSmile,
  FiSearch,
  FiMessageSquare,
} from 'react-icons/fi';
import { getInitials, getAvatarColor, getCurrentChatUser } from '../services/chatApi';

const ChatAvatar = ({ src, name, className, color }) => {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name);
  return src && !failed
    ? <img src={src} alt={name || 'User avatar'} onError={() => setFailed(true)} className={`${className} object-cover rounded-full`} />
    : <div className={`${className} ${color || getAvatarColor(name)} rounded-full text-white font-semibold flex items-center justify-center shrink-0 select-none`}>{initials}</div>;
};

const ChatArea = ({
  activeChat,
  messages = [],
  onSendMessage,
  onBackToList,
  onOpenGroupDetails,
  connectionStatus = 'disconnected',
  isLoadingMessages = false,
  currentUser: currentUserProp,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInChat, setSearchInChat] = useState('');
  const messagesEndRef = useRef(null);

  const currentUser = currentUserProp || getCurrentChatUser();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat?.id]);

  const handleSend = (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || text.length > 2000) return;
    const sent = onSendMessage(text);
    if (sent === false) return;
    setInputText('');
    setSearchInChat('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const displayedMessages = useMemo(() => {
    if (!searchInChat.trim()) return messages;
    const q = searchInChat.trim().toLowerCase();
    return messages.filter((m) =>
      (m.text || '').toLowerCase().includes(q) ||
      (m.sender || '').toLowerCase().includes(q)
    );
  }, [messages, searchInChat]);

  if (!activeChat) {
    return (
      <div className="w-full flex-1 min-w-0 bg-gradient-to-br from-[#D9EAFD] via-[#EAF2FF] to-[#D5E7FC] dark:from-[#060D1A] dark:via-[#091527] dark:to-[#040A14] border border-sky-200/50 dark:border-cyan-900/30 rounded-2xl sm:rounded-3xl shadow-sm h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-white dark:bg-[#171717] text-sky-500 dark:text-sky-400 flex items-center justify-center mb-3 shadow-xs">
          <FiMessageSquare size={24} />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Select a conversation</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
          Choose a project chat from the left panel to join the conversation.
        </p>
      </div>
    );
  }

  const isProject = !!activeChat.isProject;
  const memberCount = Array.isArray(activeChat.members) ? activeChat.members.length : 0;
  const projectInitials = getInitials(activeChat.name);
  const projectColor = getAvatarColor(activeChat.name);

  return (
    <div className="w-full flex-1 min-w-0 bg-gradient-to-br from-[#D9EAFD] via-[#EAF2FF] to-[#D5E7FC] dark:from-[#060D1A] dark:via-[#091527] dark:to-[#040A14] border-2 sm:border-4 border-[#CCE5FE] dark:border-[#1B3654] rounded-3xl shadow-sm flex flex-col h-full min-h-0 overflow-hidden relative transition-colors">
      {/* 1. Inset Floating Header (Frame 397) */}
      <div className="bg-white dark:bg-[#171717] rounded-2xl mx-2.5 sm:mx-3 mt-2.5 sm:mt-3 px-3.5 sm:px-5 py-2.5 sm:py-3 shadow-xs border border-sky-100 dark:border-white/5 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back to List Button */}
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="lg:hidden p-1.5 -ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl cursor-pointer"
              title="Back to conversation list"
            >
              <FiArrowLeft size={18} />
            </button>
          )}

          {/* Project Avatar */}
          <div className="relative shrink-0">
            {activeChat.avatar ? (
              <img src={activeChat.avatar} alt={activeChat.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
            ) : (
              <div className={`w-10 h-10 rounded-full ${projectColor} text-white font-bold text-xs flex items-center justify-center shadow-xs select-none`}>
                {projectInitials}
              </div>
            )}
          </div>

          <div className="min-w-0 text-left">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{activeChat.name}</h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              <span>{memberCount} {memberCount === 1 ? 'Member' : 'Members'}</span>
              <span>•</span>
              {isProject && (
                connectionStatus === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                ) : connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Connecting...
                  </span>
                ) : (
                  <span className="text-slate-400">Offline</span>
                )
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            title="Search in messages"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <FiSearch size={18} />
          </button>
          <button
            type="button"
            onClick={onOpenGroupDetails}
            title="Conversation details"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <FiMoreVertical size={18} />
          </button>
        </div>
      </div>
      {isSearchOpen && (
        <div className="mx-3 mt-2 px-3 py-1.5 bg-white dark:bg-[#171717] rounded-xl border border-sky-100 dark:border-white/5 shadow-xs flex items-center gap-2 text-xs shrink-0 min-w-0">
          <FiSearch className="text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search in this chat..."
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-slate-900 dark:text-white outline-none"
            autoFocus
          />
          {searchInChat && (
            <button type="button" onClick={() => setSearchInChat('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
              Clear
            </button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar p-3.5 sm:p-5 space-y-3.5">
        {isLoadingMessages ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <span className="w-5 h-5 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-2" />
            <p className="text-xs">Loading message history...</p>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {searchInChat ? 'No messages match search' : 'No messages yet'}
            </p>
            <p className="text-[11px] mt-0.5 max-w-xs">
              {searchInChat ? 'Try another search term.' : `Say hello to begin collaborating in ${activeChat.name}!`}
            </p>
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const isOutgoing = msg.isOutgoing;
            const senderName = isOutgoing ? 'You' : msg.sender || 'Member';
            const avatarColor = isOutgoing ? 'bg-[#D95295]' : getAvatarColor(senderName);

            return (
              <div key={msg.id} className={`flex flex-col min-w-0 max-w-full ${isOutgoing ? 'items-end' : 'items-start'}`}>
                {/* Sender Name & Timestamp above bubble */}
                <div className={`text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1 flex items-center gap-1.5 ${isOutgoing ? 'mr-9 justify-end' : 'ml-9 justify-start'}`}>
                  <span>{senderName}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{msg.timestamp}</span>
                </div>

                {/* Bubble & Avatar row */}
                <div className="flex items-center gap-2 min-w-0 max-w-full sm:max-w-[85%]">
                  {!isOutgoing && (
                    <ChatAvatar src={msg.senderAvatar} name={senderName} color={avatarColor} className="w-7 h-7 text-[10px] shadow-xs" />
                  )}

                  <div
                    className={`min-w-0 max-w-full rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap [overflow-wrap:anywhere] shadow-xs ${
                      isOutgoing
                        ? 'bg-[#8AD4FF] dark:bg-[#1C1C1C] text-slate-900 dark:text-white rounded-tr-xs dark:border dark:border-white/10'
                        : 'bg-white dark:bg-[#171717] text-slate-900 dark:text-white rounded-tl-xs border border-slate-100 dark:border-white/5'
                    }`}
                  >
                    <p className="min-w-0 max-w-full [overflow-wrap:anywhere]">{msg.text}</p>
                  </div>

                  {isOutgoing && (
                    <ChatAvatar src={currentUser?.profilePictureUrl} name={currentUser?.name || 'You'} color="bg-[#D95295]" className="w-7 h-7 text-[10px] shadow-xs" />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Inset Floating Bottom Composer (Frame 398) */}
      <form onSubmit={handleSend} className="bg-white dark:bg-[#171717] rounded-full mx-2.5 sm:mx-3 mb-2.5 sm:mb-3 p-2 px-3 sm:px-4 shadow-xs border border-sky-100 dark:border-white/5 flex items-center gap-2 sm:gap-3 shrink-0 z-10">
        {/* Paperclip attachment icon */}
        <button
          type="button"
          title="Attach file"
          className="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 transition cursor-pointer p-1 shrink-0"
        >
          <FiPaperclip size={18} />
        </button>

        {/* Input Pill Capsule */}
        <div className="flex-1 flex items-center bg-[#F1F3F5] dark:bg-[#252525] rounded-full px-3.5 sm:px-4 py-1.5 border border-transparent dark:border-white/5 focus-within:border-sky-400 transition">
          <input
            type="text"
            maxLength={2000}
            placeholder={isProject && connectionStatus !== 'connected' ? `Connecting (${connectionStatus})...` : 'Type here....'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-slate-500 bg-transparent outline-none w-full"
          />
          <button
            type="button"
            onClick={() => setInputText((prev) => prev + ' 😊')}
            title="Add emoji"
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition shrink-0 ml-1.5 cursor-pointer"
          >
            <FiSmile size={16} />
          </button>
        </div>

        {/* Send Action Button */}
        <button
          type="submit"
          disabled={!inputText.trim()}
          title={isProject && connectionStatus !== 'connected' ? `Connecting (${connectionStatus})...` : 'Send message'}
          className="p-2 rounded-full text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 disabled:opacity-40 transition cursor-pointer shrink-0"
        >
          <FiSend size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatArea;
