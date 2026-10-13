import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Signup from './features/auth/pages/Signup';
import Login from './features/auth/pages/Login';
import OtpVerification from './features/auth/pages/OtpVerification';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import PublicRoute from './features/auth/components/PublicRoute';
import Dashboard from './features/dashboard/pages/Dashboard';
import CreateWorkspace from './features/dashboard/pages/CreateWorkspace';
import DashboardOverview from './features/dashboard/components/DashboardOverview';
import IssuesView from './features/dashboard/components/IssueView';
import SprintsView from './features/dashboard/components/SprintsView';
import MyWorkView from './features/dashboard/components/MyWorkView';
import ChatsView from './features/chat/components/ChatsView';
import TeamView from './features/dashboard/components/TeamView';
import SettingsView from './features/dashboard/components/SettingsView';
import ProjectsView from './features/projects/pages/ProjectsView';
import InvitesView from './features/invites/components/InvitesView';
import Invite from './features/invites/pages/Invite';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/verify-otp" element={<OtpVerification />} />

      <Route element={<PublicRoute />}>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<DashboardOverview />} />
          <Route path="projects" element={<ProjectsView />} />
          <Route path="issues" element={<IssuesView />} />
          <Route path="sprints" element={<SprintsView />} />
          <Route path="my-work" element={<MyWorkView />} />
          <Route path="chats" element={<ChatsView />} />
          <Route path="invites" element={<InvitesView />} />
          <Route path="team" element={<TeamView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>

        <Route path="/create-workspace" element={<CreateWorkspace />} />
        <Route path="/team" element={<Navigate to="/dashboard/team" replace />} />
        <Route path="/invite" element={<Invite />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;