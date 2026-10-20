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

import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import ChatArea from '../components/ChatsArea';
import ChatSidebar from '../components/ChatSidebar';

const ChatsView = () => {
  const { currentUserProfile } = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProjectId = searchParams.get('projectId');

  const [projects, setProjects] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(urlProjectId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(Boolean(urlProjectId));

  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [toastNotice, setToastNotice] = useState(null);

  const stompClientRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const currentUser = useMemo(() => ({ ...getCurrentChatUser(), profilePictureUrl: currentUserProfile?.profilePictureUrl || '' }), [currentUserProfile]);

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    setTimeout(() => {
      setToastNotice(null);
    }, 4000);
  }, []);

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
      .then(async (data) => {
        if (!isMounted) return;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.projects)
          ? data.projects
          : Array.isArray(data?.data)
          ? data.data
          : [];

        const normalized = list.map((p) => {
          const id = String(p.id || p.projectId || p._id || '');
          return {
            id,
            name: p.name || 'Untitled Project',
            description: p.description || '',
            status: p.status || 'ACTIVE',
            isProject: true,
            isGroup: true,
            members: Array.isArray(p.members) ? p.members : [],
            memberCount: p.memberCount ?? p.membersCount ?? p.totalMembers,
            lastMessage: '',
            timestamp: '',
            raw: p,
          };
        });

        // /projects/me may omit the expanded members array. Load it from the
        // project members endpoint so the chat header can show the real count.
        const projectsWithMembers = await Promise.all(normalized.map(async (project) => {
          try {
            const members = await getProjectMembers(project.id);
            return { ...project, members: Array.isArray(members) ? members : project.members };
          } catch (error) {
            console.warn(`Failed to load members for project ${project.id}:`, error);
            return project;
          }
        }));

        if (!isMounted) return;
        setProjects(projectsWithMembers);

        setActiveConversationId((prev) => {
          if (urlProjectId && projectsWithMembers.some((p) => p.id === urlProjectId)) {
            return urlProjectId;
          }
          if (prev && projectsWithMembers.some((p) => p.id === prev)) {
            return prev;
          }
          return projectsWithMembers.length > 0 ? projectsWithMembers[0].id : null;
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

  const activeChat = useMemo(() => {
    if (!activeConversationId) return projects[0] || null;
    return projects.find((p) => p.id === String(activeConversationId)) || projects[0] || null;
  }, [activeConversationId, projects]);

  const activeProjectId = activeChat?.id || null;

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

    getProjectChatMessages(projectId, 50)
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
              text: msg.content || msg.message || '',
              timestamp: formatMessageTime(msg.createdAt || msg.timestamp),
              isOutgoing: outgoing,
            };
          });

          setMessagesMap((prev) => {
            const currentList = prev[projectId] || [];
            const combinedMap = new Map();
            normalized.forEach((m) => combinedMap.set(m.id, m));
            currentList.forEach((m) => {
              if (!combinedMap.has(m.id)) {
                combinedMap.set(m.id, m);
              }
            });
            return {
              ...prev,
              [projectId]: Array.from(combinedMap.values()),
            };
          });

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
        text: text,
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

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (stompClientRef.current) {
        stompClientRef.current.disconnect();
        stompClientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setSearchParams({ projectId: id });
    setIsMobileThreadOpen(true);
    if (!messagesMap[id]) {
      setIsLoadingMessages(true);
    }
  };

  const handleSendMessage = (text) => {
    if (!activeChat || !text || !text.trim()) return false;

    const trimmedText = text.trim();

    if (stompClientRef.current && stompClientRef.current.connected) {
      try {
        stompClientRef.current.publish(`/app/projects/${activeChat.id}/chat`, {
          content: trimmedText,
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

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col animate-fadeIn bg-[#e8e8e8] dark:bg-[#1d1d1d] rounded-2xl p-2 sm:p-3 overflow-hidden">
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
            currentUser={currentUser}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatsView;
