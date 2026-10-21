import { useState } from 'react';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { createProjectPoll, getFriendlyErrorMessage } from '../services/pollApi';

const DURATION_PRESETS = [
  { label: '24 Hours', days: 1 },
  { label: '3 Days', days: 3 },
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
];

const CreatePollModal = ({ isOpen, onClose, projectId, onPollCreated }) => {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [durationDays, setDurationDays] = useState(7);
  const [mode, setMode] = useState('SINGLE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleOptionChange = (idx, value) => {
    setOptions((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleAddOption = () => {
    if (options.length >= 8) return;
    setOptions((prev) => [...prev, '']);
  };

  const handleRemoveOption = (idx) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!question.trim()) {
      setErrorMsg('Please enter a poll question.');
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setErrorMsg('Please provide at least 2 non-empty options.');
      return;
    }

    const closesAtDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    setIsSubmitting(true);
    try {
      const newPoll = await createProjectPoll(projectId, {
        question: question.trim(),
        description: description.trim(),
        options: cleanOptions,
        closesAt: closesAtDate.toISOString(),
        mode,
      });

      setQuestion('');
      setDescription('');
      setOptions(['', '']);
      setDurationDays(7);
      setMode('SINGLE');
      onPollCreated?.(newPoll);
      onClose();
    } catch (err) {
      setErrorMsg(getFriendlyErrorMessage(err, 'poll'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-[#333] dark:bg-[#1a1a1d] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#2a2a2e]">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Create a Poll</h3>
            <p className="text-xs text-slate-500 dark:text-[#999]">Gather feedback and make decisions with your project team.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252528] cursor-pointer"><FiX size={18} /></button>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Question */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Poll Question <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Which authentication architecture should we prioritize?"
              maxLength={250}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400 dark:focus:bg-[#222226] dark:focus:ring-sky-400/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide background context or guidelines for this decision..."
              rows={2}
              maxLength={500}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400 dark:focus:bg-[#222226] dark:focus:ring-sky-400/30 resize-none"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Options (min 2, max 8)
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-[10px] font-bold text-slate-500 dark:bg-[#2a2a2e] dark:text-[#aaa]">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    maxLength={100}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400 dark:focus:bg-[#222226] dark:focus:ring-sky-400/30"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      title="Remove option"
                      className="rounded-lg p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 8 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2 inline-flex items-center gap-1.5 font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
              >
                <FiPlus size={14} /> Add another option
              </button>
            )}
          </div>

          {/* Duration & Mode Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Duration</label>
              <div className="grid grid-cols-2 gap-1.5">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setDurationDays(preset.days)}
                    className={`rounded-xl border py-1.5 text-center font-medium transition cursor-pointer ${
                      durationDays === preset.days
                        ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#35353a] dark:text-[#aaa] dark:hover:bg-[#242428]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">Voting Mode</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode('SINGLE')}
                  className={`rounded-xl border py-1.5 text-center font-medium transition cursor-pointer ${
                    mode === 'SINGLE'
                      ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#35353a] dark:text-[#aaa] dark:hover:bg-[#242428]'
                  }`}
                >
                  Single choice
                </button>
                <button
                  type="button"
                  onClick={() => setMode('MULTI')}
                  className={`rounded-xl border py-1.5 text-center font-medium transition cursor-pointer ${
                    mode === 'MULTI'
                      ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#35353a] dark:text-[#aaa] dark:hover:bg-[#242428]'
                  }`}
                >
                  Multi choice
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-[#2a2a2e]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 dark:border-[#35353a] dark:text-[#bbb] dark:hover:bg-[#252528] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2 font-semibold text-white shadow-sm hover:bg-sky-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating poll...' : 'Create Poll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePollModal;
