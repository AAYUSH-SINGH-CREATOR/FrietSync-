import { useState, useMemo, useEffect, useRef } from 'react';

import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import ChatArea from '../components/ChatsArea';
import ChatSidebar from '../components/ChatSidebar';

const ChatsView = () => {
  const [groups, setGroups] = useState([]);
  const [people, setPeople] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);

  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [toastNotice, setToastNotice] = useState(null); // { type: 'success' | 'error', message: string }

  const stompClientRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);

//   const currentUser = useMemo(() => getCurrentChatUser(), []);
const currentUser = "aayush"

  const showToast = (type, message) => {
    setToastNotice({ type, message });
    setTimeout(() => {
      setToastNotice(null);
    }, 4000);
  };


  const activeChat = useMemo(() => {
    if (!activeConversationId) return groups[0] || people[0] || null;
    const foundGroup = groups.find((g) => g.id === activeConversationId);
    if (foundGroup) return foundGroup;
    const foundPerson = people.find((p) => p.id === activeConversationId);
    if (foundPerson) return foundPerson;
    return groups[0] || people[0] || null;
  }, [activeConversationId, groups, people]);

  const activeProjectId = activeChat?.isProject ? activeChat.id : null;

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
            const isOutgoing =
              (msg.senderId && currentUser.userId && msg.senderId === currentUser.userId) ||
              (msg.senderName && currentUser.name && msg.senderName.toLowerCase() === currentUser.name.toLowerCase()) ||
              msg.senderName === 'You';

            return {
              id: msg.id || `${Date.now()}-${Math.random()}`,
              sender: isOutgoing ? 'You' : msg.senderName || 'Member',
              senderId: msg.senderId,
              text: msg.content,
              timestamp: formatMessageTime(msg.createdAt),
              isOutgoing,
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
            setGroups((prev) =>
              prev.map((g) =>
                g.id === projectId
                  ? { ...g, lastMessage: last.text, timestamp: last.timestamp }
                  : g
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

      const isOutgoing =
        (receivedMsg.senderId && currentUser.userId && receivedMsg.senderId === currentUser.userId) ||
        (receivedMsg.senderName && currentUser.name && receivedMsg.senderName.toLowerCase() === currentUser.name.toLowerCase()) ||
        receivedMsg.senderName === 'You';

      const formatted = {
        id: receivedMsg.id || `${Date.now()}-${Math.random()}`,
        sender: isOutgoing ? 'You' : receivedMsg.senderName || 'Member',
        senderId: receivedMsg.senderId,
        text: receivedMsg.content,
        timestamp: formatMessageTime(receivedMsg.createdAt),
        isOutgoing,
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
      setGroups((prev) =>
        prev.map((g) =>
          g.id === projectId
            ? { ...g, lastMessage: formatted.text, timestamp: formatted.timestamp }
            : g
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
  }, [activeProjectId, currentUser.userId, currentUser.name]);

  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setIsMobileThreadOpen(true);
    if (!messagesMap[id]) {
      setIsLoadingMessages(true);
    }
  };

  const handleSendMessage = (text) => {
    if (!activeChat || !text || !text.trim()) return;

    const trimmedText = text.trim();
    const time = formatMessageTime(new Date());

    if (activeChat.isProject) {
      if (stompClientRef.current && stompClientRef.current.connected) {
        try {
          stompClientRef.current.publish(`/app/projects/${activeChat.id}/chat`, {
            content: trimmedText,
          });
          return;
        } catch (publishErr) {
          console.warn('Failed to publish STOMP message:', publishErr);
        }
      } else {
        console.warn('Cannot send message: WebSocket is connecting or offline.');
        return;
      }
    }

    const newMsg = {
      id: Date.now(),
      sender: 'You',
      text: trimmedText,
      timestamp: time,
      isOutgoing: true,
    };

    setMessagesMap((prev) => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), newMsg],
    }));

    setPeople((prev) =>
      prev.map((p) =>
        p.id === activeChat.id ? { ...p, lastMessage: trimmedText, timestamp: time } : p
      )
    );
  };

  const handleCreateGroup = async (newGroupData) => {
    try {
      const created = await createProject({
        name: newGroupData.name,
        description: newGroupData.description || '',
        status: newGroupData.status || 'ACTIVE',
      });

      const newPid = created?.id || created?._id || created?.projectId || `proj-${Date.now()}`;
      const newChannel = {
        id: newPid,
        name: created?.name || newGroupData.name,
        description: created?.description || newGroupData.description || '',
        status: created?.status || 'ACTIVE',
        isGroup: true,
        isProject: true,
        members: [{ name: 'You', email: currentUser.email, role: 'ADMIN', userId: currentUser.userId }],
        unreadCount: 0,
        lastMessage: 'Group created. Say hello to start chatting!',
        timestamp: formatMessageTime(new Date()),
        createdAt: formatMessageTime(new Date()),
        rawProject: created,
      };

      setGroups((prev) => [newChannel, ...prev]);
      setActiveConversationId(newPid);
      setIsMobileThreadOpen(true);
      showToast('success', `Group "${newChannel.name}" was created successfully.`);
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'project'));
      throw err;
    }
  };

  const handleAddMembers = async ({ email, role }) => {
    const targetGroup = activeChat?.isGroup ? activeChat : groups[0];
    if (!targetGroup) return;

    try {
      if (targetGroup.isProject) {
        await addProjectMember(targetGroup.id, { email, role: role || 'CONTRIBUTOR' });

        const updatedMembers = await getProjectMembers(targetGroup.id);
        const finalMembers = Array.isArray(updatedMembers) ? updatedMembers : [];

        setGroups((prev) =>
          prev.map((g) => (g.id === targetGroup.id ? { ...g, members: finalMembers } : g))
        );

        setPeople((prev) => {
          if (prev.some((p) => p.email?.toLowerCase() === email.toLowerCase())) return prev;
          return [
            ...prev,
            {
              id: email,
              name: email.split('@')[0],
              email,
              role: role || 'Contributor',
              status: 'Online',
              lastSeen: 'Active teammate',
              lastMessage: `${role || 'Member'} • ${email}`,
              timestamp: '',
              unreadCount: 0,
              isGroup: false,
              isProject: false,
            },
          ];
        });

        showToast('success', `${email} was added to ${targetGroup.name}.`);
      }
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'project'));
      throw err;
    }
  };

  const handleRemoveMember = async (groupId, memberUserId) => {
    try {
      const targetGroup = groups.find((g) => g.id === groupId);
      if (targetGroup?.isProject && memberUserId) {
        await removeProjectMember(groupId, memberUserId);
      }

      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            members: (g.members || []).filter(
              (m) => (m.userId || m.email || m) !== memberUserId
            ),
          };
        })
      );

      showToast('success', 'Member was removed from the group.');
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'project'));
      throw err;
    }
  };

  const targetGroupForAddMember = activeChat?.isGroup ? activeChat : groups[0] || null;

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[640px] flex flex-col gap-3.5 animate-fadeIn">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Chats
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
            Real-time group and team messaging.
          </p>
        </div>
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
            groups={groups}
            people={people}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
            onOpenAddMember={() => setIsAddMemberOpen(true)}
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
            onOpenGroupDetails={() => setIsGroupDetailsOpen(true)}
            onOpenAddMember={() => setIsAddMemberOpen(true)}
            connectionStatus={connectionStatus}
            isLoadingMessages={isLoadingMessages}
          />
        </div>
      </div>
    
    </div>
  );
};

export default ChatsView;
