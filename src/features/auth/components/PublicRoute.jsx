import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken } from '../services/authApi';

const PublicRoute = () => {
  const isAuthenticated = Boolean(getAccessToken());

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

export default PublicRoute;