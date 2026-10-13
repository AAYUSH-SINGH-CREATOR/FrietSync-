import { useState, useRef, useEffect } from 'react';
import {
  FiSend,
  FiMoreVertical,
  FiArrowLeft,
  FiUsers,
  FiUserPlus,
} from 'react-icons/fi';

const ChatView= ({
  activeChat,
  messages = [],
  onSendMessage,
  onBackToList,
  onOpenGroupDetails,
  onOpenAddMember,
  connectionStatus = 'disconnected',
  isLoadingMessages = false,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat?.id]);

  const handleSend = (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || text.length > 2000) return;
    if (activeChat?.isProject && connectionStatus !== 'connected') return;

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
          <FiUsers size={28} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-[#F1F5F9]">Select a conversation</h3>
        <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1 max-w-sm">
          Choose a project or chat channel from the sidebar to view live messages.
        </p>
      </div>
    );
  }

  const isGroup = !!activeChat.isGroup;
  const isProject = !!activeChat.isProject;
  const isOnline = activeChat.status === 'Online';

  return (
    <div className="bg-white dark:bg-[#172033] rounded-3xl border border-slate-200/80 dark:border-[#293548] shadow-xs flex flex-col h-full overflow-hidden transition-colors">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-[#293548] flex items-center justify-between shrink-0">

        <div className="flex items-center gap-1 shrink-0 text-slate-500 dark:text-[#94A3B8]">
          {isGroup && (
            <button
              type="button"
              onClick={onOpenAddMember}
              title="Add member to group"
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E293B] hover:text-sky-600 dark:hover:text-[#60A5FA] transition cursor-pointer"
            >
              <FiUserPlus size={18} />
            </button>
          )}

          {isGroup && (
            <button
              type="button"
              onClick={onOpenGroupDetails}
              title="View group members and info"
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E293B] hover:text-sky-600 dark:hover:text-[#60A5FA] transition cursor-pointer"
            >
              <FiUsers size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={isGroup ? onOpenGroupDetails : undefined}
            title="More options"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E293B] hover:text-slate-800 dark:hover:text-[#F1F5F9] transition cursor-pointer"
          >
            <FiMoreVertical size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 space-y-4">
        {isLoadingMessages ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-[#94A3B8]">
            <span className="w-6 h-6 border-2 border-sky-600/30 dark:border-blue-500/30 border-t-sky-600 dark:border-t-blue-500 rounded-full animate-spin mb-2" />
            <p className="text-xs">Loading recent messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-[#F1F5F9]">
              No messages yet
            </p>
            <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1 max-w-xs">
              Say hello to start the live conversation in {activeChat.name}!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutgoing = msg.isOutgoing;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
              >
                {isGroup && !isOutgoing && msg.sender && (
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

      <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-[#293548] bg-white dark:bg-[#172033]">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl p-1.5 sm:p-2 pl-3.5 sm:pl-4 focus-within:border-sky-500 dark:focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-950/40 transition"
        >
          <input
            type="text"
            maxLength={2000}
            placeholder={
              isProject && connectionStatus !== 'connected'
                ? `Connecting to live chat (${connectionStatus})...`
                : 'Type your message here...'
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
            disabled={!inputText.trim() || (isProject && connectionStatus !== 'connected')}
            title={
              isProject && connectionStatus !== 'connected'
                ? `Connecting to live chat (${connectionStatus})...`
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

export default ChatView;
