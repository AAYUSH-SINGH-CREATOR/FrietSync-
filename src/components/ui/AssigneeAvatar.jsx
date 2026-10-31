import { useEffect, useState } from 'react';

const getInitials = (name = '') => String(name).trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '—';

const AssigneeAvatar = ({ src, name, className = '', color = 'bg-slate-500' }) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [src]);

  if (src && !imageFailed) {
    return <img src={src} alt={`${name || 'Assignee'} profile`} title={name || 'Assignee'} onError={() => setImageFailed(true)} className={`${className} rounded-full object-cover`} />;
  }

  return <span title={name || 'Unassigned'} className={`${className} ${color} flex items-center justify-center rounded-full font-bold text-white`}>{getInitials(name || '')}</span>;
};

export default AssigneeAvatar;
