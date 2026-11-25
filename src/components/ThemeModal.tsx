import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { ThemePresetLabel } from '../types/study';

interface ThemeModalProps {
  isOpen: boolean;
  triggerLabel: ThemePresetLabel | null;
  currentTheme: string;
  onClose: () => void;
  onSaveTheme: (theme: string) => void;
}

export function ThemeModal({
  isOpen,
  triggerLabel,
  currentTheme,
  onClose,
  onSaveTheme,
}: ThemeModalProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(currentTheme);
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, currentTheme]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTheme(draft.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#16161a] border border-white/[0.1] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 id="theme-modal-title" className="font-display text-lg font-bold text-white">
                Describe our theme in one line
              </h2>
              {triggerLabel && (
                <p className="text-xs text-zinc-400 mt-0.5">Mode · {triggerLabel}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close theme modal"
            className="min-h-[40px] min-w-[40px] -mr-2 -mt-1 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
          Set your preferred explanation tone and language style. This theme will guide every
          roadmap, blueprint, and exam kit answer.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="study-theme-input" className="sr-only">
              Describe our theme in one line
            </label>
            <input
              ref={inputRef}
              id="study-theme-input"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write your one-line explanation style"
              className="w-full min-h-[46px] rounded-xl bg-[#0d0d10] border border-white/[0.12] px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {currentTheme ? (
              <button
                type="button"
                onClick={() => {
                  onSaveTheme('');
                  onClose();
                }}
                className="min-h-[40px] px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Reset theme
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-white/[0.1] hover:bg-white/[0.06] text-sm font-medium text-zinc-300 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors whitespace-nowrap"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
