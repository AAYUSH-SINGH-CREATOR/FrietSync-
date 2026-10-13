import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSend,
  FiArrowLeft,
  FiFolder,
  FiExternalLink,
} from 'react-icons/fi';

const ChatArea = ({
  activeChat,
  messages = [],
  onSendMessage,
  onBackToList,
  connectionStatus = 'disconnected',
  isLoadingMessages = false,
}) => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      <div className="bg-white dark:bg-[#172033] rounded-3xl border border-slate-200/80 dark:border-[#293548] h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-500 dark:text-[#60A5FA] flex items-center justify-center mb-4">
          <FiFolder size={28} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-[#F1F5F9]">Select a project channel</h3>
        <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1 max-w-sm">
          Choose a project from the sidebar to chat live with project members.
        </p>
      </div>
    );
  }

  const initials = (activeChat.name || 'PR')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white dark:bg-[#172033] rounded-3xl border border-slate-200/80 dark:border-[#293548] shadow-xs flex flex-col h-full overflow-hidden transition-colors">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-[#293548] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="lg:hidden p-1.5 -ml-1 text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F1F5F9] rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E293B] cursor-pointer"
              title="Back to channel list"
            >
              <FiArrowLeft size={18} />
            </button>
          )}

          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
              {initials}
            </div>
            <span
              title={connectionStatus === 'connected' ? 'Connected' : 'Offline'}
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#172033] ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500'
                  : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
          </div>

          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9] truncate">
                {activeChat.name}
              </h2>
              {/* <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-[#C084FC] border border-purple-100 dark:border-purple-800/40">
                Project
              </span> */}

              {connectionStatus === 'connected' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-[#34D399] border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              ) : connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-[#FBBF24] border border-amber-200 dark:border-amber-800/60 text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  Connecting...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E293B] text-slate-500 dark:text-[#94A3B8] text-[10px]">
                  Offline
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 dark:text-[#94A3B8] truncate mt-0.5">
              {activeChat.description || 'Project team channel'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/projects/${activeChat.id}`)}
            title="Open project details"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-[#253247] text-slate-700 dark:text-[#CBD5E1] text-xs font-semibold border border-transparent dark:border-[#334155] transition cursor-pointer"
          >
            <FiExternalLink size={13} />
            <span className="hidden sm:inline">Project Details</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 space-y-4">
        {isLoadingMessages ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-[#94A3B8]">
            <span className="w-6 h-6 border-2 border-sky-600/30 dark:border-blue-500/30 border-t-sky-600 dark:border-t-blue-500 rounded-full animate-spin mb-2" />
            <p className="text-xs">Loading project messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-500 dark:text-[#60A5FA] mx-auto flex items-center justify-center mb-3">
              <FiFolder size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-[#F1F5F9]">
              No messages yet
            </p>
            <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1 max-w-xs">
              Say hello to start the discussion with members of {activeChat.name}!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutgoing = !!msg.isOutgoing;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
              >
                {!isOutgoing && msg.sender && (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] mb-1 ml-2">
                    {msg.sender}
                  </span>
                )}

                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-2xs max-w-[85%] sm:max-w-[70%] ${
                    isOutgoing
                      ? 'bg-sky-600 dark:bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-slate-100 dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                <span
                  className={`text-[11px] text-slate-400 dark:text-[#94A3B8] mt-1 ${
                    isOutgoing ? 'mr-1 text-right' : 'ml-1 text-left'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-[#293548] bg-white dark:bg-[#172033]">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl p-1.5 sm:p-2 pl-3.5 sm:pl-4 focus-within:border-sky-500 dark:focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-950/40 transition"
        >
          <input
            type="text"
            maxLength={2000}
            placeholder={
              connectionStatus !== 'connected'
                ? `Connecting to project chat (${connectionStatus})...`
                : `Message #${activeChat.name}...`
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-slate-800 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#64748B] outline-none"
          />

          {inputText.length > 1800 && (
            <span className="text-[10px] text-slate-400 shrink-0">
              {inputText.length}/2000
            </span>
          )}

          <button
            type="submit"
            disabled={!inputText.trim() || connectionStatus !== 'connected'}
            title={
              connectionStatus !== 'connected'
                ? `Connecting to project chat (${connectionStatus})...`
                : 'Send message'
            }
            className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-sm shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <FiSend size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
