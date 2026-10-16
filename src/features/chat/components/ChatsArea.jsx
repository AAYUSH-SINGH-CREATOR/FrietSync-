import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSend,
  FiArrowLeft,
  FiFolder,
  FiPaperclip,
  FiSearch,
  FiMoreVertical,
  FiExternalLink,
} from 'react-icons/fi';
import chatBackground from '../../../assets/chatbgellipse.svg';

const SENDER_AVATAR_COLORS = [
  'bg-[#6366f1]', // indigo
  'bg-[#2563eb]', // blue
  'bg-[#0284c7]', // sky
  'bg-[#0d9488]', // teal
  'bg-[#16a34a]', // green
  'bg-[#ea580c]', // orange
  'bg-[#db2777]', // pink
  'bg-[#9333ea]', // purple
];

const getSenderAvatarColor = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SENDER_AVATAR_COLORS[Math.abs(hash) % SENDER_AVATAR_COLORS.length];
};

const getInitials = (name = '') => {
  if (!name || typeof name !== 'string') return '?';
  const clean = name.trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatMessageTimestamp = (timeStr) => {
  if (!timeStr) return '';
  if (typeof timeStr !== 'string') return String(timeStr);
  if (timeStr.includes(',')) {
    return timeStr.split(',')[1].trim();
  }
  return timeStr;
};

const ChatArea = ({
  activeChat,
  messages = [],
  onSendMessage,
  onBackToList,
  connectionStatus = 'disconnected',
  isLoadingMessages = false,
  currentUser,
}) => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const messageHistory = messagesContainerRef.current;
    messageHistory?.scrollTo({
      top: messageHistory.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, activeChat?.id]);

  const handleSend = (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || text.length > 2000) return;
    if (connectionStatus !== 'connected') return;

    onSendMessage(text);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeChat) {
    return (
      <div className="relative bg-white dark:bg-[#161822] rounded-3xl border border-slate-200/80 dark:border-[#232838] shadow-xs h-full flex flex-col items-center justify-center p-8 text-center transition-colors">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden z-0"
        >
          <div
            className="absolute -top-16 -right-16 w-[450px] sm:w-[540px] h-[360px] sm:h-[430px] opacity-20 dark:opacity-25 select-none"
            style={{
              backgroundImage: `url(${chatBackground})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top right',
              backgroundSize: 'contain',
            }}
          />
        </div>
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 dark:text-[#38bdf8] flex items-center justify-center mb-4 shadow-sm">
          <FiFolder size={28} />
        </div>
        <h3 className="relative z-10 text-lg font-bold text-slate-800 dark:text-white">Select a project channel</h3>
        <p className="relative z-10 text-xs text-slate-400 dark:text-[#94a3b8] mt-1 max-w-sm">
          Choose a project from the sidebar to chat live with project members.
        </p>
      </div>
    );
  }

  const projectInitials = getInitials(activeChat.name || 'PR');
  const userInitials = getInitials(currentUser?.name || 'You');

  return (
    <div className="relative bg-white dark:bg-[#161822] rounded-3xl border border-slate-200/80 dark:border-[#232838] shadow-xs flex flex-col h-full min-h-0 overflow-hidden transition-colors">
      {/* Background Glow from chatbgellipse.svg */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none"
      >
        <div
          className="absolute -top-16 -right-16 w-[480px] sm:w-[560px] h-[380px] sm:h-[450px] opacity-25 dark:opacity-35 select-none transition-opacity"
          style={{
            backgroundImage: `url(${chatBackground})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top right',
            backgroundSize: 'contain',
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-20 px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-[#232838] bg-white/90 dark:bg-[#161822]/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="md:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#20232c] cursor-pointer"
              title="Back to conversation list"
            >
              <FiArrowLeft size={18} />
            </button>
          )}

          {/* Project Avatar */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
              {projectInitials}
            </div>
          </div>

          {/* Project Details */}
          <div className="min-w-0 text-left">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate tracking-tight">
              {activeChat.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94a3b8] mt-0.5">
              {activeChat.members?.length > 0 && (
                <span>{activeChat.members.length} Members</span>
              )}
              {activeChat.members?.length > 0 && <span className="opacity-60">•</span>}
              {connectionStatus === 'connected' ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-[#34d399] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  online
                </span>
              ) : connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-[#fbbf24] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  connecting
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="relative flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            title="Search in conversation"
            aria-label="Search in conversation"
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:text-[#94a3b8] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#20232c] flex items-center justify-center transition cursor-pointer"
          >
            <FiSearch size={18} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              title="More options"
              aria-label="More options"
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:text-[#94a3b8] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#20232c] flex items-center justify-center transition cursor-pointer"
            >
              <FiMoreVertical size={18} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#1f2128] border border-slate-200 dark:border-[#2d303b] shadow-xl py-1.5 z-30 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    navigate(`/dashboard/projects/${activeChat.id}`);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#282b36] transition cursor-pointer"
                >
                  <FiExternalLink size={14} className="text-sky-500 dark:text-[#38bdf8]" />
                  Project Details
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={messagesContainerRef} className="relative z-10 flex-1 min-h-0 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 space-y-5">
        {isLoadingMessages ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-[#94a3b8]">
            <span className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-2" />
            <p className="text-xs">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#20232c] text-sky-500 dark:text-[#38bdf8] mx-auto flex items-center justify-center mb-3">
              <FiFolder size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              No messages yet
            </p>
            <p className="text-xs text-slate-400 dark:text-[#94a3b8] mt-1 max-w-xs">
              Say hello to start the discussion with members of {activeChat.name}!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutgoing = !!msg.isOutgoing;
            const senderInitial = isOutgoing
              ? userInitials
              : getInitials(msg.sender || 'Member');
            const avatarColorClass = isOutgoing
              ? 'bg-[#c026d3]'
              : getSenderAvatarColor(msg.sender || 'Member');

            if (isOutgoing) {
              return (
                <div key={msg.id} className="flex min-w-0 items-start justify-end gap-2.5 sm:gap-3 ml-auto max-w-[90%] sm:max-w-[75%]">
                  <div className="flex flex-col items-end min-w-0">
                    <div className="flex items-center gap-2 mb-1 mr-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        You
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-[#858585]">
                        {formatMessageTimestamp(msg.timestamp)}
                      </span>
                    </div>
                    <div className="min-w-0 max-w-full bg-slate-100 dark:bg-[#232733] border border-slate-200/80 dark:border-[#2e3444]/60 text-slate-900 dark:text-[#F1F5F9] rounded-2xl rounded-tr-xs px-4 py-2.5 text-sm leading-relaxed shadow-2xs break-words [overflow-wrap:anywhere]">
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>

                  {/* Outgoing Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${avatarColorClass}`}
                  >
                    {senderInitial}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex min-w-0 items-start gap-2.5 sm:gap-3 max-w-[90%] sm:max-w-[75%]">
                {/* Incoming Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${avatarColorClass}`}
                >
                  {senderInitial}
                </div>

                <div className="flex min-w-0 max-w-full flex-col items-start">
                  <div className="flex items-center gap-2 mb-1 ml-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {msg.sender}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-[#858585]">
                      {formatMessageTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <div className="min-w-0 max-w-full bg-slate-100 dark:bg-[#232733] border border-slate-200/80 dark:border-[#2e3444]/60 text-slate-900 dark:text-[#F1F5F9] rounded-2xl rounded-tl-xs px-4 py-2.5 text-sm leading-relaxed shadow-2xs break-words [overflow-wrap:anywhere]">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="relative z-20 shrink-0 p-3.5 sm:p-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] border-t border-slate-200/80 dark:border-[#232838] bg-white/95 dark:bg-[#161822]/95 backdrop-blur-md">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2.5 bg-slate-100 dark:bg-[#1c1f2b] border border-slate-200 dark:border-[#2d3448] rounded-full px-4 py-2 sm:py-2.5 focus-within:border-sky-500 dark:focus-within:border-[#38bdf8]/60 focus-within:ring-2 focus-within:ring-sky-500/10 dark:focus-within:ring-[#38bdf8]/20 transition-all shadow-inner"
        >
          <button
            type="button"
            title="Attach file (not configured)"
            aria-label="Attach file"
            className="text-slate-400 dark:text-[#858585] hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer shrink-0"
          >
            <FiPaperclip size={18} />
          </button>

          <input
            type="text"
            maxLength={2000}
            placeholder={
              connectionStatus !== 'connected'
                ? `Connecting to project chat (${connectionStatus})...`
                : 'Type here....'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent px-1 py-1 text-xs sm:text-sm text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#6b7280] outline-none"
          />

          <span className="text-[10px] text-slate-400 dark:text-[#858585] shrink-0 tabular-nums whitespace-nowrap">
            {inputText.length} / 2000
          </span>

          <button
            type="submit"
            disabled={!inputText.trim() || connectionStatus !== 'connected'}
            title={
              connectionStatus !== 'connected'
                ? `Connecting (${connectionStatus})...`
                : 'Send message'
            }
            aria-label="Send message"
            className="p-1.5 text-sky-500 dark:text-[#38bdf8] hover:text-sky-600 dark:hover:text-[#7dd3fc] active:scale-95 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <FiSend size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;

