import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
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
  FiImage,
  FiDownload,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiPhone,
  FiBell,
  FiBellOff,
  FiMic,
  FiSquare,
} from 'react-icons/fi';
import { BsPin } from 'react-icons/bs';
import {
  getInitials,
  getAvatarColor,
  getCurrentChatUser,
  formatFileSize,
  getFileExtension,
  getChatAttachments,
  parseAttachmentFromText,
  getMessagePollId,
  stripPollMetadata,
  uploadChatAttachment,
  downloadChatAttachment,
  deleteMessage,
  editMessage,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  getProjectChatMuteStatus,
  muteProjectChat,
  unmuteProjectChat,
} from '../services/chatApi';
import { ChatPollModal } from '../../polls/components';

const FAMOUS_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢', '😡', '🎉'];
const getProfileImageUrl = (person) => person?.profilePictureUrl || person?.user?.profilePictureUrl || person?.profileUrl || person?.user?.profileUrl || person?.avatarUrl || person?.user?.avatarUrl || person?.profileImageUrl || person?.imageUrl || person?.pictureUrl || person?.photoUrl || '';
const getMemberName = (member) => typeof member === 'string'
  ? member
  : member?.name || member?.user?.name || member?.fullName || member?.email || member?.user?.email || 'Project member';

const ChatAvatar = ({ src, name, className, color }) => {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name);
  return src && !failed
    ? <img src={src} alt={name || 'User avatar'} onError={() => setFailed(true)} className={`${className} object-cover rounded-full`} />
    : <div className={`${className} ${color || getAvatarColor(name)} rounded-full text-white font-semibold flex items-center justify-center shrink-0 select-none`}>{initials}</div>;
};

const VoiceNotePlayer = ({ projectId, attachment }) => {
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    downloadChatAttachment(projectId, attachment)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
      })
      .catch((downloadError) => {
        if (active) setError(downloadError.message || 'Voice note could not be loaded.');
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [projectId, attachment.id, attachment.attachmentId, attachment.downloadUrl]);

  return (
    <div className="mt-2 flex min-w-0 items-start gap-2.5 rounded-xl border border-sky-200 bg-white/70 p-2.5 dark:border-white/10 dark:bg-white/5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400"><FiMic size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{attachment.fileName || attachment.name || 'Voice note'}</p>
        {audioUrl ? <audio controls preload="none" src={audioUrl} className="mt-1 h-9 w-full max-w-[260px]" aria-label="Play voice note" /> : <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{error || 'Loading voice note…'}</p>}
      </div>
    </div>
  );
};

