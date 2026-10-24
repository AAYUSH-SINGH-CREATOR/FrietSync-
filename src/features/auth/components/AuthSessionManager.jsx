import { useEffect } from 'react';
import {
  initializeAccessTokenRefresh,
  stopAccessTokenRefreshSchedule,
} from '../services/authApi';

const AuthSessionManager = () => {
  useEffect(() => {
    initializeAccessTokenRefresh();

    const handlePageHide = () => stopAccessTokenRefreshSchedule();
    const handlePageShow = () => initializeAccessTokenRefresh();
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      stopAccessTokenRefreshSchedule();
    };
  }, []);

  return null;
};

export default AuthSessionManager;
