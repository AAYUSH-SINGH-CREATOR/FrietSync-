
const ROLE_LABELS = {
  ADMIN: 'Admin',
  CONTRIBUTOR: 'Contributor',
  LEAD: 'Team Lead',
  OWNER: 'Owner',
  PROJECT_MANAGER: 'Project Manager',
  REPORTER: 'Reporter',
  TEAM_LEAD: 'Team Lead',
  WORKSPACE_ADMIN: 'Workspace Admin',
};

export const formatRoleLabel = (role) => {
  const normalizedRole = String(role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (!normalizedRole) return '';
  if (ROLE_LABELS[normalizedRole]) return ROLE_LABELS[normalizedRole];

  return normalizedRole
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};
