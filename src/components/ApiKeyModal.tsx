import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, KeyRound, ShieldCheck, X } from 'lucide-react';
import {
  AI_PROVIDERS,
  AI_PROVIDER_LIST,
  type AiConfig,
  type AiProvider,
} from '../services/aiClient';
import { maskApiKey } from '../utils/parser';

interface ApiKeyModalProps {
  isOpen: boolean;
  savedConfig: AiConfig | null;
  onClose: () => void;
  onSaveConfig: (config: AiConfig) => void;
  onRemoveConfig: () => void;
}

export function ApiKeyModal({
  isOpen,
  savedConfig,
  onClose,
  onSaveConfig,
  onRemoveConfig,
}: ApiKeyModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('gemini');
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const hasSavedConfig = Boolean(savedConfig?.apiKey?.trim());
  const maskedDisplay = hasSavedConfig && savedConfig ? maskApiKey(savedConfig.apiKey) : '';
  const savedProviderMeta = savedConfig ? AI_PROVIDERS[savedConfig.provider] : null;
  const activeMeta = AI_PROVIDERS[selectedProvider];
  const isSwitchingProvider = Boolean(
    hasSavedConfig && savedConfig && selectedProvider !== savedConfig.provider,
  );

  useEffect(() => {
    if (isOpen) {
      // Strictly never pre-fill the saved key
      setSelectedProvider(savedConfig?.provider ?? 'gemini');
      setInputKey('');
      setError('');
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, savedConfig]);

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

  const validateAndSave = (requireKey: boolean) => {
    const cleaned = inputKey.trim();

    if (hasSavedConfig && !isSwitchingProvider && !cleaned && !requireKey) {
      onClose();
      return;
    }

    if (cleaned.length < 8) {
      setError(
        isSwitchingProvider
          ? `Enter your ${activeMeta.shortName} API key to switch provider.`
          : `Please enter a valid ${activeMeta.shortName} API key before saving.`,
      );
      inputRef.current?.focus();
      return;
    }

    setInputKey('');
    setError('');
    onSaveConfig({ provider: selectedProvider, apiKey: cleaned });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAndSave(isSwitchingProvider || !hasSavedConfig);
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

        {hasSavedConfig && savedProviderMeta ? (
          <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-200 font-medium break-all">
              Brain is already connected ({savedProviderMeta.label}) -{' '}
              <span className="font-mono">{maskedDisplay}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-400 mb-4">
            Choose an AI provider and enter your API Key. This key becomes the brain for this
            application. All roadmaps, blueprints and kits will be generated using your key.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Provider Dropdown */}
          <div>
            <label
              htmlFor="ai-provider-select"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              AI Provider
            </label>
            <div className="relative">
              <select
                id="ai-provider-select"
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value as AiProvider);
                  setError('');
                }}
                className="w-full min-h-[46px] appearance-none rounded-xl bg-[#0d0d10] border border-white/[0.12] pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
              >
                {AI_PROVIDER_LIST.map((provider) => (
                  <option
                    key={provider.id}
                    value={provider.id}
                    className="bg-[#16161a] text-zinc-100"
                  >
                    {provider.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
              />
            </div>
          </div>

          {/* Masked Password API Key Input */}
          <div>
            <label
              htmlFor="ai-api-key-input"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              API Key
            </label>
            <input
              ref={inputRef}
              id="ai-api-key-input"
              type="password"
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                if (error) setError('');
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder={
                hasSavedConfig && !isSwitchingProvider
                  ? 'Enter new key to replace, or leave empty to keep old key'
                  : `Paste your ${activeMeta.shortName} API Key here`
              }
              className="w-full min-h-[46px] rounded-xl bg-[#0d0d10] border border-white/[0.12] px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            {error && (
              <p role="alert" className="mt-2 text-xs text-rose-400">
                {error}
              </p>
            )}
          </div>

          {/* Dynamic Provider Help Text */}
          <div className="flex items-center justify-between text-xs">
            <a
              href={activeMeta.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline"
            >
              <span>{activeMeta.helpText}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>

          {hasSavedConfig ? (
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
                onClick={() => validateAndSave(true)}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors whitespace-nowrap"
              >
                {isSwitchingProvider ? 'Save & Connect' : 'Replace Key'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputKey('');
                  onRemoveConfig();
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
