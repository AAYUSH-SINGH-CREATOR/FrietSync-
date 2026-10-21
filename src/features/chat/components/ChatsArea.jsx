import { useState, useRef, useEffect, useMemo } from 'react';
import {
  FiSend,
  FiMoreVertical,
  FiArrowLeft,
  FiPaperclip,
  FiSmile,
  FiSearch,
  FiMessageSquare,
  FiBarChart2,
  FiX,
  FiFileText,
  FiDownload,
} from 'react-icons/fi';
import {
  getInitials,
  getAvatarColor,
  getCurrentChatUser,
  formatFileSize,
  getFileExtension,
  parseAttachmentFromText,
  getMessagePollId,
  stripPollMetadata,
  compressImage,
} from '../services/chatApi';
import { ChatPollModal } from '../../polls/components';

const FAMOUS_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢', '😡', '🎉'];
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
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInChat, setSearchInChat] = useState('');
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollToOpenId, setPollToOpenId] = useState(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const currentUser = currentUserProp || getCurrentChatUser();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat?.id]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setIsEmojiPickerOpen(false);
      }
    };
    if (isEmojiPickerOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isEmojiPickerOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsEmojiPickerOpen(false);
        setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleSelectEmoji = (emoji) => {
    setInputText((prev) => (prev ? `${prev} ${emoji}` : emoji));
    setIsEmojiPickerOpen(false);
    inputRef.current?.focus();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
    if (isImage) {
      try {
        const compressed = await compressImage(file);
        setSelectedAttachment({
          name: file.name,
          size: file.size,
          type: file.type || 'image/jpeg',
          url: compressed || '',
          isImage: true,
        });
      } catch (err) {
        console.warn('Failed to compress image:', err);
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          setSelectedAttachment({
            name: file.name,
            size: file.size,
            type: file.type || 'image/jpeg',
            url: loadEvt.target.result,
            isImage: true,
          });
        };
        reader.readAsDataURL(file);
      }
    } else {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds the 2 MB limit for documents. Please choose a smaller file.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setSelectedAttachment({
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: loadEvt.target.result,
          isImage: false,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAttachment = () => {
    setSelectedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text && !selectedAttachment) return;
    if (text.length > 2000) return;

    let payloadText = text;
    if (selectedAttachment) {
      const attData = {
        name: selectedAttachment.name,
        type: selectedAttachment.type,
        size: selectedAttachment.size,
        url: selectedAttachment.url,
        isImage: selectedAttachment.isImage,
      };
      const attTag = `[ATTACHMENT:${JSON.stringify(attData)}]`;
      payloadText = text ? `${text}\n${attTag}` : attTag;
    }

    const sent = onSendMessage(payloadText);
    if (sent === false) return;
    setInputText('');
    handleRemoveAttachment();
    setSearchInChat('');
    setIsEmojiPickerOpen(false);
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
    return messages.filter((m) => {
      const { cleanText, attachment } = parseAttachmentFromText(m.text || '');
      return (
        cleanText.toLowerCase().includes(q) ||
        (attachment?.name || '').toLowerCase().includes(q) ||
        (m.sender || '').toLowerCase().includes(q)
      );
    });
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
  const memberCount = Array.isArray(activeChat.members) && activeChat.members.length > 0
    ? activeChat.members.length
    : (activeChat.memberCount ?? activeChat.raw?.memberCount ?? 0);
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
            onClick={() => { setPollToOpenId(null); setIsPollModalOpen(true); }}
            title="Project Polls & Decisions"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <FiBarChart2 size={18} />
          </button>
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
            const { cleanText, attachment: parsedAtt } = parseAttachmentFromText(msg.text || '');
            const attachment = msg.attachment || (Array.isArray(msg.attachments) ? msg.attachments[0] : null) || parsedAtt;
            const isImageAtt = attachment && (attachment.isImage || attachment.type?.startsWith('image/'));
            const displayText = stripPollMetadata(cleanText).replace('📊 Poll:', '🗳️ Poll:');
            const pollId = getMessagePollId(msg);
            const isLegacyPollMessage = msg.text?.includes('📊') && /\bpoll\b/i.test(msg.text);

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
                    {displayText && <p className="min-w-0 max-w-full [overflow-wrap:anywhere]">{displayText}</p>}

                    {/* Image Attachment */}
                    {isImageAtt && attachment.url && (
                      <div className={`mt-2 rounded-xl overflow-hidden border ${isOutgoing ? 'border-sky-300 dark:border-white/10' : 'border-slate-200 dark:border-white/10'} bg-black/5 dark:bg-white/5`}>
                        <img
                          src={attachment.url}
                          alt={attachment.name || 'Shared image'}
                          onClick={() => setPreviewImage(attachment)}
                          className="max-h-60 sm:max-h-72 w-full object-contain cursor-pointer hover:opacity-95 transition"
                        />
                        <div className="flex items-center justify-between gap-2 p-1.5 px-2.5 bg-black/50 text-white text-[11px]">
                          <span className="truncate max-w-[180px]">{attachment.name}</span>
                          <a
                            href={attachment.url}
                            download={attachment.name || 'image.jpg'}
                            className="hover:text-sky-300 transition shrink-0 p-0.5 cursor-pointer"
                            title="Download image"
                          >
                            <FiDownload size={14} />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Document Attachment */}
                    {attachment && !isImageAtt && (
                      <div className={`mt-2 flex items-center gap-2.5 p-2.5 rounded-xl border ${
                        isOutgoing
                          ? 'bg-white/60 dark:bg-white/5 border-sky-300 dark:border-white/10 text-slate-900 dark:text-white'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'
                      }`}>
                        <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                          <FiFileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold truncate">{attachment.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {formatFileSize(attachment.size)} • {getFileExtension(attachment.name)}
                          </p>
                        </div>
                        {attachment.url && (
                          <a
                            href={attachment.url}
                            download={attachment.name || 'document'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-white/80 dark:hover:bg-white/10 transition shrink-0 cursor-pointer"
                            title="Download file"
                          >
                            <FiDownload size={16} />
                          </a>
                        )}
                      </div>
                    )}

                    {(pollId || isLegacyPollMessage) && (
                      <button
                        type="button"
                        onClick={() => { setPollToOpenId(pollId); setIsPollModalOpen(true); }}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-700 transition cursor-pointer"
                      >
                       View Poll
                      </button>
                    )}
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

      {/* Selected Attachment Preview Bar */}
      {selectedAttachment && (
        <div className="mx-2.5 sm:mx-3 mb-2 p-2 px-3 bg-white dark:bg-[#171717] rounded-2xl border border-sky-200 dark:border-white/10 shadow-sm flex items-center justify-between gap-3 shrink-0 animate-fadeIn z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedAttachment.isImage && selectedAttachment.url ? (
              <img
                src={selectedAttachment.url}
                alt={selectedAttachment.name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <FiFileText size={20} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                {selectedAttachment.name}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {formatFileSize(selectedAttachment.size)} • {selectedAttachment.isImage ? 'Image' : getFileExtension(selectedAttachment.name)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveAttachment}
            title="Remove attachment"
            className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer shrink-0"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* 3. Inset Floating Bottom Composer */}
      <form onSubmit={handleSend} className="bg-white dark:bg-[#171717] rounded-full mx-2.5 sm:mx-3 mb-2.5 sm:mb-3 p-2 px-3 sm:px-4 shadow-xs border border-sky-100 dark:border-white/5 flex items-center gap-2 sm:gap-3 shrink-0 z-10 relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          onChange={handleFileSelect}
          className="hidden"
        />
        {/* Paperclip attachment icon */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach document or image"
          className="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 transition cursor-pointer p-1 shrink-0"
        >
          <FiPaperclip size={18} />
        </button>

        {/* Poll button */}
        <button
          type="button"
          onClick={() => { setPollToOpenId(null); setIsPollModalOpen(true); }}
          title="Project Polls & Decisions"
          className="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 transition cursor-pointer p-1 shrink-0"
        >
          <FiBarChart2 size={18} />
        </button>

        {/* Input Pill Capsule */}
        <div className="flex-1 flex items-center bg-[#F1F3F5] dark:bg-[#252525] rounded-full px-3.5 sm:px-4 py-1.5 border border-transparent dark:border-white/5 focus-within:border-sky-400 transition relative">
          <input
            ref={inputRef}
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
            onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
            title="Add emoji"
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition shrink-0 ml-1.5 cursor-pointer"
          >
            <FiSmile size={16} />
          </button>
        </div>

        {/* Emoji Picker Popup with exactly 8 famous emojis */}
        {isEmojiPickerOpen && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-full right-4 sm:right-16 mb-2 bg-white dark:bg-[#1e1e1e] border border-sky-200 dark:border-white/10 rounded-2xl shadow-xl p-1.5 sm:p-2 flex items-center gap-1 z-30 animate-fadeIn"
          >
            {FAMOUS_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelectEmoji(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg sm:text-xl rounded-xl hover:bg-sky-50 dark:hover:bg-white/10 active:scale-95 hover:scale-125 transition-transform cursor-pointer"
                title={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Send Action Button */}
        <button
          type="submit"
          disabled={!inputText.trim() && !selectedAttachment}
          title={isProject && connectionStatus !== 'connected' ? `Connecting (${connectionStatus})...` : 'Send message'}
          className="p-2 rounded-full text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 disabled:opacity-40 transition cursor-pointer shrink-0"
        >
          <FiSend size={18} />
        </button>
      </form>

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center bg-[#171717] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-3 px-4 bg-white/5 border-b border-white/10 text-white text-xs sm:text-sm">
              <span className="truncate max-w-xs sm:max-w-md font-medium">{previewImage.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  download={previewImage.name || 'image.jpg'}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
                  title="Download image"
                >
                  <FiDownload size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
                  title="Close preview"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>
            <div className="p-2 sm:p-4 flex items-center justify-center overflow-auto max-h-[calc(90vh-60px)]">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      <ChatPollModal
        isOpen={isPollModalOpen}
        pollId={pollToOpenId}
        onClose={() => { setIsPollModalOpen(false); setPollToOpenId(null); }}
        activeChat={activeChat}
        currentUserId={currentUser?.userId || currentUser?.id}
        onShareToChat={(poll) => {
          const pollId = poll.id || poll._id || poll.pollId;
          const shareText = `🗳️ Poll: "${poll.question}" — Vote in Project Polls!${pollId ? ` [FRIETSYNC_POLL:${pollId}]` : ''}`;
          onSendMessage(shareText);
        }}
      />
    </div>
  );
};

export default ChatArea;
