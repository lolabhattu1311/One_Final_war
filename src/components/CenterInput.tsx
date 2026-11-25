import { useRef } from 'react';
import {
  ArrowUp,
  Compass,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquareText,
  Plus,
  X,
  Zap,
} from 'lucide-react';
import type { ThemePresetLabel, UploadedAttachment } from '../types/study';

interface CenterInputProps {
  value: string;
  onChange: (value: string) => void;
  attachments: UploadedAttachment[];
  onAddFiles: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  validationError: string;
  activeTheme: string;
  onOpenThemeModal: (label: ThemePresetLabel) => void;
  compact?: boolean;
}

const THEME_BUTTONS: Array<{ label: ThemePresetLabel; icon: typeof Compass }> = [
  { label: 'Discover', icon: Compass },
  { label: 'Ask anything', icon: MessageSquareText },
  { label: 'Take action', icon: Zap },
  { label: 'Create images', icon: ImageIcon },
];

export function CenterInput({
  value,
  onChange,
  attachments,
  onAddFiles,
  onRemoveAttachment,
  onSubmit,
  isLoading,
  validationError,
  activeTheme,
  onOpenThemeModal,
  compact = false,
}: CenterInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {
        onSubmit();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Hidden native file input triggered solely by the + button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*,.txt"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload syllabus or notes files"
      />

      {/* Rounded Meta-AI Style Input Bar */}
      <div className="rounded-[28px] bg-[#17171b] border border-white/[0.11] focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.45)] p-2 sm:p-2.5">
        <div className={`flex gap-2 ${compact ? 'items-center' : 'items-end'}`}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label="Add syllabus or notes files"
            title="Attach syllabus or notes (PDF, image, or .txt)"
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-50 text-zinc-200 flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Plus className="h-5 w-5" />
          </button>

          <textarea
            rows={compact ? 1 : 2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            aria-label="Enter the subject name and topics"
            placeholder="Enter the subject name and topics"
            className={`flex-1 bg-transparent resize-none px-1.5 sm:px-2 text-[13.5px] sm:text-[15px] leading-snug text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-60 max-h-40 ${
              compact ? 'py-1.5 min-h-[48px] sm:min-h-[38px] sm:py-2' : 'py-2.5'
            }`}
          />

          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            aria-label="Send subject and topics"
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white flex items-center justify-center shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowUp className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Validation error message */}
      {validationError && (
        <p role="alert" className="mt-2.5 px-3 text-xs text-rose-400">
          {validationError}
        </p>
      )}

      {/* Attached syllabus / notes chips */}
      {attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 px-1" aria-label="Attached files">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="inline-flex items-center gap-2 max-w-full rounded-full bg-white/[0.07] border border-white/[0.1] pl-3 pr-1.5 py-1.5 text-xs text-zinc-200"
            >
              <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="truncate max-w-[200px]">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(file.id)}
                aria-label={`Remove ${file.name}`}
                className="h-6 w-6 rounded-full hover:bg-white/[0.12] inline-flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Theme Row: 4 pill buttons */}
      {!compact && (
        <div className="mt-5 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {THEME_BUTTONS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => onOpenThemeModal(label)}
                className="min-h-[40px] px-4 py-2 rounded-full bg-[#16161a] hover:bg-[#1f1f25] border border-white/[0.09] hover:border-white/[0.16] text-xs sm:text-[13px] font-medium text-zinc-300 hover:text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Icon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {activeTheme && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 max-w-xl text-center">
              <span className="truncate">Active theme: {activeTheme}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => onOpenThemeModal('Discover')}
                className="text-blue-400 hover:text-blue-300 shrink-0"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
