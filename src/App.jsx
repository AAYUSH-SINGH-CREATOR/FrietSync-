import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LegalPage from './pages/LegalPage';
import Signup from './features/auth/pages/Signup';
import Login from './features/auth/pages/Login';
import OtpVerification from './features/auth/pages/OtpVerification';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import SettingsPasswordReset from './features/dashboard/components/SettingsPasswordReset';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import PublicRoute from './features/auth/components/PublicRoute';
import Dashboard from './features/dashboard/pages/Dashboard';
import CreateWorkspace from './features/dashboard/pages/CreateWorkspace';
import DashboardOverview from './features/dashboard/components/DashboardOverview';
import IssuesView from './features/dashboard/components/IssuesView';
import SprintsView from './features/dashboard/components/SprintsView';
import MyWorkView from './features/dashboard/components/MyWorkView';
import CalendarView from './features/calendar/pages/CalendarView';
import ChatsView from './features/chat/pages/ChatView';
import TeamView from './features/dashboard/components/TeamView';
import SettingsView from './features/dashboard/components/SettingsView';
import ProfileView from './features/dashboard/components/ProfileView';
import NoWorkspace from './features/dashboard/components/NoWorkspace';
import ProjectsView from './features/projects/pages/ProjectsView';
import ProjectDetailsView from './features/projects/pages/ProjectDetailsView';
import InvitesView from './features/invites/components/InvitesView';
import Invite from './features/invites/pages/Invite';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<LegalPage type="privacy" />} />
      <Route path="/terms" element={<LegalPage type="terms" />} />
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
          <Route path="projects/:projectId" element={<ProjectDetailsView />} />
          <Route path="issues" element={<IssuesView />} />
          <Route path="sprints" element={<SprintsView />} />
          <Route path="my-work" element={<MyWorkView />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="chats" element={<ChatsView />} />
          <Route path="invites" element={<InvitesView />} />
          <Route path="team" element={<TeamView />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="settings/reset-password" element={<SettingsPasswordReset />} />
          <Route path="settings/profile" element={<ProfileView />} />
          <Route path="profile" element={<Navigate to="/dashboard/settings/profile" replace />} />
          <Route path="no-workspace" element={<NoWorkspace />} />
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
