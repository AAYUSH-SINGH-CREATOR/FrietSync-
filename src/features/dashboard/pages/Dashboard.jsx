import { useState } from 'react';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import Sidebar from '../components/layout/Sidebar';
import InvitesView from '../components/dashboard/InvitesView';
import DashboardOverview from '../components/dashboard/DashboardOverview';
import IssuesView from '../components/dashboard/IssueView';
import ProjectsView from '../components/dashboard/ProjectsView';
import MyWorkView from '../components/dashboard/MyWorkView';
import TeamView from '../components/dashboard/TeamView';
import ChatsView from '../components/dashboard/ChatsView';
import SprintsView from '../components/dashboard/SprintsView';
import SettingsView from '../components/dashboard/SettingsView';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projectFilter, setProjectFilter] = useState('all');
  const [pendingInviteCount, setPendingInviteCount] = useState(0);

  return (
    <div className="min-h-screen bg-[#eaedf1] flex flex-col font-sans text-slate-800">
      <DashboardNavbar />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
        pendingInviteCount={pendingInviteCount}
      />

      <div className="flex-1 w-full pl-[84px] sm:pl-[104px] pr-4 sm:pr-8 py-6">
        <main className="max-w-[1500px] w-full mx-auto">
          {activeTab === 'invites' && (
            <InvitesView onInvitesUpdated={setPendingInviteCount} />
          )}
          {activeTab === 'dashboard' && (
            <DashboardOverview
              onNavigate={setActiveTab}
              pendingInviteCount={pendingInviteCount}
            />
          )}
          {activeTab === 'issues' && <IssuesView />}
          {activeTab === 'projects' && (
            <ProjectsView
              filter={projectFilter}
              onFilterChange={setProjectFilter}
            />
          )}
          {activeTab === 'my-work' && <MyWorkView />}
          {activeTab === 'team' && <TeamView />}
          {activeTab === 'sprints' && <SprintsView />}
          {activeTab === 'chats' && <ChatsView />}
          {activeTab === 'settings' && <SettingsView />}

        </main>
      </div>
    </div>
  );
};

export default Dashboard;