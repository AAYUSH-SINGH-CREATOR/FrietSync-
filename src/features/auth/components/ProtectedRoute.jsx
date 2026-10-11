
import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken } from '../services/authApi';

const ProtectedRoute = () => {
  const isAuthenticated = Boolean(getAccessToken());
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;