const ChatArea = ({
  activeChat,
  messages = [],
  onSendMessage,
  onBackToList,
  onOpenGroupDetails,
  connectionStatus = 'disconnected',
  isLoadingMessages = false,
  hasOlderMessages = false,
  isLoadingOlder = false,
  onLoadOlder,
  currentUser: currentUserProp,
  onMessageUpdate,
  onMessageDelete,
  onPinMessage,
  onUnpinMessage,
  onPinnedMessagesChange,
  showToast,
  voiceCall,
  readOnly = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [chatAttachmentMetadata, setChatAttachmentMetadata] = useState({});
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordingSeconds, setVoiceRecordingSeconds] = useState(0);
  const [attachmentError, setAttachmentError] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInChat, setSearchInChat] = useState('');
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isProjectDetailsOpen, setIsProjectDetailsOpen] = useState(false);
  const [chatMuteStatus, setChatMuteStatus] = useState({ muted: false, mutedUntil: null });
  const [isUpdatingMute, setIsUpdatingMute] = useState(false);
  const [projectDetailsError, setProjectDetailsError] = useState('');
  const [detailsSearch, setDetailsSearch] = useState('');
  const [pollToOpenId, setPollToOpenId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [messageMenuOpen, setMessageMenuOpen] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [isLoadingPinned, setIsLoadingPinned] = useState(false);
  const [isPinnedPanelOpen, setIsPinnedPanelOpen] = useState(false);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pendingScrollRef = useRef(null);
  const currentChatIdRef = useRef(activeChat?.id);
  const attachmentProjectIdRef = useRef(activeChat?.id);
  const uploadIdRef = useRef(0);
  const voiceRecorderRef = useRef(null);
  const voiceStreamRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceTimerRef = useRef(null);
  const voiceRecordingProjectRef = useRef(null);
  const pendingAudioUrlsRef = useRef(new Set());
  const previewObjectUrlRef = useRef(null);
  const messageMenuRef = useRef(null);

  const currentUser = currentUserProp || getCurrentChatUser();

  const visibleMembers = useMemo(() => {
    const normalizedQuery = detailsSearch.trim().toLowerCase();
    if (!normalizedQuery) return activeChat?.members || [];
    return (activeChat?.members || []).filter((member) => getMemberName(member).toLowerCase().includes(normalizedQuery));
  }, [activeChat?.members, detailsSearch]);

  useEffect(() => {
    if (!isProjectDetailsOpen || !activeChat?.id) return undefined;
    let cancelled = false;
    setProjectDetailsError('');
    setDetailsSearch('');
    getProjectChatMuteStatus(activeChat.id)
      .then((status) => { if (!cancelled) setChatMuteStatus(status || { muted: false, mutedUntil: null }); })
      .catch((error) => { if (!cancelled) setProjectDetailsError(error.message || 'Could not load notification settings.'); });
    return () => { cancelled = true; };
  }, [isProjectDetailsOpen, activeChat?.id]);

  const handleToggleChatMute = async () => {
    if (readOnly || !activeChat?.id || isUpdatingMute) return;
    setIsUpdatingMute(true);
    setProjectDetailsError('');
    try {
      if (chatMuteStatus.muted) {
        await unmuteProjectChat(activeChat.id);
        setChatMuteStatus({ muted: false, mutedUntil: null });
      } else {
        const mutedUntil = new Date();
        mutedUntil.setMonth(mutedUntil.getMonth() + 1);
        const result = await muteProjectChat(activeChat.id, mutedUntil.toISOString());
        setChatMuteStatus({ muted: true, mutedUntil: result?.mutedUntil || mutedUntil.toISOString() });
      }
    } catch (error) {
      setProjectDetailsError(error.message || 'Could not update chat notifications.');
    } finally {
      setIsUpdatingMute(false);
    }
  };

  const closeImagePreview = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewImage(null);
  }, []);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (attachmentProjectIdRef.current === activeChat?.id) return;
    attachmentProjectIdRef.current = activeChat?.id;
    pendingAudioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    pendingAudioUrlsRef.current.clear();
    setSelectedAttachments([]);
    setAttachmentError('');
    setInputText('');
    closeImagePreview();
  }, [activeChat?.id, closeImagePreview]);

  useEffect(() => {
    if (!activeChat?.id) {
      setChatAttachmentMetadata({});
      return undefined;
    }
    let active = true;
    setChatAttachmentMetadata({});
    getChatAttachments(activeChat.id, { page: 0, size: 100 })
      .then((result) => {
        if (!active) return;
        setChatAttachmentMetadata(Object.fromEntries((result.items || []).map((item) => [String(item.id), item])));
      })
      .catch(() => {
        if (active) setChatAttachmentMetadata({});
      });
    return () => { active = false; };
  }, [activeChat?.id]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (currentChatIdRef.current !== activeChat?.id) {
      currentChatIdRef.current = activeChat?.id;
      pendingScrollRef.current = null;
      container.scrollTop = container.scrollHeight;
      return;
    }

    if (pendingScrollRef.current) {
      container.scrollTop = pendingScrollRef.current.scrollTop + container.scrollHeight - pendingScrollRef.current.scrollHeight;
      pendingScrollRef.current = null;
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, activeChat?.id]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (container.scrollTop <= 60 && hasOlderMessages && !isLoadingOlder) {
      pendingScrollRef.current = {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
      };
      Promise.resolve(onLoadOlder?.()).then((loaded) => {
        if (!loaded) {
          pendingScrollRef.current = null;
        }
      });
    }
  }, [hasOlderMessages, isLoadingOlder, onLoadOlder]);

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
        closeImagePreview();
        setEditingMessageId(null);
        setEditingText('');
        setMessageMenuOpen(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeImagePreview]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (messageMenuRef.current && !messageMenuRef.current.contains(e.target)) {
        setMessageMenuOpen(null);
      }
    };
    if (messageMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [messageMenuOpen]);

  const handleSelectEmoji = (emoji) => {
    setInputText((prev) => (prev ? `${prev} ${emoji}` : emoji));
    setIsEmojiPickerOpen(false);
    inputRef.current?.focus();
  };

  const uploadSelectedFiles = async (files, projectId = activeChat?.id) => {
    if (readOnly || !projectId || files.length === 0) return;

    const slots = Math.max(0, 10 - selectedAttachments.length);
    if (slots === 0) {
      setAttachmentError('A message can include at most 10 attachments.');
      return;
    }

    const acceptedFiles = files.slice(0, slots).filter((file) => {
      if (file.size > 25 * 1024 * 1024) {
        setAttachmentError(`${file.name} exceeds the 25 MB attachment limit.`);
        return false;
      }
      return true;
    });
    if (files.length > slots) {
      setAttachmentError('A message can include at most 10 attachments.');
    } else if (acceptedFiles.length > 0) {
      setAttachmentError('');
    }
    if (acceptedFiles.length === 0) return;

    setIsUploadingAttachments(true);
    for (const file of acceptedFiles) {
      const localId = `chat-upload-${++uploadIdRef.current}`;
      const previewUrl = file.type?.startsWith('audio/') ? URL.createObjectURL(file) : '';
      if (previewUrl) pendingAudioUrlsRef.current.add(previewUrl);
      setSelectedAttachments((current) => [...current, {
        localId,
        name: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        previewUrl,
        status: 'uploading',
      }]);

      try {
        const uploaded = await uploadChatAttachment(projectId, file);
        const attachmentId = uploaded?.id || uploaded?.attachmentId;
        if (!attachmentId) throw new Error('Upload response did not include an attachment ID.');
        if (attachmentProjectIdRef.current !== projectId) continue;

        setSelectedAttachments((current) => current.map((item) => item.localId === localId ? {
          ...item,
          id: attachmentId,
          name: uploaded.fileName || uploaded.name || file.name,
          size: uploaded.sizeBytes ?? uploaded.size ?? file.size,
          contentType: uploaded.contentType || file.type || 'application/octet-stream',
          downloadUrl: uploaded.downloadUrl,
          status: 'uploaded',
        } : item));
      } catch (error) {
        if (attachmentProjectIdRef.current !== projectId) continue;
        setSelectedAttachments((current) => current.map((item) => item.localId === localId ? {
          ...item,
          status: 'failed',
          error: error.message || 'Attachment upload failed.',
        } : item));
        setAttachmentError(error.message || 'Attachment upload failed. Remove the failed file before sending.');
      }
    }
    setIsUploadingAttachments(false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    uploadSelectedFiles(files);
  };

  const stopVoiceRecording = () => {
    if (voiceTimerRef.current) {
      window.clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (voiceRecorderRef.current?.state === 'recording') voiceRecorderRef.current.stop();
  };

  const startVoiceRecording = async () => {
    if (readOnly || !activeChat?.id || isUploadingAttachments || selectedAttachments.length >= 10) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setAttachmentError('Voice recording is not supported by this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];
      const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const projectId = activeChat.id;
      voiceRecordingProjectRef.current = projectId;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) voiceChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setAttachmentError('There was a problem recording your voice note.');
        setIsRecordingVoice(false);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.onstop = () => {
        setIsRecordingVoice(false);
        setVoiceRecordingSeconds(0);
        stream.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;
        voiceRecorderRef.current = null;
        if (attachmentProjectIdRef.current !== projectId) {
          voiceRecordingProjectRef.current = null;
          voiceChunksRef.current = [];
          return;
        }
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        voiceChunksRef.current = [];
        if (!blob.size) {
          setAttachmentError('The voice note was empty. Try recording again.');
          return;
        }
        const extension = blob.type.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `voice-note-${Date.now()}.${extension}`, { type: blob.type || 'audio/webm' });
        voiceRecordingProjectRef.current = null;
        uploadSelectedFiles([file], projectId);
      };
      recorder.start();
      voiceRecorderRef.current = recorder;
      setAttachmentError('');
      setIsRecordingVoice(true);
      setVoiceRecordingSeconds(0);
      voiceTimerRef.current = window.setInterval(() => setVoiceRecordingSeconds((seconds) => seconds + 1), 1000);
    } catch (error) {
      setAttachmentError(error.name === 'NotAllowedError' ? 'Allow microphone access to record a voice note.' : error.message || 'Could not start voice recording.');
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
      voiceStreamRef.current = null;
    }
  };

  useEffect(() => () => {
    attachmentProjectIdRef.current = null;
    if (voiceTimerRef.current) window.clearInterval(voiceTimerRef.current);
    voiceRecorderRef.current?.stop();
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    pendingAudioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    pendingAudioUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!voiceRecordingProjectRef.current || voiceRecordingProjectRef.current === activeChat?.id) return;
    if (voiceTimerRef.current) window.clearInterval(voiceTimerRef.current);
    voiceTimerRef.current = null;
    voiceRecorderRef.current?.stop();
    setIsRecordingVoice(false);
    setVoiceRecordingSeconds(0);
  }, [activeChat?.id]);

  const handleRemoveAttachment = (localId) => {
    const selected = selectedAttachments.find((attachment) => attachment.localId === localId);
    if (selected?.previewUrl) {
      URL.revokeObjectURL(selected.previewUrl);
      pendingAudioUrlsRef.current.delete(selected.previewUrl);
    }
    setSelectedAttachments((current) => current.filter((item) => item.localId !== localId));
    setAttachmentError('');
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (readOnly || isRecordingVoice) return;
    const text = inputText.trim();
    if (isUploadingAttachments) {
      setAttachmentError('Wait for the selected files to finish uploading.');
      return;
    }
    if (selectedAttachments.some((attachment) => attachment.status !== 'uploaded')) {
      setAttachmentError('Remove failed attachments before sending.');
      return;
    }
    if (!text && selectedAttachments.length === 0) return;
    if (text.length > 2000) return;

    const attachmentIds = selectedAttachments.map((attachment) => attachment.id);
    const sent = onSendMessage(text, attachmentIds);
    if (sent === false) return;
    selectedAttachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
        pendingAudioUrlsRef.current.delete(attachment.previewUrl);
      }
    });
    setInputText('');
    setSelectedAttachments([]);
    setAttachmentError('');
    setSearchInChat('');
    setIsEmojiPickerOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const blob = await downloadChatAttachment(activeChat?.id, attachment);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName || attachment.name || 'chat-attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setAttachmentError(error.message || 'Attachment download failed.');
    }
  };

  const handlePreviewAttachment = async (attachment) => {
    try {
      if (attachment.url && !attachment.downloadUrl) {
        setPreviewImage(attachment);
        return;
      }
      const blob = await downloadChatAttachment(activeChat?.id, attachment);
      closeImagePreview();
      const previewBlob = new Blob([blob], {
        type: attachment.type || blob.type || 'application/octet-stream',
      });
      const url = URL.createObjectURL(previewBlob);
      previewObjectUrlRef.current = url;
      setPreviewImage({ ...attachment, name: attachment.fileName || attachment.name, url });
    } catch (error) {
      setAttachmentError(error.message || 'Image preview failed to load.');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (readOnly || !activeChat?.id || !messageId || isDeleting) return;
    setIsDeleting(true);
    setMessageMenuOpen(null);
    try {
      const updatedMessage = await deleteMessage(activeChat.id, messageId);
      if (onMessageDelete) {
        onMessageDelete(messageId, updatedMessage);
      }
    } catch (error) {
      setAttachmentError(error.message || 'Failed to delete message.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEdit = (message) => {
    setEditingMessageId(message.id);
    setEditingText(message.text || '');
    setMessageMenuOpen(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleSaveEdit = async (messageId) => {
    if (readOnly || !activeChat?.id || !messageId || isEditing) return;
    const trimmedText = editingText.trim();
    if (!trimmedText) {
      setAttachmentError('Message cannot be empty.');
      return;
    }
    setIsEditing(true);
    try {
      const updatedMessage = await editMessage(activeChat.id, messageId, trimmedText);
      if (onMessageUpdate) {
        onMessageUpdate(messageId, updatedMessage);
      }
      setEditingMessageId(null);
      setEditingText('');
    } catch (error) {
      setAttachmentError(error.message || 'Failed to edit message.');
    } finally {
      setIsEditing(false);
    }
  };

  const loadPinnedMessages = useCallback(async (projectId) => {
    if (!projectId) return;
    setIsLoadingPinned(true);
    try {
      const pinned = await getPinnedMessages(projectId);
      setPinnedMessages(Array.isArray(pinned) ? pinned : []);
    } catch (error) {
      console.warn('Failed to load pinned messages:', error);
      setPinnedMessages([]);
    } finally {
      setIsLoadingPinned(false);
    }
  }, []);

  useEffect(() => {
    if (!activeChat?.id) {
      setPinnedMessages([]);
      return;
    }
    let isMounted = true;
    loadPinnedMessages(activeChat.id);
    return () => {
      isMounted = false;
    };
  }, [activeChat?.id, loadPinnedMessages]);

  const handlePinMessage = async (messageId) => {
    if (readOnly || !activeChat?.id || !messageId) return;
    setMessageMenuOpen(null);
    try {
      const updated = await pinMessage(activeChat.id, messageId);
      if (updated) {
        setPinnedMessages((prev) => {
          const existing = prev.find((m) => String(m.id) === String(messageId));
          if (existing) {
            return prev.map((m) => String(m.id) === String(messageId) ? { ...m, ...updated } : m);
          }
          return [...prev, updated];
        });
        if (onPinMessage) onPinMessage(messageId, updated);
        if (showToast) showToast('success', 'Message pinned.');
      }
    } catch (error) {
      setAttachmentError(error.message || 'Failed to pin message.');
    }
  };

  const handleUnpinMessage = async (messageId) => {
    if (readOnly || !activeChat?.id || !messageId) return;
    setMessageMenuOpen(null);
    try {
      const updated = await unpinMessage(activeChat.id, messageId);
      setPinnedMessages((prev) => prev.filter((m) => String(m.id) !== String(messageId)));
      if (onUnpinMessage) onUnpinMessage(messageId, updated);
      if (showToast) showToast('success', 'Message unpinned.');
    } catch (error) {
      setAttachmentError(error.message || 'Failed to unpin message.');
    }
  };

  const isMessagePinned = (messageId) => pinnedMessages.some((m) => String(m.id) === String(messageId));

  const displayedMessages = useMemo(() => {
    if (!searchInChat.trim()) return messages;
    const q = searchInChat.trim().toLowerCase();
    return messages.filter((m) => {
      const { cleanText, attachment: legacyAttachment } = parseAttachmentFromText(m.text || '');
      const attachments = Array.isArray(m.attachments) && m.attachments.length
        ? m.attachments
        : (legacyAttachment ? [legacyAttachment] : []);
      return (
        cleanText.toLowerCase().includes(q) ||
        attachments.some((attachment) => (attachment.name || attachment.fileName || '').toLowerCase().includes(q)) ||
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

  // Every conversation in ChatView is backed by a project room; project list
  // responses do not consistently include an `isProject` flag.
  const isProject = Boolean(activeChat?.id);
  const memberCount = Array.isArray(activeChat.members) && activeChat.members.length > 0
    ? activeChat.members.length
    : (activeChat.memberCount ?? activeChat.raw?.memberCount ?? 0);
  const projectColor = getAvatarColor(activeChat.name);
  const projectInfo = activeChat.raw || activeChat;
  const projectDescription = projectInfo.description || projectInfo.projectDescription || '';
  const findMemberAvatar = (message) => {
    const senderId = String(message.senderId || message.userId || '');
    const senderEmail = String(message.senderEmail || message.email || '').toLowerCase();
    const senderName = String(message.senderName || message.sender || '').toLowerCase();
    const member = (activeChat.members || []).find((candidate) => {
      if (!candidate || typeof candidate === 'string') return false;
      const id = String(candidate.userId || candidate.memberId || candidate.id || candidate._id || candidate.user?.id || candidate.user?._id || '');
      const email = String(candidate.email || candidate.user?.email || '').toLowerCase();
      const name = String(candidate.name || candidate.user?.name || '').toLowerCase();
      return (senderId && id === senderId) || (senderEmail && email === senderEmail) || (senderName && name === senderName);
    });
    return getProfileImageUrl(member);
  };

  return (
    <div className="w-full flex-1 min-w-0 bg-gradient-to-br from-[#D9EAFD] via-[#EAF2FF] to-[#D5E7FC] dark:from-[#060D1A] dark:via-[#091527] dark:to-[#040A14] border-2 sm:border-4 border-[#CCE5FE] dark:border-[#1B3654] rounded-3xl shadow-sm flex flex-col h-full min-h-0 overflow-hidden relative transition-colors">
      {}
      <div className="bg-white dark:bg-[#171717] rounded-2xl mx-2.5 sm:mx-3 mt-2.5 sm:mt-3 px-3.5 sm:px-5 py-2.5 sm:py-3 shadow-xs border border-sky-100 dark:border-white/5 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {}
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

          {}
          <div className="relative shrink-0">
            <ChatAvatar src={activeChat.avatar || projectInfo.profilePictureUrl || projectInfo.projectImageUrl || projectInfo.imageUrl || projectInfo.logoUrl || projectInfo.project?.profilePictureUrl} name={activeChat.name} color={projectColor} className="w-10 h-10 border border-slate-200 dark:border-slate-700 text-xs shadow-xs" />
          </div>

          <div className="min-w-0 text-left">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{activeChat.name}</h2>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{memberCount} {memberCount === 1 ? 'Member' : 'Members'}</span>
              <span>•</span>
              {isProject && (
                connectionStatus === 'connected' ? (
                  <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                ) : connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
                  <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Connecting...
                  </span>
                ) : (
                  <span role="status" aria-live="polite" className="text-slate-400 dark:text-slate-500">Disconnected</span>
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPinnedPanelOpen((prev) => !prev)}
              title="Pinned messages"
              aria-label={`Pinned messages${pinnedMessages.length ? `, ${pinnedMessages.length} pinned` : ''}`}
              aria-expanded={isPinnedPanelOpen}
              className={`p-2 rounded-md transition-colors cursor-pointer ${isPinnedPanelOpen || pinnedMessages.length > 0 ? 'text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/20' : 'hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <BsPin size={18} />
            </button>
            {pinnedMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-amber-700 dark:bg-amber-600 text-white text-[9px] font-semibold rounded-md flex items-center justify-center tabular-nums">
                {pinnedMessages.length > 9 ? '9+' : pinnedMessages.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            title="Search in messages"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <FiSearch size={18} />
          </button>
          {voiceCall && (
            <div className="relative">
              <button
                type="button"
                onClick={voiceCall.onTogglePanel}
                title={voiceCall.isJoined ? 'Voice call controls' : voiceCall.isCallActive ? 'Join voice call' : 'Start voice call'}
                aria-label={voiceCall.isJoined ? 'Voice call controls' : voiceCall.isCallActive ? 'Join voice call' : 'Start voice call'}
                className={`p-2 rounded-xl transition cursor-pointer ${voiceCall.isCallActive || voiceCall.isJoined ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' : 'hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <FiPhone size={18} />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => { onOpenGroupDetails?.(); setIsProjectDetailsOpen(true); }}
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

      {isPinnedPanelOpen && (
        <section aria-label="Pinned messages" className="mx-3 mt-2 shrink-0 border-y border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#191919] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
              <BsPin size={13} className="text-amber-700 dark:text-amber-400" />
              <span>Pinned messages</span>
              {pinnedMessages.length > 0 && <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">{pinnedMessages.length}</span>}
            </div>
            <button
              type="button"
              onClick={() => setIsPinnedPanelOpen(false)}
              aria-label="Close pinned messages"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-sm hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <FiX size={14} />
            </button>
          </div>
          {isLoadingPinned ? (
            <div className="flex items-center justify-center py-4">
              <span className="w-4 h-4 border-2 border-slate-300 dark:border-slate-700 border-t-amber-700 dark:border-t-amber-400 rounded-full animate-spin" />
            </div>
          ) : pinnedMessages.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-3 px-3">Pinned messages will appear here for quick reference.</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto divide-y divide-slate-200 dark:divide-white/10">
              {pinnedMessages.map((pm) => (
                <li key={pm.id} className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors group">
                  <BsPin size={12} className="shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-0.5">{pm.senderName || 'Member'}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 [overflow-wrap:anywhere]">
                      {pm.content || pm.text || ''}
                    </p>
                    {pm.pinnedAt && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Pinned {new Date(pm.pinnedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {!readOnly && <button
                    type="button"
                    onClick={() => handleUnpinMessage(pm.id)}
                    title="Unpin message"
                    aria-label="Unpin message"
                    className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-1 rounded-sm hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <FiX size={12} />
                  </button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar p-3.5 sm:p-5 space-y-3.5"
      >
        {isLoadingOlder && (
          <div className="flex justify-center py-2 shrink-0">
            <span className="w-4 h-4 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          </div>
        )}
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
            const isDeleted = msg.deleted || msg.status === 'DELETED';
            const senderName = isOutgoing ? 'You' : msg.sender || 'Member';
            const avatarColor = isOutgoing ? 'bg-[#D95295]' : getAvatarColor(senderName);
            const { cleanText, attachment: parsedAtt } = parseAttachmentFromText(msg.text || '');
            const messageAttachments = isDeleted ? [] : (Array.isArray(msg.attachments) && msg.attachments.length
              ? msg.attachments
              : msg.attachment
                ? [msg.attachment]
                : Array.isArray(msg.attachmentIds) && msg.attachmentIds.length
                  ? msg.attachmentIds.map((id) => chatAttachmentMetadata[String(id)] || { id })
                  : parsedAtt ? [parsedAtt] : []);
            const displayText = isDeleted
              ? ''
              : stripPollMetadata(cleanText).replace('📊 Poll:', '🗳️ Poll:');
            const pollId = isDeleted ? null : getMessagePollId(msg);
            const isLegacyPollMessage = !isDeleted && msg.text?.includes('📊') && /\bpoll\b/i.test(msg.text);
            const isEditingThis = editingMessageId === msg.id;
            const isPinned = isMessagePinned(msg.id);

            return (
              <div key={msg.id} className={`group flex flex-col min-w-0 max-w-full ${isOutgoing ? 'items-end' : 'items-start'}`}>
                {}
                <div className={`text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1 flex items-center gap-1.5 ${isOutgoing ? 'mr-9 justify-end' : 'ml-9 justify-start'}`}>
                  <span>{senderName}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{msg.timestamp}</span>
                  {msg.editedAt && !isDeleted && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">(edited)</span>
                  )}
                  {isPinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                      <BsPin size={10} />
                      Pinned
                    </span>
                  )}
                </div>

                {}
                <div className="flex items-center gap-2 min-w-0 max-w-full sm:max-w-[85%] relative">
                  {!isOutgoing && (
                    <ChatAvatar src={msg.senderAvatar || findMemberAvatar(msg)} name={senderName} color={avatarColor} className="w-7 h-7 text-[10px] shadow-xs" />
                  )}

                  {}
                  {!readOnly && !isDeleted && !isEditingThis && (
                      <div className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 mx-1 ${isOutgoing ? 'order-first' : 'order-last'}`}>
                      <div className="relative" ref={messageMenuOpen === msg.id ? messageMenuRef : null}>
                        <button
                          type="button"
                          onClick={() => setMessageMenuOpen((prev) => prev === msg.id ? null : msg.id)}
                          className="p-2 sm:p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10 transition cursor-pointer"
                          title="Message options"
                        >
                          <FiMoreVertical size={14} />
                        </button>
                        {messageMenuOpen === msg.id && (
                          <div className="absolute bottom-full right-0 mb-1 w-32 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-md shadow-lg py-1 z-30">
                            {isMessagePinned(msg.id) ? (
                              <button
                                type="button"
                                onClick={() => handleUnpinMessage(msg.id)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                              >
                                <BsPin size={12} />
                                Unpin
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePinMessage(msg.id)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                              >
                                <BsPin size={12} />
                                Pin
                              </button>
                            )}
                            {isOutgoing && !pollId && !isLegacyPollMessage && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(msg)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                              >
                                <FiEdit2 size={12} />
                                Edit
                              </button>
                            )}
                            {isOutgoing && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                disabled={isDeleting}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer disabled:opacity-50"
                              >
                                <FiTrash2 size={12} />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {}
                  {isEditingThis ? (
                    <div className="min-w-0 flex-1 max-w-full rounded-2xl px-3 py-2 bg-white dark:bg-[#1C1C1C] border-2 border-sky-400 dark:border-sky-600 shadow-xs">
                      <textarea
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(msg.id); }
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        maxLength={2000}
                        rows={Math.min(4, Math.ceil(editingText.length / 60) + 1)}
                        className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white outline-none resize-none [overflow-wrap:anywhere]"
                      />
                      <div className="flex items-center justify-end gap-2 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-white/10">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="text-[11px] px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(msg.id)}
                          disabled={isEditing || !editingText.trim()}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50 transition cursor-pointer flex items-center gap-1"
                        >
                          {isEditing ? (
                            <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                            <FiCheck size={11} />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`min-w-0 max-w-full rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap [overflow-wrap:anywhere] shadow-xs ${
                        isDeleted
                          ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-white/5 italic'
                          : isOutgoing
                          ? 'bg-[#8AD4FF] dark:bg-[#1C1C1C] text-slate-900 dark:text-white rounded-tr-xs dark:border dark:border-white/10'
                          : 'bg-white dark:bg-[#171717] text-slate-900 dark:text-white rounded-tl-xs border border-slate-100 dark:border-white/5'
                      }`}
                    >
                      {isDeleted ? (
                        <p className="min-w-0 max-w-full [overflow-wrap:anywhere] flex items-center gap-1.5">
                          <FiTrash2 size={12} className="shrink-0" />
                          This message was deleted
                        </p>
                      ) : (
                        <>
                          {displayText && <p className="min-w-0 max-w-full [overflow-wrap:anywhere]">{displayText}</p>}

                          {messageAttachments.map((rawAttachment, attachmentIndex) => {
                            const attachmentId = rawAttachment.id || rawAttachment.attachmentId;
                            const attachmentDetails = { ...(chatAttachmentMetadata[String(attachmentId)] || {}), ...rawAttachment };
                            const attachment = {
                              ...attachmentDetails,
                              name: attachmentDetails.fileName || attachmentDetails.name || 'Attachment',
                              size: attachmentDetails.sizeBytes ?? attachmentDetails.size ?? 0,
                              type: attachmentDetails.contentType || attachmentDetails.type || '',
                              downloadUrl: attachmentDetails.downloadUrl || attachmentDetails.url,
                            };
                            const isImage = attachmentDetails.isImage || attachment.type.startsWith('image/');
                            const isAudio = attachment.type.startsWith('audio/') || /\.(webm|m4a|mp3|wav|ogg|aac)$/i.test(attachment.name);
                            return (
                              <div key={rawAttachment.id || attachmentIndex} className={`mt-2 flex min-w-0 items-center gap-2.5 rounded-xl border p-2.5 ${
                                isOutgoing
                                  ? 'bg-white/60 dark:bg-white/5 border-sky-300 dark:border-white/10 text-slate-900 dark:text-white'
                                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'
                              }`}>
                                {isAudio ? (
                                  <div className="min-w-0 flex-1">
                                    <VoiceNotePlayer projectId={activeChat?.id} attachment={attachment} />
                                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{formatFileSize(attachment.size)}</p>
                                  </div>
                                ) : <>
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400">
                                    {isImage ? <FiImage size={18} /> : <FiFileText size={18} />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    {isImage ? (
                                      <button type="button" onClick={() => handlePreviewAttachment(attachment)} className="block max-w-full truncate text-left text-xs font-semibold hover:text-sky-600 dark:hover:text-sky-400">
                                        {attachment.name}
                                      </button>
                                    ) : (
                                      <p className="truncate text-xs font-semibold">{attachment.name}</p>
                                    )}
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                      {formatFileSize(attachment.size)} • {getFileExtension(attachment.name)}
                                    </p>
                                  </div>
                                </>}
                                <button type="button" onClick={() => handleDownloadAttachment(attachment)} className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/80 hover:text-sky-600 dark:hover:bg-white/10 dark:hover:text-sky-400" title="Download attachment">
                                  <FiDownload size={16} />
                                </button>
                              </div>
                            );
                          })}

                          {(pollId || isLegacyPollMessage) && (
                            <button
                              type="button"
                              onClick={() => { setPollToOpenId(pollId); setIsPollModalOpen(true); }}
                              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-700 transition cursor-pointer"
                            >
                              View Poll
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {isOutgoing && (
                    <ChatAvatar src={getProfileImageUrl(currentUser)} name={currentUser?.name || 'You'} color="bg-[#D95295]" className="w-7 h-7 text-[10px] shadow-xs" />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {(selectedAttachments.length > 0 || attachmentError) && (
        <div className="mx-2.5 sm:mx-3 mb-2 rounded-2xl border border-sky-200 bg-white p-2.5 shadow-sm dark:border-white/10 dark:bg-[#171717] shrink-0 z-10">
          {attachmentError && (
            <p role="alert" className="mb-2 px-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">{attachmentError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {selectedAttachments.map((attachment) => (
              <div key={attachment.localId} className="flex min-w-0 max-w-full items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-[#252529]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                  {attachment.contentType?.startsWith('image/') ? <FiImage size={16} /> : <FiFileText size={16} />}
                </div>
                <div className="min-w-0">
                  <p className="max-w-[180px] truncate text-[11px] font-semibold text-slate-800 dark:text-white">{attachment.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {formatFileSize(attachment.size)} · {attachment.status === 'uploading' ? 'Uploading…' : attachment.status === 'failed' ? 'Upload failed' : 'Uploaded'}
                  </p>
                  {attachment.previewUrl && <audio controls preload="metadata" src={attachment.previewUrl} className="mt-1 h-7 w-48 max-w-full" aria-label="Preview voice note" />}
                </div>
                {attachment.status === 'uploading' ? (
                  <span className="ml-1 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-500" />
                ) : (
                  <button type="button" onClick={() => handleRemoveAttachment(attachment.localId)} title="Remove attachment" className="ml-1 shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30">
                    <FiX size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {}
      {!readOnly && <form onSubmit={handleSend} className="bg-white dark:bg-[#171717] rounded-full mx-2.5 sm:mx-3 mb-2.5 sm:mb-3 p-2 px-3 sm:px-4 shadow-xs border border-sky-100 dark:border-white/5 flex items-center gap-2 sm:gap-3 shrink-0 z-10 relative">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          onChange={handleFileSelect}
          className="hidden"
        />
        {}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingAttachments || selectedAttachments.length >= 10}
          title="Attach files (up to 10, 25 MB each)"
          className="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 transition cursor-pointer p-1 shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiPaperclip size={18} />
        </button>

        <button
          type="button"
          onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
          disabled={isUploadingAttachments || (!isRecordingVoice && selectedAttachments.length >= 10)}
          title={isRecordingVoice ? 'Stop and attach voice note' : 'Record a voice note'}
          aria-label={isRecordingVoice ? 'Stop voice note recording' : 'Record a voice note'}
          className={`inline-flex items-center gap-1.5 rounded-full p-1.5 transition cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-40 ${isRecordingVoice ? 'text-rose-500 hover:text-rose-600 dark:text-rose-400' : 'text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300'}`}
        >
          {isRecordingVoice ? <FiSquare size={16} fill="currentColor" /> : <FiMic size={18} />}
          {isRecordingVoice && <span className="min-w-[2.4rem] text-[11px] font-semibold tabular-nums">{String(Math.floor(voiceRecordingSeconds / 60)).padStart(2, '0')}:{String(voiceRecordingSeconds % 60).padStart(2, '0')}</span>}
        </button>

        {}
        <button
          type="button"
          onClick={() => { setPollToOpenId(null); setIsPollModalOpen(true); }}
          title="Project Polls & Decisions"
          className="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 transition cursor-pointer p-1 shrink-0"
        >
          <FiBarChart2 size={18} />
        </button>

        {}
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

        {}
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

        {}
        <button
          type="submit"
          disabled={isUploadingAttachments || isRecordingVoice || selectedAttachments.some((attachment) => attachment.status === 'failed') || (!inputText.trim() && !selectedAttachments.some((attachment) => attachment.status === 'uploaded'))}
          title={isProject && connectionStatus !== 'connected' ? `Connecting (${connectionStatus})...` : 'Send message'}
          className="p-2 rounded-full text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 disabled:opacity-40 transition cursor-pointer shrink-0"
        >
          <FiSend size={18} />
        </button>
      </form>}

      {}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={closeImagePreview}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center bg-[#171717] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-3 px-4 bg-white/5 border-b border-white/10 text-white text-xs sm:text-sm">
              <span className="truncate max-w-xs sm:max-w-md font-medium">{previewImage.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(previewImage)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
                  title="Download image"
                >
                  <FiDownload size={16} />
                </button>
                <button
                  type="button"
                  onClick={closeImagePreview}
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
        readOnly={readOnly}
        activeChat={activeChat}
        currentUserId={currentUser?.userId || currentUser?.id}
        onShareToChat={(poll) => {
          const pollId = poll.id || poll._id || poll.pollId;
          const shareText = `🗳️ Poll: "${poll.question}" — Vote in Project Polls!${pollId ? ` [FRIETSYNC_POLL:${pollId}]` : ''}`;
          onSendMessage(shareText);
        }}
      />

      {isProjectDetailsOpen && (
        <div
          className="fixed inset-0 z-[80] flex justify-end bg-black/20 p-3 sm:p-4"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setIsProjectDetailsOpen(false); }}
          onKeyDown={(event) => { if (event.key === 'Escape') setIsProjectDetailsOpen(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="chat-overview-title" className="relative flex h-full max-h-[calc(100dvh-24px)] w-[min(360px,calc(100vw-24px))] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl dark:border-[#303030] dark:bg-[#171717] sm:max-h-[calc(100dvh-32px)]">
            <header className="flex shrink-0 items-center justify-end gap-1 px-3 pt-3">
              {!readOnly && <button
                type="button"
                onClick={handleToggleChatMute}
                disabled={isUpdatingMute}
                aria-label={chatMuteStatus.muted ? 'Unmute chat notifications' : 'Mute chat notifications for one month'}
                title={chatMuteStatus.muted ? 'Unmute notifications' : 'Mute notifications for one month'}
                className="rounded-full p-2 text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10"
              >
                {chatMuteStatus.muted ? <FiBell size={18} /> : <FiBellOff size={18} />}
              </button>}
              <button type="button" onClick={() => setIsProjectDetailsOpen(false)} aria-label="Close project overview" className="rounded-full p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"><FiX size={20} /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-20">
              <div className="flex flex-col items-center pt-1 text-center">
                <ChatAvatar src={activeChat.avatar || projectInfo.profilePictureUrl || projectInfo.projectImageUrl || projectInfo.imageUrl || projectInfo.logoUrl || projectInfo.project?.profilePictureUrl} name={activeChat.name} color={projectColor} className="h-36 w-36 border border-slate-200 text-2xl shadow-sm dark:border-slate-700" />
                <h2 id="chat-overview-title" className="mt-3 max-w-full truncate text-xl font-semibold text-slate-950 dark:text-white">{activeChat.name}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">{memberCount} members</p>
                {projectDescription && <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{projectDescription}</p>}
              </div>

              <label className="mt-4 flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 dark:bg-[#29292d]">
                <FiSearch size={14} className="shrink-0 text-slate-500" />
                <input value={detailsSearch} onChange={(event) => setDetailsSearch(event.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-500 dark:text-white" />
              </label>

              {projectDetailsError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{projectDetailsError}</p>}
              {chatMuteStatus.muted && chatMuteStatus.mutedUntil && <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">Muted until {new Date(chatMuteStatus.mutedUntil).toLocaleString()}</p>}

              <section className="mt-5">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Team members</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{activeChat.members?.length || 0}</span>
                </div>
                {visibleMembers.length ? (
                  <ul>
                    {visibleMembers.map((member, index) => {
                      const name = getMemberName(member);
                      const email = typeof member === 'string' ? '' : member?.email || member?.user?.email || '';
                      const role = typeof member === 'string' ? '' : member?.role || member?.projectRole || member?.user?.role || '';
                      const profileUrl = getProfileImageUrl(member);
                      const memberId = typeof member === 'string' ? member : member?.userId || member?.id || member?._id || member?.user?.id || email || index;
                      return <li key={memberId} className="flex items-center gap-2 py-1.5">
                        <ChatAvatar src={profileUrl} name={name} color={getAvatarColor(name)} className="h-6 w-6 text-[9px]" />
                        <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-100">{name}</p>{email && <p className="truncate text-[9px] text-slate-500 dark:text-slate-400">{email}</p>}</div>
                        {role && <span className="text-[9px] text-slate-500 dark:text-slate-400">{String(role).replace(/[_-]/g, ' ')}</span>}
                      </li>;
                    })}
                  </ul>
                ) : <p className="py-4 text-center text-[11px] text-slate-500 dark:text-slate-400">No matching team members</p>}
              </section>
            </div>
            <footer className="absolute inset-x-0 bottom-0 flex justify-center border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/5 dark:bg-[#171717]/95">
              <button type="button" onClick={() => { setIsProjectDetailsOpen(false); setIsPinnedPanelOpen(true); }} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-[#29292d] dark:text-slate-200 dark:hover:bg-[#34343a]"><BsPin size={13} /> Pinned messages</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

export default ChatArea;
