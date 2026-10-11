import { useState, useEffect } from 'react';
import {
  FiCalendar,
  FiFolder,
  FiLayers,
  FiMail,
  FiShield,
  FiX,
} from 'react-icons/fi';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialFormData = () => {
  const today = new Date();
  const deadline = new Date(today);
  deadline.setDate(deadline.getDate() + 60);

  return {
    name: '',
    description: '',
    workspaceId: '',
    status: 'ACTIVE',
    startDate: toDateInputValue(today),
    deadline: toDateInputValue(deadline),
    projectManagerEmail: '',
    teamLeadEmail: '',
  };
};

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100';

const Field = ({ label, htmlFor, required = false, children }) => (
  <div>
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700"
    >
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
  </div>
);

const IconInput = ({ icon: Icon, className = '', ...props }) => (
  <div className="relative">
    <Icon
      size={15}
      aria-hidden="true"
      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
    />
    <input className={`${inputClassName} pl-10 ${className}`} {...props} />
  </div>
);

const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [formData, setFormData] = useState(getInitialFormData);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setErrorMessage('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const name = formData.name.trim();
    if (!name) {
      setErrorMessage('Project name is required.');
      return;
    }

    if (!formData.workspaceId.trim()) {
      setErrorMessage('Workspace ID is required.');
      return;
    }

    if (
      formData.startDate &&
      formData.deadline &&
      formData.deadline < formData.startDate
    ) {
      setErrorMessage('Deadline cannot be earlier than the start date.');
      return;
    }

    const project = {
      ...formData,
      name,
      description: formData.description.trim(),
      projectManagerEmail: formData.projectManagerEmail.trim(),
      teamLeadEmail: formData.teamLeadEmail.trim(),
      id: `project-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    onProjectCreated?.(project);
    setFormData(getInitialFormData());
    setErrorMessage('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <FiFolder size={21} />
            </div>
            <div>
              <h2
                id="project-modal-title"
                className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              >
                Create New Project
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Add project details, dates, and team contacts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <FiX size={20} />
          </button>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {errorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Project Name" htmlFor="project-name" required>
            <input
              id="project-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. FrietSync"
              required
              autoFocus
              className={inputClassName}
            />
          </Field>

          <Field label="Description" htmlFor="project-description">
            <textarea
              id="project-description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="What is this project about?"
              className={`${inputClassName} resize-y`}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Workspace ID" htmlFor="workspace-id" required>
              <IconInput
                icon={FiLayers}
                id="workspace-id"
                name="workspaceId"
                value={formData.workspaceId}
                onChange={handleChange}
                placeholder="Enter workspace ID"
                required
              />
            </Field>

            <Field label="Status" htmlFor="project-status">
              <div className="relative">
                <FiShield
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  id="project-status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={`${inputClassName} appearance-none pl-10`}
                >
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start Date" htmlFor="project-start-date">
              <IconInput
                icon={FiCalendar}
                id="project-start-date"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
              />
            </Field>

            <Field label="Deadline" htmlFor="project-deadline">
              <IconInput
                icon={FiCalendar}
                id="project-deadline"
                name="deadline"
                type="date"
                min={formData.startDate || undefined}
                value={formData.deadline}
                onChange={handleChange}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Project Manager Email" htmlFor="project-manager-email">
              <IconInput
                icon={FiMail}
                id="project-manager-email"
                name="projectManagerEmail"
                type="email"
                value={formData.projectManagerEmail}
                onChange={handleChange}
                placeholder="pm@example.com"
              />
            </Field>

            <Field label="Team Lead Email" htmlFor="team-lead-email">
              <IconInput
                icon={FiMail}
                id="team-lead-email"
                name="teamLeadEmail"
                type="email"
                value={formData.teamLeadEmail}
                onChange={handleChange}
                placeholder="lead@example.com"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100"
            >
              Create Project
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default CreateProjectModal;