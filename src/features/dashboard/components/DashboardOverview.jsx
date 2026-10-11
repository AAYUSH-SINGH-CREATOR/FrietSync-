import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import {
  FiFolder,
  FiInbox,
  FiRefreshCw,
  FiLayers,
   FiPlus,
  FiSettings,
} from 'react-icons/fi';
import { BsChatDots } from 'react-icons/bs';
import { getUserProfile } from '../../services/authApi';
import { getMyWorkspace } from '../../services/workspaceApi';


const DashboardOverview = ({ onNavigate, pendingInviteCount = 0 }) => {
    const [workspace, setWorkspace] = useState(null);
  const [userProfile] = useState(() => getUserProfile());
  const userName = userProfile?.name?.trim();
  const userRole = userProfile?.role?.trim();

    useEffect(() => {
    let isMounted = true;
    getMyWorkspace()
      .then((ws) => {
        if (isMounted && ws && (ws.name || ws.id || ws._id)) {
          setWorkspace(ws);
        }
      })
      .catch(() => {

      });

    return () => {
      isMounted = false;
    };
  }, []);

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
                <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Hello {userName || 'there'},
          </h1>
          {userRole && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
              {userRole}
            </span>
             )}
            {workspace?.name && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <FiLayers size={13} className="text-emerald-600" />
                <span>Workspace: <strong className="font-bold">{workspace.name}</strong></span>
              </span>
            )}
          </div>
       
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
              <div
                className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}
              >
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{card.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{card.desc}</p>
            </div>
          );
        })}
      </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                workspace?.name ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <h2 className="text-xl font-bold text-slate-900">
              {workspace?.name ? `${workspace.name}` : 'No Active Workspace'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
            {workspace?.name
              ? `Your workspace "${workspace.name}" is active. Use the floating sidebar on the left to navigate between Projects, Sprints, My Work, and Invitations.`
              : 'You have not created or joined a workspace yet. Create your workspace to begin organizing projects, sprints, and team members.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {!workspace?.name ? (
            <Link
              to="/create-workspace"
              className="px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md shadow-sky-600/20 transition cursor-pointer flex items-center gap-2"
            >
              <FiPlus size={17} />
              <span>Create Workspace</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('settings')}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2"
            >
              <FiSettings size={16} />
              <span>Workspace Settings</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('invites')}
            className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition cursor-pointer flex items-center gap-2"
          >
            <FiLayers size={17} />
            <span>Go to Invitations</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
