import { Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import OtpVerification from './pages/OtpVerification';
import ForgotPassword from './pages/ForgotPassword';
import PublicRoute from './components/PublicRoute';
import LandingPage from './pages/LandingPage';
import Invite from './pages/Invite';

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
        <Route path='/invite' element={<Invite />} ></Route>
      </Route>
    </Routes>
  );
}

export default App;