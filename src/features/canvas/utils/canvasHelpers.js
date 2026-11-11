export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Just now';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Just now';
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Just now';
  }
};

export const generateTempId = () => `temp-${Math.random().toString(36).slice(2, 9)}`;

export const isTempId = (id) => String(id || '').startsWith('temp-');

export const normalizeElement = (el) => ({
  id: el.id || generateTempId(),
  canvasId: el.canvasId || '',
  type: el.type || 'STICKY_NOTE',
  shape: el.shape || 'rectangle',
  x: typeof el.x === 'number' ? el.x : 0.1,
  y: typeof el.y === 'number' ? el.y : 0.1,
  width: typeof el.width === 'number' ? el.width : 0.16,
  height: typeof el.height === 'number' ? el.height : 0.12,
  endX: typeof el.endX === 'number' ? el.endX : null,
  endY: typeof el.endY === 'number' ? el.endY : null,
  rotation: typeof el.rotation === 'number' ? el.rotation : 0,
  zIndex: typeof el.zIndex === 'number' ? el.zIndex : (typeof el.zindex === 'number' ? el.zindex : 0),
  text: el.text || '',
  color: el.color || '#fde68a',
  fromElementId: el.fromElementId || null,
  toElementId: el.toElementId || null,
  linkedIssue: el.linkedIssue || null,
  createdBy: el.createdBy || null,
  updatedBy: el.updatedBy || null,
  revision: typeof el.revision === 'number' ? el.revision : 0,
});
