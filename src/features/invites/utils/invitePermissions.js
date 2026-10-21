const INVITE_SENDER_ROLES = ['ADMIN', 'WORKSPACE_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'TEAM_LEAD', 'LEAD'];

export const canSendInvites = (profile) => {
  const role = String(profile?.role || profile?.user?.role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  return INVITE_SENDER_ROLES.includes(role);
};
