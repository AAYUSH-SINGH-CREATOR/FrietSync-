import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import DashboardNavbar from '../../../components/layout/DashboardNavbar';
import Sidebar from '../../../components/layout/Sidebar';
import { getUnreadNotificationCount } from '../services/notificationApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const readUnreadCount = (value) => {
  const candidates = [value, value?.data, value?.result];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (!candidate || typeof candidate !== 'object') continue;
    const count = candidate.unreadCount ?? candidate.count ?? candidate.total ?? candidate.value;
    if (count !== undefined && count !== null && Number.isFinite(Number(count))) return Number(count);
  }
  return null;
};

const Dashboard = () => {
  const location = useLocation();
  const isChat = location.pathname.startsWith('/dashboard/chats');

  const [projectFilter, setProjectFilter] = useState('all');
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(null);
  const [unreadNotificationLoading, setUnreadNotificationLoading] = useState(true);
  const [notificationCountError, setNotificationCountError] = useState('');

  const updateUnreadNotificationCount = useCallback((count, error = '') => {
    setUnreadNotificationCount(count);
    setUnreadNotificationLoading(false);
    setNotificationCountError(error);
  }, []);

  const refreshUnreadNotificationCount = useCallback(async () => {
    setUnreadNotificationLoading(true);
    try {
      const result = await getUnreadNotificationCount();
      const count = readUnreadCount(result);
      setUnreadNotificationCount(count);
      setNotificationCountError(count === null ? 'Unread notification count is unavailable.' : '');
    } catch (error) {
      setUnreadNotificationCount(null);
      setNotificationCountError(getFriendlyErrorMessage(error, 'notification'));
    } finally {
      setUnreadNotificationLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getUnreadNotificationCount()
      .then((result) => {
        if (!isMounted) return;
        const count = readUnreadCount(result);
        setUnreadNotificationCount(count);
        setNotificationCountError(count === null ? 'Unread notification count is unavailable.' : '');
      })
      .catch((error) => {
        if (!isMounted) return;
        setUnreadNotificationCount(null);
        setNotificationCountError(getFriendlyErrorMessage(error, 'notification'));
      })
      .finally(() => {
        if (isMounted) {
          setUnreadNotificationLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-[var(--bg-dashboard)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200"
    >
      <DashboardNavbar unreadNotificationCount={unreadNotificationCount} />

      <Sidebar
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
        pendingInviteCount={pendingInviteCount}
      />
      <div
        className={`flex-1 w-full ${
          isChat
            ? 'pl-[76px] sm:pl-[88px] pr-2 sm:pr-4 pt-2 pb-2 sm:pb-2.5 flex flex-col min-h-0 overflow-hidden'
            : 'pl-[84px] sm:pl-[104px] pr-4 sm:pr-8 py-6'
        }`}
      >
        <main
          className={
            isChat ? 'w-full h-full flex-1 min-h-0 flex flex-col' : 'max-w-[1500px] w-full mx-auto'
          }
        >
          <Outlet
            context={{
              projectFilter,
              setProjectFilter,
              pendingInviteCount,
              setPendingInviteCount,
              unreadNotificationCount,
              unreadNotificationLoading,
              notificationCountError,
              setUnreadNotificationCount: updateUnreadNotificationCount,
              refreshUnreadNotificationCount,
            }}
          />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
