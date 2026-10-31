import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import {
  getProjectChatMessages,
  getCurrentChatUser,
  formatMessageTime,
  getFriendlyErrorMessage,
} from '../services/chatApi';
import { getMyProjects, getProjectMembers } from '../../projects/services/projectApi';
import { StompChatClient } from '../services/stompClient';
import { useVoiceCall } from '../hooks/useVoiceCall';
import { endCall, findActiveCall, joinCall, leaveCall, startCall } from '../services/voiceCallApi';
import { VoiceCallPanel } from '../components/VoiceCallPanel';

import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import ChatArea from '../components/ChatsArea';
import ChatSidebar from '../components/ChatSidebar';

const ChatsView = ({ currentUserProfile: profileProp, isPageActive = true }) => {
  const outletContext = useOutletContext() || {};
  const currentUserProfile = profileProp || outletContext.currentUserProfile;
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProjectId = searchParams.get('projectId');

  const [projects, setProjects] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [nextHistoryPage, setNextHistoryPage] = useState({});
  const [hasOlderMessages, setHasOlderMessages] = useState({});
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(urlProjectId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(Boolean(urlProjectId));

  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [toastNotice, setToastNotice] = useState(null);

  
  const [activeCallId, setActiveCallId] = useState(null);
  const [activeCallDetails, setActiveCallDetails] = useState(null);
  const [activeCallProjectId, setActiveCallProjectId] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [showCallPanel, setShowCallPanel] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isJoiningCall, setIsJoiningCall] = useState(false);

  const unwrapCallResponse = (response) => {
    let value = response;
    
    for (let depth = 0; depth < 3; depth += 1) {
      const next = value?.call || value?.data;
      if (!next || next === value) break;
      value = next;
    }
    return value;
  };

  const stompClientRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const callUnsubscribeRef = useRef(null);
  const olderRequestsRef = useRef(new Set());
  const joiningCallRef = useRef(false);
  const joinedCallRef = useRef(null);

  const currentUser = useMemo(() => ({
    ...getCurrentChatUser(),
    profilePictureUrl: currentUserProfile?.profilePictureUrl || currentUserProfile?.user?.profilePictureUrl || currentUserProfile?.profileUrl || currentUserProfile?.avatarUrl || '',
  }), [currentUserProfile]);

  const activeChat = useMemo(() => {
    if (!activeConversationId) return projects[0] || null;
    return projects.find((p) => p.id === String(activeConversationId)) || projects[0] || null;
  }, [activeConversationId, projects]);

  const activeProjectId = activeChat?.id || null;
  const visibleCall = activeCallProjectId === activeProjectId ? activeCallDetails : null;
  const visibleCallId = visibleCall?.id || visibleCall?.callId || (activeCallProjectId === activeProjectId ? activeCallId : null);
  const currentUserId = String(currentUser.userId || currentUser.id || '');
  const currentProjectMember = activeChat?.members?.find((member) => {
    const memberId = member?.userId || member?.memberId || member?.id || member?._id || member?.user?.id || member?.user?._id;
    return currentUserId && String(memberId || '') === currentUserId;
  });
  const projectRole = String(currentProjectMember?.role || currentProjectMember?.projectRole || '').toUpperCase();
  const canEndActiveCall = Boolean(visibleCall && visibleCallId && (
    String(visibleCall.initiatedBy || visibleCall.startedById || '') === currentUserId
    || ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD'].includes(projectRole)
  ));

  const {
    state: voiceCallState,
    muted: voiceCallMuted,
    volume: voiceCallVolume,
    isConfigured: isVoiceCallConfigured,
    configurationError: voiceCallConfigurationError,
    isAutoplayBlocked,
    join: joinVoiceCall,
    leave: leaveVoiceCall,
    toggleMute: toggleVoiceCallMute,
    setVolume: setVoiceCallVolume,
    resumePlayback,
  } = useVoiceCall();

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    setTimeout(() => {
      setToastNotice(null);
    }, 4000);
  }, []);

  
  useEffect(() => {
    if (!activeProjectId) return undefined;

    let isMounted = true;
    const refreshActiveCall = async () => {
      try {
        const res = await findActiveCall(activeProjectId);
        if (!isMounted) return;
        const call = unwrapCallResponse(res);
        const callId = call?.id || call?.callId || call?.call_id;
        if (callId) {
          setActiveCallId(callId);
          setActiveCallDetails(call);
          setActiveCallProjectId(activeProjectId);
          setIsCallActive(true);
        } else {
          setIsCallActive(false);
          setActiveCallId(null);
          setActiveCallDetails(null);
          setActiveCallProjectId(activeProjectId);
        }
      } catch {
        if (isMounted) {
          setIsCallActive(false);
          setActiveCallId(null);
          setActiveCallDetails(null);
          setActiveCallProjectId(activeProjectId);
        }
      }
    };

    refreshActiveCall();
    return () => {
      isMounted = false;
    };
  }, [activeProjectId]);

  const handleStartOrJoinCall = async () => {
    if (!activeProjectId || joiningCallRef.current || joinedCallRef.current) return;
    if (!isVoiceCallConfigured) {
      showToast('error', voiceCallConfigurationError || 'Voice calling is not configured.');
      return;
    }
    joiningCallRef.current = true;
    setIsJoiningCall(true);
    let callId = activeCallId;
    let backendJoinSucceeded = false;
    try {
      if (!isCallActive || !callId) {
        let call;
        try {
          const startRes = await startCall(activeProjectId);
          call = unwrapCallResponse(startRes);
        } catch (startError) {
          
          
          const activeRes = await findActiveCall(activeProjectId);
          call = unwrapCallResponse(activeRes);
          if (!call?.id && !call?.callId && !call?.call_id) throw startError;
        }
        callId = call?.id || call?.callId || call?.call_id;
        if (!callId) throw new Error('Failed to create call.');
        setActiveCallId(callId);
        setActiveCallDetails(call);
        setActiveCallProjectId(activeProjectId);
        setIsCallActive(true);
      }

      const joinRes = await joinCall(activeProjectId, callId);
      backendJoinSucceeded = true;
      const joinDetails = unwrapCallResponse(joinRes);
      const roomId = joinDetails?.roomId ?? joinDetails?.janusRoomId ?? joinDetails?.room_id;
      if (roomId === undefined || roomId === null || roomId === '') {
        throw new Error('The call service did not return a Janus room ID.');
      }
      await joinVoiceCall({
        roomId,
        pin: joinDetails?.roomPin ?? joinDetails?.janusRoomPin ?? joinDetails?.room_pin ?? joinDetails?.pin ?? '',
        display: currentUser.name || 'User',
      });
      setActiveCallDetails(joinDetails);
      setActiveCallProjectId(activeProjectId);
      joinedCallRef.current = { projectId: activeProjectId, callId };
      setIsJoined(true);
      setShowCallPanel(true);
      showToast('success', 'Joined voice call successfully.');
    } catch (error) {
      if (backendJoinSucceeded && callId) leaveCall(activeProjectId, callId).catch(() => {});
      leaveVoiceCall();
      showToast('error', error.message || 'Failed to join voice call.');
    } finally {
      joiningCallRef.current = false;
      setIsJoiningCall(false);
    }
  };

  const handleLeaveCall = async () => {
    const joinedCall = joinedCallRef.current;
    leaveVoiceCall();
    joinedCallRef.current = null;
    setIsJoined(false);
    setShowCallPanel(false);
    try {
      if (joinedCall) await leaveCall(joinedCall.projectId, joinedCall.callId);
      showToast('success', 'Left voice call.');
    } catch (error) {
      showToast('error', error.message || 'Failed to leave voice call.');
    }
  };

  const handleEndCall = async () => {
    if (!canEndActiveCall) return;
    const targetCall = joinedCallRef.current || (activeProjectId && visibleCallId
      ? { projectId: activeProjectId, callId: visibleCallId }
      : null);
    if (!targetCall) return;
    leaveVoiceCall();
    joinedCallRef.current = null;
    setIsJoined(false);
    try {
      await endCall(targetCall.projectId, targetCall.callId);
      setIsCallActive(false);
      setActiveCallId(null);
      setActiveCallDetails(null);
      setActiveCallProjectId(activeProjectId);
      setShowCallPanel(false);
      showToast('success', 'Ended voice call for all participants.');
    } catch (error) {
      showToast('error', error.message || 'Failed to end voice call.');
    }
  };

  const handleToggleCallPanel = () => {
    if (!showCallPanel) {
      setShowCallPanel(true);
      setIsCallMinimized(false);
    } else if (isCallMinimized) {
      setIsCallMinimized(false);
    } else {
      setShowCallPanel(false);
    }
  };

  const handleCloseCallPanel = () => {
    setShowCallPanel(false);
    setIsCallMinimized(false);
  };

  useEffect(() => {
    if (voiceCallState === 'disconnected' && joinedCallRef.current) {
      joinedCallRef.current = null;
      setIsJoined(false);
      setShowCallPanel(false);
    }
  }, [voiceCallState]);

  useEffect(() => {
    const handlePageHide = () => {
      const joinedCall = joinedCallRef.current;
      leaveVoiceCall();
      if (joinedCall) leaveCall(joinedCall.projectId, joinedCall.callId).catch(() => {});
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [leaveVoiceCall]);

  const isOutgoingMessage = useCallback((msg) => {
    if (!msg) return false;
    if (msg.isOutgoing) return true;
    if (msg.sender === 'You') return true;
    const msgSenderId = msg.senderId || msg.userId;
    if (currentUser.userId && msgSenderId && String(msgSenderId) === String(currentUser.userId)) {
      return true;
    }
    const msgSenderEmail = msg.senderEmail || msg.email;
    if (currentUser.email && msgSenderEmail && msgSenderEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      return true;
    }
    const msgSenderName = msg.senderName || msg.sender;
    if (currentUser.name && msgSenderName && msgSenderName.toLowerCase() === currentUser.name.toLowerCase()) {
      return true;
    }
    return false;
  }, [currentUser]);

  const isOutgoingMessageRef = useRef(isOutgoingMessage);
  useEffect(() => {
    isOutgoingMessageRef.current = isOutgoingMessage;
  }, [isOutgoingMessage]);

  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    let isMounted = true;

    getMyProjects()
      .then((projectsData) => {
        if (!isMounted) return;
        const list = Array.isArray(projectsData) ? projectsData : [];
        const normalized = list.map((p) => {
          const id = p.projectId || p.id || p._id;
          const name = p.projectName || p.name || 'Project';
          return {
            ...p,
            id: String(id),
            name,
            avatar: p.avatar || p.profilePictureUrl || p.projectImageUrl || p.imageUrl || p.logoUrl || p.project?.profilePictureUrl || '',
            members: Array.isArray(p.members) ? p.members : [],
            memberCount: p.memberCount ?? p.membersCount ?? p.totalMembers,
            lastMessage: '',
            timestamp: '',
            raw: p,
          };
        });

        const projectsWithMembers = Promise.all(normalized.map(async (project) => {
          try {
            const members = await getProjectMembers(project.id);
            return { ...project, members: Array.isArray(members) ? members : project.members };
          } catch (error) {
            console.warn(`Failed to load members for project ${project.id}:`, error);
            return project;
          }
        }));

        projectsWithMembers.then((resolvedProjects) => {
          if (!isMounted) return;
          setProjects(resolvedProjects);
          setActiveConversationId((prev) => {
            if (urlProjectId && resolvedProjects.some((p) => p.id === urlProjectId)) {
              return urlProjectId;
            }
            if (prev && resolvedProjects.some((p) => p.id === prev)) {
              return prev;
            }
            return resolvedProjects.length > 0 ? resolvedProjects[0].id : null;
          });
        });
      })
      .catch((err) => {
        console.warn('Failed to load projects for chat:', err);
        if (isMounted) {
          showToast('error', getFriendlyErrorMessage(err, 'project'));
          setProjects([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingChannels(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [urlProjectId, showToast]);

  const activeMessages = useMemo(() => {
    if (!activeChat) return [];
    return messagesMap[activeChat.id] || [];
  }, [activeChat, messagesMap]);

  useEffect(() => {
    if (!activeProjectId) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (stompClientRef.current) {
        stompClientRef.current.disconnect();
        stompClientRef.current = null;
      }
      return;
    }

    const projectId = activeProjectId;
    let isMounted = true;

    getProjectChatMessages(projectId, 0, 50)
      .then((serverMessages) => {
        if (!isMounted) return;

        if (Array.isArray(serverMessages)) {
          const normalized = serverMessages.map((msg) => {
            const outgoing = isOutgoingMessage(msg);
            return {
              id: msg.id || `${Date.now()}-${Math.random()}`,
              sender: outgoing ? 'You' : msg.senderName || msg.senderEmail || 'Member',
              senderId: msg.senderId,
              senderEmail: msg.senderEmail,
              senderAvatar: msg.senderProfilePictureUrl || msg.profilePictureUrl || msg.avatarUrl || '',
              pollId: msg.pollId || msg.poll?.id || msg.poll?._id || msg.metadata?.pollId || msg.metadata?.poll?.id,
              poll: msg.poll || msg.metadata?.poll,
              metadata: msg.metadata,
              type: msg.type || msg.messageType,
              text: msg.content || msg.message || '',
              attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
              timestamp: formatMessageTime(msg.createdAt || msg.timestamp),
              isOutgoing: outgoing,
            };
          });

          setMessagesMap((prev) => {
            const currentList = prev[projectId] || [];
            const combinedMap = new Map();
            currentList.forEach((m) => {
              combinedMap.set(String(m.id), m);
            });
            normalized.forEach((m) => combinedMap.set(String(m.id), m));
            return {
              ...prev,
              [projectId]: Array.from(combinedMap.values()),
            };
          });
          setHasOlderMessages((prev) => (prev[projectId] === undefined ? { ...prev, [projectId]: normalized.length === 50 } : prev));

          if (normalized.length > 0) {
            const last = normalized[normalized.length - 1];
            setProjects((prev) =>
              prev.map((p) =>
                p.id === projectId
                  ? { ...p, lastMessage: last.text, timestamp: last.timestamp }
                  : p
              )
            );
          }
        }
      })
      .catch((err) => {
        console.warn('REST message fetch error for project', projectId, err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMessages(false);
      });

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (callUnsubscribeRef.current) {
      callUnsubscribeRef.current();
      callUnsubscribeRef.current = null;
    }
    if (stompClientRef.current) {
      stompClientRef.current.disconnect();
      stompClientRef.current = null;
    }

    const client = new StompChatClient({
      onStatusChange: (status) => {
        if (isMounted) setConnectionStatus(status);
      },
      onError: (err) => {
        console.warn('STOMP client error:', err);
        if (isMounted && showToastRef.current) {
          showToastRef.current('error', err?.message || 'Chat connection failed. Please try again.');
        }
      },
    });

    stompClientRef.current = client;
    client.connect();

    const unsub = client.subscribe(`/topic/projects/${projectId}/chat`, (receivedMsg) => {
      if (!isMounted || !receivedMsg) return;

      const outgoing = isOutgoingMessageRef.current ? isOutgoingMessageRef.current(receivedMsg) : false;
      const text = receivedMsg.content ?? receivedMsg.message ?? receivedMsg.text ?? '';
      const formatted = {
        id: receivedMsg.id || `${Date.now()}-${Math.random()}`,
        sender: outgoing ? 'You' : receivedMsg.senderName || receivedMsg.sender || receivedMsg.senderEmail || 'Member',
        senderId: receivedMsg.senderId || receivedMsg.userId,
        senderEmail: receivedMsg.senderEmail || receivedMsg.email,
        senderAvatar: receivedMsg.senderProfilePictureUrl || receivedMsg.profilePictureUrl || receivedMsg.avatarUrl || '',
        pollId: receivedMsg.pollId || receivedMsg.poll?.id || receivedMsg.poll?._id || receivedMsg.metadata?.pollId || receivedMsg.metadata?.poll?.id,
        poll: receivedMsg.poll || receivedMsg.metadata?.poll,
        metadata: receivedMsg.metadata,
        type: receivedMsg.type || receivedMsg.messageType,
        text: text,
        attachments: Array.isArray(receivedMsg.attachments) ? receivedMsg.attachments : [],
        timestamp: formatMessageTime(receivedMsg.createdAt || receivedMsg.timestamp || receivedMsg.sentAt || receivedMsg.time),
        isOutgoing: outgoing,
      };

      setMessagesMap((prev) => {
        const currentList = prev[projectId] || [];
        if (receivedMsg.id && currentList.some((m) => String(m.id) === String(receivedMsg.id))) {
          return prev;
        }
        return {
          ...prev,
          [projectId]: [...currentList, formatted],
        };
      });

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, lastMessage: formatted.text, timestamp: formatted.timestamp }
            : p
        )
      );
    });

    unsubscribeRef.current = unsub;
    callUnsubscribeRef.current = client.subscribe(`/topic/projects/${projectId}/calls`, (event) => {
      if (!isMounted || !event) return;

      const eventType = String(event.type || '').toUpperCase();
      const call = event.call || event.callDetails || event.details || event;
      const callId = call.id || call.callId || event.callId;
      if (!callId) return;

      if (eventType === 'ENDED') {
        setIsCallActive(false);
        setActiveCallId(null);
        setActiveCallDetails(null);
        setActiveCallProjectId(projectId);

        if (String(joinedCallRef.current?.callId || '') === String(callId)) {
          
          
          joinedCallRef.current = null;
          setIsJoined(false);
          setShowCallPanel(false);
        }
        return;
      }

      if (eventType === 'STARTED' || eventType === 'JOINED' || eventType === 'LEFT') {
        const normalizedCall = {
          ...call,
          id: call.id || call.callId || callId,
          initiatedBy: call.initiatedBy || call.startedById,
        };
        setActiveCallId(normalizedCall.id);
        setActiveCallDetails(normalizedCall);
        setActiveCallProjectId(projectId);
        setIsCallActive(true);
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (callUnsubscribeRef.current) {
        callUnsubscribeRef.current();
        callUnsubscribeRef.current = null;
      }
      if (stompClientRef.current) {
        stompClientRef.current.disconnect();
        stompClientRef.current = null;
      }
    };
    
  }, [activeProjectId]);

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setSearchParams({ projectId: id });
    setIsMobileThreadOpen(true);
    if (!messagesMap[id]) {
      setIsLoadingMessages(true);
    }
  };

  const loadOlderMessages = async () => {
    if (!activeProjectId || isLoadingOlder || olderRequestsRef.current.has(activeProjectId) || !hasOlderMessages[activeProjectId]) return;
    const page = nextHistoryPage[activeProjectId] || 1;
    olderRequestsRef.current.add(activeProjectId);
    setIsLoadingOlder(true);
    try {
      const serverMessages = await getProjectChatMessages(activeProjectId, page, 50);
      const older = serverMessages.map((msg) => {
        const outgoing = isOutgoingMessage(msg);
        return {
          id: msg.id || `${msg.createdAt || msg.timestamp}-${msg.senderId || msg.senderEmail}-${msg.content || msg.message}`,
          sender: outgoing ? 'You' : msg.senderName || msg.senderEmail || 'Member',
          senderId: msg.senderId,
          senderEmail: msg.senderEmail,
          senderAvatar: msg.senderProfilePictureUrl || msg.profilePictureUrl || msg.avatarUrl || '',
          pollId: msg.pollId || msg.poll?.id || msg.poll?._id || msg.metadata?.pollId || msg.metadata?.poll?.id,
          poll: msg.poll || msg.metadata?.poll,
          metadata: msg.metadata,
          type: msg.type || msg.messageType,
          text: msg.content || msg.message || '',
          attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
          timestamp: formatMessageTime(msg.createdAt || msg.timestamp),
          isOutgoing: outgoing,
        };
      });
      setMessagesMap((prev) => {
        const merged = new Map();
        [...older, ...(prev[activeProjectId] || [])].forEach((message) => merged.set(String(message.id), message));
        return { ...prev, [activeProjectId]: Array.from(merged.values()) };
      });
      setNextHistoryPage((prev) => ({ ...prev, [activeProjectId]: page + 1 }));
      setHasOlderMessages((prev) => ({ ...prev, [activeProjectId]: older.length === 50 }));
      return older.length > 0;
    } catch (error) {
      showToast('error', error.message || 'Failed to load older messages.');
      return false;
    } finally {
      olderRequestsRef.current.delete(activeProjectId);
      setIsLoadingOlder(false);
    }
  };

  const handleSendMessage = (text, attachmentIds = []) => {
    const trimmedText = String(text || '').trim();
    const attachmentIdList = Array.isArray(attachmentIds) ? attachmentIds.filter(Boolean) : [];
    if (!activeChat || (!trimmedText && attachmentIdList.length === 0)) return false;

    if (stompClientRef.current && stompClientRef.current.connected) {
      try {
        stompClientRef.current.publish(`/app/projects/${activeChat.id}/chat`, {
          content: trimmedText,
          ...(attachmentIdList.length ? { attachmentIds: attachmentIdList } : {}),
        });
        return true;
      } catch (publishErr) {
        console.warn('Failed to publish STOMP message:', publishErr);
        showToast('error', 'Failed to send message. Please check connection.');
        return false;
      }
    } else {
      const statusNotice = connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
        ? `Cannot send message: Chat is still connecting (${connectionStatus}). Please wait a moment.`
        : 'Cannot send message: Chat WebSocket is offline. Reconnecting...';
      showToast('error', statusNotice);
      if (stompClientRef.current && !stompClientRef.current.connected) {
        try {
          stompClientRef.current.connect();
        } catch (reconnErr) {
          console.warn('Reconnect trigger failed:', reconnErr);
        }
      }
      return false;
    }
  };

  const handleMessageUpdate = (messageId, updatedMessage) => {
    if (!activeChat?.id || !messageId) return;
    setMessagesMap((prev) => {
      const currentList = prev[activeChat.id] || [];
      const updatedList = currentList.map((msg) => {
        if (String(msg.id) === String(messageId)) {
          return {
            ...msg,
            text: updatedMessage.content || updatedMessage.message || msg.text,
            timestamp: formatMessageTime(updatedMessage.createdAt || updatedMessage.updatedAt || msg.timestamp),
            editedAt: updatedMessage.updatedAt,
            metadata: updatedMessage.metadata || msg.metadata,
          };
        }
        return msg;
      });
      return {
        ...prev,
        [activeChat.id]: updatedList,
      };
    });
  };

  const handleMessageDelete = (messageId, deletedMessage) => {
    if (!activeChat?.id || !messageId) return;
    setMessagesMap((prev) => {
      const currentList = prev[activeChat.id] || [];
      const updatedList = currentList.map((msg) => {
        if (String(msg.id) === String(messageId)) {
          return {
            ...msg,
            text: '',
            deleted: true,
            attachments: [],
            timestamp: formatMessageTime(deletedMessage.createdAt || msg.timestamp),
            editedAt: deletedMessage.updatedAt,
            metadata: deletedMessage.metadata || msg.metadata,
          };
        }
        return msg;
      });
      return {
        ...prev,
        [activeChat.id]: updatedList,
      };
    });
  };

  return (
    <>
    <div className={isPageActive ? 'h-full min-h-0 min-w-0 flex flex-col animate-fadeIn bg-[#e8e8e8] dark:bg-[#1d1d1d] rounded-2xl p-2 sm:p-3 overflow-hidden' : 'hidden'}>
      {toastNotice && (
        <div
          className={`mb-3 p-3 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn shrink-0 ${
            toastNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-[#34D399]'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-[#F87171]'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastNotice.type === 'success' ? (
              <FiCheckCircle className="shrink-0 text-emerald-600 dark:text-[#34D399]" size={16} />
            ) : (
              <FiAlertCircle className="shrink-0 text-rose-600 dark:text-[#F87171]" size={16} />
            )}
            <span className="font-medium">{toastNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="text-xs font-semibold opacity-75 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 min-w-0 w-full grid grid-cols-1 md:grid-cols-[minmax(230px,0.3fr)_minmax(0,1fr)] xl:grid-cols-[minmax(260px,0.3fr)_minmax(0,1fr)] gap-2.5 sm:gap-3">
        <div
          className={`h-full min-h-0 min-w-0 w-full max-w-full ${
            isMobileThreadOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ChatSidebar
            groups={projects}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoadingProjects={isLoadingChannels}
          />
        </div>

        <div
          className={`h-full min-h-0 flex-1 min-w-0 flex ${
            isMobileThreadOpen ? 'flex' : 'hidden md:flex'
          }`}
        >
          <ChatArea
            activeChat={activeChat}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            onBackToList={() => setIsMobileThreadOpen(false)}
            connectionStatus={connectionStatus}
            isLoadingMessages={isLoadingMessages}
            hasOlderMessages={hasOlderMessages[activeProjectId]}
            isLoadingOlder={isLoadingOlder}
            onLoadOlder={loadOlderMessages}
            currentUser={currentUser}
            onMessageUpdate={handleMessageUpdate}
            onMessageDelete={handleMessageDelete}
            voiceCall={activeProjectId ? {
              isCallActive: Boolean(visibleCall) || (activeCallProjectId === activeProjectId && isCallActive),
              isJoined,
              isJoining: isJoiningCall,
              state: voiceCallState,
              muted: voiceCallMuted,
              volume: voiceCallVolume,
              isConfigured: isVoiceCallConfigured,
              isAutoplayBlocked,
              showPanel: showCallPanel,
              onTogglePanel: handleToggleCallPanel,
              onJoin: handleStartOrJoinCall,
              onLeave: handleLeaveCall,
              onEnd: handleEndCall,
              canEndCall: canEndActiveCall,
              onToggleMute: toggleVoiceCallMute,
              onVolumeChange: setVoiceCallVolume,
              onResumePlayback: resumePlayback,
            } : null}
          />
        </div>
      </div>

    </div>

      {showCallPanel && activeChat && (
        <VoiceCallPanel
          isOpen={showCallPanel}
          isMinimized={isCallMinimized}
          projectName={activeChat.name}
          teamSize={activeChat.memberCount || activeChat.members?.length || 0}
          isConfigured={isVoiceCallConfigured}
          configurationError={voiceCallConfigurationError}
          isCallActive={Boolean(visibleCall) || (activeCallProjectId === activeProjectId && isCallActive)}
          isJoined={isJoined}
          isJoining={isJoiningCall}
          voiceCallState={voiceCallState}
          voiceCallMuted={voiceCallMuted}
          voiceCallVolume={voiceCallVolume}
          onJoin={handleStartOrJoinCall}
          onLeave={handleLeaveCall}
          onEnd={handleEndCall}
          onToggleMute={toggleVoiceCallMute}
          onVolumeChange={setVoiceCallVolume}
          onResumePlayback={resumePlayback}
          isAutoplayBlocked={isAutoplayBlocked}
          canEndCall={canEndActiveCall}
          onMinimize={() => setIsCallMinimized(true)}
          onRestore={() => setIsCallMinimized(false)}
          onClose={handleCloseCallPanel}
        />
      )}
    </>
  );
};

export default ChatsView;
