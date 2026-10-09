import { useState } from 'react';
import {
  FiFolder,
  FiInbox,
  FiRefreshCw,
  FiLayers,
} from 'react-icons/fi';
import { BsChatDots } from 'react-icons/bs';
import { getUserProfile } from '../../services/authApi';

const DashboardOverview = ({ onNavigate, pendingInviteCount = 0 }) => {
  const [userProfile] = useState(() => getUserProfile());
  const userName = userProfile?.name?.trim();
  const userRole = userProfile?.role?.trim();
  const cards = [
    {
      id: 'projects',
      title: 'Projects',
      desc: 'Manage project boards & roadmap',
      icon: FiFolder,
      color: 'bg-sky-50 text-sky-600',
    },
    {
      id: 'invites',
      title: 'Invitations',
      desc:
        pendingInviteCount > 0
          ? `${pendingInviteCount} pending invites`
          : 'Invite new colleagues',
      icon: FiInbox,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      id: 'sprints',
      title: 'Active Sprints',
      desc: 'View sprint progress & backlogs',
      icon: FiRefreshCw,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      id: 'chats',
      title: 'Team Chats',
      desc: 'Collaborate with your channels',
      icon: BsChatDots,
      color: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Hello {userName || 'there'},
          </h1>
          {userRole && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
              {userRole}
            </span>
          )}
        </div>
        <p className="text-base font-medium text-slate-600 mt-1">
          Welcome to FrietSync! Here is a high-level overview of your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => onNavigate && onNavigate(card.id)}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-sky-300 hover:shadow-md transition cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{card.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{card.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1.5">
            Workspace Connected
          </h2>
          <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
            You are logged in to FrietSync. Use the floating sidebar on the left to navigate
            between your Projects, Sprints, My Work, Team, and Workspace Invitations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('invites')}
          className="px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md shadow-sky-600/20 transition cursor-pointer shrink-0 flex items-center gap-2"
        >
          <FiLayers size={17} />
          <span>Go to Invitations</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardOverview;

