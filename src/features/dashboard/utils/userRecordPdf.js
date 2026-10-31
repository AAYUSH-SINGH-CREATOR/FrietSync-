import { jsPDF } from 'jspdf';

const printable = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(printable).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const safeFilename = (name) => (name || 'user')
  .normalize('NFKD')
  .replace(/[^\w.-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'user';

export const downloadUserRecordPdf = ({ member, record, sprints = [], issues = [], activity }) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height = 18) => {
    if (y + height > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const heading = (text) => {
    ensureSpace(30);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(text, margin, y);
    y += 9;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
  };

  const field = (label, value) => {
    const lines = doc.splitTextToSize(`${label}: ${printable(value)}`, contentWidth);
    ensureSpace(lines.length * 15 + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(lines, margin, y);
    y += lines.length * 15 + 2;
  };

  const listRecord = (item, index, label) => {
    const title = item.name || item.title || item.summary || item.issueTitle || `${label} ${index + 1}`;
    field(`${label} ${index + 1}`, title);
    Object.entries(item)
      .filter(([key, value]) => !['name', 'title', 'summary', 'issueTitle'].includes(key) && value !== null && value !== undefined && typeof value !== 'object')
      .forEach(([key, value]) => field(`  ${key.replace(/([A-Z])/g, ' $1')}`, value));
    y += 5;
  };

  const memberName = member?.name || member?.fullName || member?.user?.name || 'Unknown';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('Team Member Record', margin, y);
  y += 27;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(memberName, margin, y);
  y += 17;
  if (member?.email || member?.user?.email) {
    doc.text(member.email || member.user.email, margin, y);
    y += 16;
  }
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, y);
  y += 12;

  heading('Profile');
  field('Role', record?.role || member?.role || member?.workspaceRole);
  field('Job title', record?.jobTitle);
  field('Bio', record?.bio);
  field('GitHub', record?.githubUrl);

  heading('Performance summary');
  field('Projects', record?.projectCount);
  field('Issues created', record?.issues?.created);
  field('Issues resolved', record?.issues?.resolved);
  field('Average resolution time (hours)', record?.issues?.averageHoursToResolve);
  field('Issues reopened', record?.issues?.reopened);
  field('Sprints committed', record?.sprints?.committed);
  field('Sprints completed', record?.sprints?.completed);
  field('Sprints active', record?.sprints?.active);
  field('Sprints planned', record?.sprints?.planned);
  field('Sprint completion rate', record?.sprints?.completionRate == null ? null : `${(record.sprints.completionRate * 100).toFixed(0)}%`);

  heading('GitHub activity');
  field('Commits', activity?.commits);
  field('Pull requests', activity?.pullRequests);
  field('Merged pull requests', activity?.mergedPullRequests);
  field('Reviews', activity?.githubReviews);

  heading(`Sprints (${sprints.length})`);
  if (sprints.length) sprints.forEach((sprint, index) => listRecord(sprint, index, 'Sprint'));
  else field('Records', 'No sprint data available');

  heading(`Issues (${issues.length})`);
  if (issues.length) issues.forEach((issue, index) => listRecord(issue, index, 'Issue'));
  else field('Records', 'No issues assigned');

  doc.save(`${safeFilename(memberName)}-record.pdf`);
};
