import { Images, KeyRound, Plus, X, ChevronRight, LayoutGrid } from 'lucide-react';
import type { AppView } from '../types/study';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  activeView: AppView;
  subject: string;
  topics: string[];
  selectedTopic: string | null;
  generatedTopicSet: Set<string>;
  savedDiagramCount: number;
  hasApiKey: boolean;
  justConnected: boolean;
  onNewChat: () => void;
  onOpenMedia: () => void;
  onSelectOverview: () => void;
  onSelectTopic: (topic: string) => void;
  onOpenApiModal: () => void;
}

export function Sidebar({
  isOpenMobile,
  onCloseMobile,
  activeView,
  subject,
  topics,
  selectedTopic,
  generatedTopicSet,
  savedDiagramCount,
  hasApiKey,
  justConnected,
  onNewChat,
  onOpenMedia,
  onSelectOverview,
  onSelectTopic,
  onOpenApiModal,
}: SidebarProps) {
  const sidebarContent = (
    <div className="flex h-full w-[280px] flex-col bg-[#121212] border-r border-white/[0.08] text-zinc-100">
      {/* Top Brand + Primary Actions */}
      <div className="p-4 border-b border-white/[0.07]">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
          >
            <span className="font-display text-[17px] font-bold tracking-tight text-white">
              Night Before
            </span>
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="md:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] text-sm font-medium text-zinc-100 flex items-center gap-2.5 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Plus className="h-4 w-4 text-blue-400 shrink-0" />
            <span>New chat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenMedia();
              onCloseMobile();
            }}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeView === 'media'
                ? 'bg-blue-500/15 text-blue-300'
                : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Images className="h-4 w-4 shrink-0" />
              <span>Media</span>
            </span>
            {savedDiagramCount > 0 && (
              <span className="text-xs font-mono tabular-nums text-zinc-400">
                {savedDiagramCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Middle: Read-only Topic List */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {subject && (
          <div className="mb-3 px-2">
            <button
              type="button"
              onClick={() => {
                onSelectOverview();
                onCloseMobile();
              }}
              className={`w-full min-h-[40px] px-2.5 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeView === 'overview'
                  ? 'bg-white/[0.09] text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                <span className="truncate">{subject}</span>
              </span>
              <span className="text-[11px] text-zinc-500 shrink-0">Plan</span>
            </button>
          </div>
        )}

        <div className="px-2.5 mb-2.5">
          <h2 className="text-xs font-semibold text-zinc-400 tracking-normal">
            Topics in this subject
          </h2>
        </div>

        {topics.length === 0 ? (
          <div className="px-2.5 py-3 text-[13px] leading-relaxed text-zinc-500">
            No topics yet - Enter subject and topics in center box
          </div>
        ) : (
          <nav aria-label="Topics in this subject" className="space-y-1">
            {topics.map((topic, index) => {
              const isSelected = activeView === 'topic' && selectedTopic === topic;
              const isReady = generatedTopicSet.has(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => {
                    onSelectTopic(topic);
                    onCloseMobile();
                  }}
                  className={`w-full min-h-[42px] px-2.5 py-2 rounded-lg text-left text-sm flex items-center justify-between gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? 'bg-blue-500/15 text-blue-200 font-medium'
                      : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[11px] tabular-nums text-zinc-500 w-4 shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate">{topic}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {isReady && (
                      <span className="text-[11px] text-emerald-400/90 font-medium">Kit</span>
                    )}
                    <ChevronRight
                      className={`h-3.5 w-3.5 ${
                        isSelected ? 'text-blue-300' : 'text-zinc-600'
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Bottom: Single API Button */}
      <div className="p-4 border-t border-white/[0.07]">
        <button
          type="button"
          onClick={() => {
            onOpenApiModal();
            onCloseMobile();
          }}
          aria-label={
            justConnected
              ? 'Brain Connected'
              : hasApiKey
                ? 'Add API - Brain Connected'
                : 'Add API - Not Connected'
          }
          className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-between transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            justConnected
              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.09] text-zinc-200'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <KeyRound className="h-4 w-4 text-zinc-400 shrink-0" />
            <span>{justConnected ? 'Brain Connected' : 'Add API'}</span>
          </span>
          <span
            aria-hidden="true"
            className={`rounded-full shrink-0 transition-all ${
              justConnected
                ? 'h-2.5 w-2.5 bg-emerald-400'
                : hasApiKey
                  ? 'h-2 w-2 bg-emerald-500'
                  : 'h-2.5 w-2.5 bg-zinc-500'
            }`}
          />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:block w-[280px] shrink-0 h-full">{sidebarContent}</aside>

      {/* Mobile off-canvas drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-[280px] max-w-[85vw] shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
