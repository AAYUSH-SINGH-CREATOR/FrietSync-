import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getProjectChatMessages,
  getCurrentChatUser,
  formatMessageTime,
  getFriendlyErrorMessage,
} from '../services/chatApi';
import { getMyProjects } from '../../projects/services/projectApi';
import { StompChatClient } from '../services/stompClient';

import { FiCheckCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import ChatArea from '../components/ChatsArea';
import ChatSidebar from '../components/ChatSidebar';

const ChatsView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProjectId = searchParams.get('projectId');

  const [projects, setProjects] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(urlProjectId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);

  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [toastNotice, setToastNotice] = useState(null);

  const stompClientRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const currentUser = useMemo(() => getCurrentChatUser(), []);

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
    if (currentUser.userId && msg.senderId && String(msg.senderId) === String(currentUser.userId)) {
      return true;
    }
    if (currentUser.email && msg.senderEmail && msg.senderEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      return true;
    }
    if (currentUser.name && msg.senderName && msg.senderName.toLowerCase() === currentUser.name.toLowerCase()) {
      return true;
    }
    return false;
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;

    getMyProjects()
      .then((data) => {
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
            lastMessage: '',
            timestamp: '',
            raw: p,
          };
        });

        setProjects(normalized);

        setActiveConversationId((prev) => {
          if (urlProjectId && normalized.some((p) => p.id === urlProjectId)) {
            return urlProjectId;
          }
          if (prev && normalized.some((p) => p.id === prev)) {
            return prev;
          }
          return normalized.length > 0 ? normalized[0].id : null;
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

  const handleRefreshProjects = () => {
    setIsLoadingChannels(true);
    getMyProjects()
      .then((data) => {
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
            lastMessage: '',
            timestamp: '',
            raw: p,
          };
        });

        setProjects(normalized);
      })
      .catch((err) => {
        showToast('error', getFriendlyErrorMessage(err, 'project'));
      })
      .finally(() => {
        setIsLoadingChannels(false);
      });
  };

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
      },
    });

    stompClientRef.current = client;
    client.connect();

    const unsub = client.subscribe(`/topic/projects/${projectId}/chat`, (receivedMsg) => {
      if (!isMounted || !receivedMsg) return;

      const outgoing = isOutgoingMessage(receivedMsg);
      const formatted = {
        id: receivedMsg.id || `${Date.now()}-${Math.random()}`,
        sender: outgoing ? 'You' : receivedMsg.senderName || receivedMsg.senderEmail || 'Member',
        senderId: receivedMsg.senderId,
        senderEmail: receivedMsg.senderEmail,
        text: receivedMsg.content || receivedMsg.message || '',
        timestamp: formatMessageTime(receivedMsg.createdAt || receivedMsg.timestamp),
        isOutgoing: outgoing,
      };

      setMessagesMap((prev) => {
        const currentList = prev[projectId] || [];
        if (receivedMsg.id && currentList.some((m) => m.id === receivedMsg.id)) {
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
  }, [activeProjectId, isOutgoingMessage]);

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setSearchParams({ projectId: id });
    setIsMobileThreadOpen(true);
    if (!messagesMap[id]) {
      setIsLoadingMessages(true);
    }
  };

  const handleSendMessage = (text) => {
    if (!activeChat || !text || !text.trim()) return;

    const trimmedText = text.trim();

    if (stompClientRef.current && stompClientRef.current.connected) {
      try {
        stompClientRef.current.publish(`/app/projects/${activeChat.id}/chat`, {
          content: trimmedText,
        });
      } catch (publishErr) {
        console.warn('Failed to publish STOMP message:', publishErr);
        showToast('error', 'Failed to send message. Please check connection.');
      }
    } else {
      showToast('error', 'Cannot send message: Chat WebSocket is connecting or offline.');
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[640px] flex flex-col gap-3.5 animate-fadeIn">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Project Chat
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#b3b3b3] mt-0.5">
            Real-time messaging for all members of your projects.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefreshProjects}
          title="Refresh projects"
          className="p-2 rounded-xl bg-white dark:bg-[#1d1d1d] border border-slate-200/80 dark:border-[#303030] text-slate-600 dark:text-[#e0e0e0] hover:text-sky-600 dark:hover:text-[#60A5FA] transition shadow-xs cursor-pointer"
        >
          <FiRefreshCw size={15} />
        </button>
      </div>

      {toastNotice && (
        <div
          className={`p-3 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn shrink-0 ${
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

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div
          className={`h-full min-h-0 lg:col-span-5 xl:col-span-4 ${
            isMobileThreadOpen ? 'hidden lg:block' : 'block'
          }`}
        >
          <ChatSidebar
            projects={projects}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoadingChannels={isLoadingChannels}
          />
        </div>

        <div
          className={`h-full min-h-0 lg:col-span-7 xl:col-span-8 ${
            isMobileThreadOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <ChatArea
            activeChat={activeChat}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            onBackToList={() => setIsMobileThreadOpen(false)}
            connectionStatus={connectionStatus}
            isLoadingMessages={isLoadingMessages}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatsView;
