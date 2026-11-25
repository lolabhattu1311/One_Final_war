import { useEffect, useRef, useState } from 'react';
import { ExternalLink, KeyRound, ShieldCheck, X } from 'lucide-react';
import { maskApiKey } from '../utils/parser';

interface ApiKeyModalProps {
  isOpen: boolean;
  savedApiKey: string;
  onClose: () => void;
  onSaveKey: (newKey: string) => void;
  onRemoveKey: () => void;
}

export function ApiKeyModal({
  isOpen,
  savedApiKey,
  onClose,
  onSaveKey,
  onRemoveKey,
}: ApiKeyModalProps) {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const hasSavedKey = Boolean(savedApiKey.trim());
  const maskedDisplay = hasSavedKey ? maskApiKey(savedApiKey) : '';

  useEffect(() => {
    if (isOpen) {
      // Strictly never pre-fill the saved key
      setInputKey('');
      setError('');
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputKey.trim();

    if (hasSavedKey && !cleaned) {
      // Leaving input empty when already connected keeps existing key
      onClose();
      return;
    }

    if (cleaned.length < 10) {
      setError('Please enter a valid Gemini API key before saving.');
      return;
    }

    setInputKey('');
    setError('');
    onSaveKey(cleaned);
  };

  const handleReplaceClick = () => {
    const cleaned = inputKey.trim();
    if (cleaned.length < 10) {
      setError('Enter a new Gemini API key to replace the existing key.');
      inputRef.current?.focus();
      return;
    }
    setInputKey('');
    setError('');
    onSaveKey(cleaned);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#16161a] border border-white/[0.1] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5 text-blue-400" />
            </div>
            <h2 id="api-modal-title" className="font-display text-lg font-bold text-white">
              Connect Your Brain
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close popup"
            className="min-h-[40px] min-w-[40px] -mr-2 -mt-1 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {hasSavedKey ? (
          <div className="mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-200 font-medium break-all">
              Brain is already connected - <span className="font-mono">{maskedDisplay}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-400 mb-5">
            Enter your Gemini API Key. This key becomes the brain for this application. All
            roadmaps, blueprints and kits will be generated using your key.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="gemini-api-key-input" className="sr-only">
              Gemini API Key
            </label>
            <input
              ref={inputRef}
              id="gemini-api-key-input"
              type="password"
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                if (error) setError('');
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder={
                hasSavedKey
                  ? 'Enter new key to replace, or leave empty to keep old key'
                  : 'Paste your Gemini API Key here'
              }
              className="w-full min-h-[46px] rounded-xl bg-[#0d0d10] border border-white/[0.12] px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            {error && (
              <p role="alert" className="mt-2 text-xs text-rose-400">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline"
            >
              <span>Get key from aistudio.google.com</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {hasSavedKey ? (
            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-sm font-medium text-white transition-colors whitespace-nowrap"
              >
                Keep Existing Key
              </button>
              <button
                type="button"
                onClick={handleReplaceClick}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors whitespace-nowrap"
              >
                Replace Key
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputKey('');
                  onRemoveKey();
                }}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-sm font-medium text-rose-300 transition-colors whitespace-nowrap"
              >
                Remove Key
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-3.5 py-2 rounded-xl border border-white/[0.1] hover:bg-white/[0.06] text-sm font-medium text-zinc-300 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="pt-2 flex items-center justify-end gap-2.5">
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
                Save & Connect
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
