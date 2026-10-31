import { jsPDF } from 'jspdf';

const valueOrDash = (value) => value === null || value === undefined || value === '' ? '—' : String(value);

const safeFilename = (name) => (name || 'project')
  .normalize('NFKD')
  .replace(/[^\w.-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'project';

export const downloadProjectSummaryPdf = ({ project, summary, projectManagerName, teamLeadName, totalIssues, totalSprints, totalMembers, overallProgress, linkedRepo }) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height = 22) => {
    if (y + height > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addHeading = (text) => {
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

  const addField = (label, value) => {
    const lines = doc.splitTextToSize(`${label}: ${valueOrDash(value)}`, contentWidth);
    ensureSpace(lines.length * 15 + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(lines, margin, y);
    y += lines.length * 15 + 2;
  };

  const metrics = [
    ['Total issues', summary?.totalIssues ?? totalIssues],
    ['Open issues', summary?.openIssues],
    ['In progress', summary?.inProgressIssues],
    ['Resolved', summary?.resolvedIssues],
    ['Total sprints', summary?.totalSprints ?? totalSprints],
    ['Completed sprints', summary?.completedSprints],
    ['Overdue issues', summary?.overdueIssues],
    ['Team members', totalMembers],
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('Project Summary', margin, y);
  y += 27;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(project?.name || 'Project overview', margin, y);
  y += 17;
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, y);
  y += 12;

  addHeading('Project Information');
  addField('Project name', project?.name || 'Unnamed project');
  addField('Description', project?.description || 'No description provided.');
  addField('Project manager', projectManagerName || 'Not assigned');
  addField('Team lead', teamLeadName || 'Not assigned');
  addField('Start date', project?.startDate ? new Date(project.startDate).toLocaleDateString() : '—');
  addField('Target end date', project?.deadline ? new Date(project.deadline).toLocaleDateString() : '—');
  addField('Overall progress', overallProgress == null ? 'Unavailable' : `${overallProgress}%`);

  addHeading('Summary Metrics');
  metrics.forEach(([label, value]) => addField(label, value));

  addHeading('Repository');
  addField('GitHub repository', linkedRepo ? `${linkedRepo.owner}/${linkedRepo.repository}` : 'No GitHub repository linked');

  doc.save(`${safeFilename(project?.name)}-summary.pdf`);
};
