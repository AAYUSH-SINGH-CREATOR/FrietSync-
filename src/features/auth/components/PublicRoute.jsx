import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken, restoreAccessToken } from '../services/authApi';

const PublicRoute = () => {
  const [isRestoring, setIsRestoring] = useState(!getAccessToken());
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()));
  useEffect(() => {
    if (getAccessToken()) {
      setIsAuthenticated(true);
      setIsRestoring(false);
      return;
    }
    let active = true;
    restoreAccessToken().then((token) => {
      if (active) setIsAuthenticated(Boolean(token));
    }).catch(() => {
      if (active) setIsAuthenticated(false);
    }).finally(() => {
      if (active) setIsRestoring(false);
    });
    return () => { active = false; };
  }, []);

  if (isRestoring) return <div className="p-6 text-center text-sm text-slate-500">Restoring your session…</div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

export default PublicRoute;
