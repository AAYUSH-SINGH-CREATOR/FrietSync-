import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Signup from './features/auth/pages/Signup';
import Login from './features/auth/pages/Login';
import Dashboard from './features/dashboard/pages/Dashboard';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import PublicRoute from './features/auth/components/PublicRoute';
import OtpVerification from './features/auth/pages/OtpVerification';
import ForgotPassword from './features/auth/pages/ForgotPassword';

import Team from './features/dashboard/pages/Team';
import Invite from './features/invites/pages/Invite';
import CreateWorkspace from './features/dashboard/pages/CreateWorkspace';

function App() {
  return (
    <Routes>

      <Route element={<PublicRoute />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/" element={<Navigate to="/signup" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path='/verify-otp' element={<OtpVerification />}></Route>
        <Route path='/forgot-password' element={<ForgotPassword />} ></Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-workspace" element={<CreateWorkspace />} />
        <Route path='/invite' element={<Invite />} ></Route>
      </Route>
    </Routes>
  );
}

export default App;