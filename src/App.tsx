import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Menu, AlertCircle } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ThemeModal } from './components/ThemeModal';
import { CenterInput } from './components/CenterInput';
import { RoadmapCard } from './components/RoadmapCard';
import { BlueprintCard } from './components/BlueprintCard';
import { ExamKitView } from './components/ExamKitView';
import { MediaGallery } from './components/MediaGallery';
import {
  AiClientError,
  BUSY_PROVIDER_MESSAGE,
  generateRoadmapAndBlueprint,
  generateTopicExamKit,
  type AiConfig,
} from './services/aiClient';
import type {
  AppView,
  SavedDiagram,
  StudySession,
  ThemePresetLabel,
  UploadedAttachment,
} from './types/study';
import { buildDiagramSvg } from './utils/diagramRenderer';
import { parseSubjectAndTopics } from './utils/parser';
import {
  clearAiConfig,
  loadAiConfig,
  loadSavedDiagrams,
  loadSession,
  loadTheme,
  saveAiConfig,
  saveDiagrams,
  saveSession,
  saveTheme,
} from './utils/storage';

async function readAttachmentFile(file: File): Promise<UploadedAttachment> {
  const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const isText =
    file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt');

  if (isText) {
    const textContent = await file.text();
    return {
      id,
      name: file.name,
      mimeType: file.type || 'text/plain',
      size: file.size,
      textContent,
    };
  }

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });

  return {
    id,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    base64Data,
  };
}

export default function App() {
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(() => loadAiConfig());
  const [theme, setTheme] = useState<string>(() => loadTheme());
  const [session, setSession] = useState<StudySession | null>(() => loadSession());
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>(() =>
    loadSavedDiagrams(),
  );

  const [activeView, setActiveView] = useState<AppView>(() =>
    loadSession() ? 'overview' : 'welcome',
  );
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const [promptInput, setPromptInput] = useState('');
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [validationError, setValidationError] = useState('');

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState('');
  const [planErrorActionable, setPlanErrorActionable] = useState(false);

  const [loadingTopic, setLoadingTopic] = useState<string | null>(null);
  const [topicError, setTopicError] = useState('');
  const [topicErrorActionable, setTopicErrorActionable] = useState(false);

  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [themeModalTrigger, setThemeModalTrigger] = useState<ThemePresetLabel | null>(
    null,
  );

  // Exact 3-second "Brain Connected" toast & button state
  const [justConnected, setJustConnected] = useState(false);
  const connectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (connectTimerRef.current !== null) {
        window.clearTimeout(connectTimerRef.current);
      }
    };
  }, []);

  const generatedTopicSet = useMemo(() => {
    return new Set(Object.keys(session?.examKits ?? {}));
  }, [session]);

  const hasConnectedApi = Boolean(aiConfig?.apiKey?.trim());

  const handleSaveAiConfig = useCallback((nextConfig: AiConfig) => {
    saveAiConfig(nextConfig);
    setAiConfig(nextConfig);
    setIsApiModalOpen(false);
    setPlanError('');
    setPlanErrorActionable(false);
    setTopicError('');
    setTopicErrorActionable(false);

    if (connectTimerRef.current !== null) {
      window.clearTimeout(connectTimerRef.current);
    }
    setJustConnected(true);
    connectTimerRef.current = window.setTimeout(() => {
      setJustConnected(false);
      connectTimerRef.current = null;
    }, 3000);
  }, []);

  const handleRemoveAiConfig = useCallback(() => {
    clearAiConfig();
    setAiConfig(null);
    setJustConnected(false);
    if (connectTimerRef.current !== null) {
      window.clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    setIsApiModalOpen(false);
  }, []);

  const handleSaveTheme = useCallback((nextTheme: string) => {
    saveTheme(nextTheme);
    setTheme(nextTheme);
  }, []);

  const handleAddFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setValidationError('');
    try {
      const parsed = await Promise.all(files.map((file) => readAttachmentFile(file)));
      setAttachments((prev) => [...prev, ...parsed]);
    } catch {
      setValidationError('Could not read one of the selected files. Please try again.');
    }
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleNewChat = useCallback(() => {
    setSession(null);
    saveSession(null);
    setSelectedTopic(null);
    setPromptInput('');
    setAttachments([]);
    setValidationError('');
    setPlanError('');
    setPlanErrorActionable(false);
    setTopicError('');
    setTopicErrorActionable(false);
    setActiveView('welcome');
  }, []);

  const autoSaveDiagram = useCallback(
    (
      subjectName: string,
      topicName: string,
      kitDiagram: {
        title: string;
        caption: string;
        nodes: Array<{
          id: string;
          label: string;
          sublabel?: string;
          kind?: 'start' | 'process' | 'decision' | 'io' | 'end';
        }>;
        edges: Array<{ from: string; to: string; label?: string }>;
      },
    ) => {
      const svgMarkup = buildDiagramSvg(kitDiagram);
      const diagramId = `${subjectName.toLowerCase().trim()}::${topicName.toLowerCase().trim()}`;
      const nextItem: SavedDiagram = {
        id: diagramId,
        subject: subjectName,
        topic: topicName,
        title: kitDiagram.title || `${topicName} Diagram`,
        caption: kitDiagram.caption || '',
        svgMarkup,
        createdAt: new Date().toISOString(),
      };

      setSavedDiagrams((prev) => {
        const filtered = prev.filter((d) => d.id !== diagramId);
        const updated = [nextItem, ...filtered];
        saveDiagrams(updated);
        return updated;
      });
    },
    [],
  );

  const handleGeneratePlan = useCallback(async () => {
    const trimmed = promptInput.trim();
    if (!trimmed && attachments.length === 0) {
      setValidationError('Enter a subject name and topics, or attach syllabus notes using +.');
      return;
    }

    const parsed = parseSubjectAndTopics(trimmed);
    if (!parsed.subject && attachments.length === 0) {
      setValidationError('Please include a subject name and topics.');
      return;
    }

    if (!aiConfig || !aiConfig.apiKey.trim()) {
      setValidationError('');
      setPlanError(
        'Connect an AI provider first using "Add API" in the sidebar to generate your 1-night plan.',
      );
      setPlanErrorActionable(true);
      setIsApiModalOpen(true);
      return;
    }

    setValidationError('');
    setPlanError('');
    setPlanErrorActionable(false);
    setIsGeneratingPlan(true);

    const optimisticSubject = parsed.subject || 'Analyzing Syllabus...';
    const optimisticTopics = parsed.topics;
    if (optimisticTopics.length > 0) {
      setSession((prev) => ({
        subject: optimisticSubject,
        topics: optimisticTopics,
        roadmap: prev?.roadmap ?? {
          totalTopics: optimisticTopics.length,
          totalTime: '8 Hours',
          highPriority: [],
          mediumPriority: [],
          lowPriority: [],
          timeline: [],
          passLine: '',
          passTargetCount: 0,
        },
        blueprint: prev?.blueprint ?? [],
        examKits: {},
        createdAt: new Date().toISOString(),
      }));
    }

    try {
      const result = await generateRoadmapAndBlueprint({
        config: aiConfig,
        subject: parsed.subject,
        topics: parsed.topics,
        rawPrompt: trimmed || 'Extract subject and exam topics from the attached files.',
        theme,
        attachments,
      });

      const nextSession: StudySession = {
        subject: result.subject,
        topics: result.topics,
        roadmap: result.roadmap,
        blueprint: result.blueprint,
        examKits: {},
        createdAt: new Date().toISOString(),
      };

      setSession(nextSession);
      saveSession(nextSession);
      setSelectedTopic(null);
      setPromptInput('');
      setAttachments([]);
      setActiveView('overview');
    } catch (err) {
      if (err instanceof AiClientError) {
        setPlanError(err.message);
        setPlanErrorActionable(true);
      } else {
        setPlanError(BUSY_PROVIDER_MESSAGE);
        setPlanErrorActionable(true);
      }
      setSession((prev) => {
        if (prev && prev.roadmap.timeline.length === 0) {
          return null;
        }
        return prev;
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [aiConfig, attachments, promptInput, theme]);

  const loadOrGenerateExamKit = useCallback(
    async (topicName: string, forceRegenerate = false) => {
      if (!session) return;
      setSelectedTopic(topicName);
      setActiveView('topic');
      setTopicError('');
      setTopicErrorActionable(false);

      const existing = session.examKits[topicName];
      if (existing && !forceRegenerate) {
        autoSaveDiagram(session.subject, topicName, existing.diagram);
        return;
      }

      if (!aiConfig || !aiConfig.apiKey.trim()) {
        setTopicError(
          'Connect an AI provider via "Add API" to generate the Exam Kit for this topic.',
        );
        setTopicErrorActionable(true);
        return;
      }

      setLoadingTopic(topicName);
      try {
        const kit = await generateTopicExamKit({
          config: aiConfig,
          subject: session.subject,
          topic: topicName,
          allTopics: session.topics,
          theme,
        });

        setSession((prev) => {
          if (!prev) return prev;
          const updated: StudySession = {
            ...prev,
            examKits: {
              ...prev.examKits,
              [topicName]: kit,
            },
          };
          saveSession(updated);
          return updated;
        });

        autoSaveDiagram(session.subject, topicName, kit.diagram);
      } catch (err) {
        if (err instanceof AiClientError) {
          setTopicError(err.message);
          setTopicErrorActionable(true);
        } else {
          setTopicError(BUSY_PROVIDER_MESSAGE);
          setTopicErrorActionable(true);
        }
      } finally {
        setLoadingTopic(null);
      }
    },
    [aiConfig, autoSaveDiagram, session, theme],
  );

  const handleDeleteDiagram = useCallback((id: string) => {
    setSavedDiagrams((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveDiagrams(updated);
      return updated;
    });
  }, []);

  const hasValidRoadmap = Boolean(session && session.roadmap.timeline.length > 0);
  const activeExamKit =
    session && selectedTopic ? session.examKits[selectedTopic] ?? null : null;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#0a0a0c] text-zinc-100">
      {/* Left Sidebar (280px desktop, off-canvas mobile) */}
      <Sidebar
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        activeView={activeView}
        subject={session?.subject ?? ''}
        topics={session?.topics ?? []}
        selectedTopic={selectedTopic}
        generatedTopicSet={generatedTopicSet}
        savedDiagramCount={savedDiagrams.length}
        hasApiKey={hasConnectedApi}
        justConnected={justConnected}
        onNewChat={handleNewChat}
        onOpenMedia={() => setActiveView('media')}
        onSelectOverview={() => {
          if (hasValidRoadmap) {
            setSelectedTopic(null);
            setActiveView('overview');
          } else {
            setActiveView('welcome');
          }
        }}
        onSelectTopic={(topic) => {
          void loadOrGenerateExamKit(topic, false);
        }}
        onOpenApiModal={() => setIsApiModalOpen(true)}
      />

      {/* Right Main Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Compact Mobile Top Bar (<= 56px, strictly within 15% cap) */}
        <header className="md:hidden h-14 px-4 border-b border-white/[0.08] bg-[#121212]/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpenMobile(true)}
            aria-label="Open navigation menu"
            className="min-h-[44px] min-w-[44px] -ml-2 inline-flex items-center justify-center rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-sm font-bold text-white truncate">
            Night Before
          </span>
          <button
            type="button"
            onClick={() => setIsApiModalOpen(true)}
            aria-label={hasConnectedApi ? 'Add API - Brain Connected' : 'Add API'}
            className="min-h-[40px] px-3 rounded-lg bg-white/[0.06] text-xs font-medium text-zinc-200 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <span>{justConnected ? 'Brain Connected' : 'Add API'}</span>
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                hasConnectedApi ? 'bg-emerald-500' : 'bg-zinc-500'
              }`}
            />
          </button>
        </header>

        {/* Scrollable Main Canvas */}
        <main className="flex-1 overflow-y-auto">
          {activeView === 'media' ? (
            <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
              <MediaGallery
                diagrams={savedDiagrams}
                onDeleteDiagram={handleDeleteDiagram}
              />
            </div>
          ) : activeView === 'topic' && session && selectedTopic ? (
            <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
              <ExamKitView
                subject={session.subject}
                topic={selectedTopic}
                kit={activeExamKit}
                isLoading={loadingTopic === selectedTopic}
                error={topicError}
                isInvalidKeyError={topicErrorActionable}
                onBackToOverview={() => {
                  setSelectedTopic(null);
                  setActiveView('overview');
                }}
                onRegenerate={() => {
                  void loadOrGenerateExamKit(selectedTopic, true);
                }}
                onOpenMedia={() => setActiveView('media')}
                onOpenApiModal={() => setIsApiModalOpen(true)}
              />
            </div>
          ) : activeView === 'overview' && hasValidRoadmap && session ? (
            <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-8">
              {/* Compact Input Bar to start/refine another subject anytime */}
              <div className="space-y-3">
                <CenterInput
                  value={promptInput}
                  onChange={(val) => {
                    setPromptInput(val);
                    if (validationError) setValidationError('');
                  }}
                  attachments={attachments}
                  onAddFiles={(files) => {
                    void handleAddFiles(files);
                  }}
                  onRemoveAttachment={handleRemoveAttachment}
                  onSubmit={() => {
                    void handleGeneratePlan();
                  }}
                  isLoading={isGeneratingPlan}
                  validationError={validationError}
                  activeTheme={theme}
                  onOpenThemeModal={(label) => setThemeModalTrigger(label)}
                  compact
                />

                {planError && (
                  <div
                    role="alert"
                    className="max-w-2xl mx-auto rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-rose-200"
                  >
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>{planError}</span>
                    </span>
                    {planErrorActionable && (
                      <button
                        type="button"
                        onClick={() => setIsApiModalOpen(true)}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white whitespace-nowrap"
                      >
                        Open Add API
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isGeneratingPlan ? (
                <div className="rounded-2xl bg-[#131317] border border-white/[0.08] p-10 flex flex-col items-center justify-center text-center gap-3">
                  <Loader2 className="h-7 w-7 text-blue-400 animate-spin" />
                  <p className="font-display text-base font-semibold text-white">
                    Drafting your 1-Night Roadmap & Exam Blueprint
                  </p>
                  <p className="text-sm text-zinc-400">
                    Prioritizing your topics into an 8-hour war plan
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. ROADMAP CARD */}
                  <RoadmapCard
                    subject={session.subject}
                    roadmap={session.roadmap}
                    onSelectTopic={(topic) => {
                      void loadOrGenerateExamKit(topic, false);
                    }}
                  />

                  {/* 2. BLUEPRINT CARD */}
                  <BlueprintCard
                    blueprint={session.blueprint}
                    onSelectTopic={(topic) => {
                      void loadOrGenerateExamKit(topic, false);
                    }}
                  />
                </>
              )}
            </div>
          ) : (
            /* Welcome / Empty Center View */
            <div className="min-h-full flex flex-col items-center justify-center px-5 sm:px-8 py-12">
              <div className="w-full max-w-2xl mx-auto text-center space-y-8">
                <div className="space-y-3">
                  <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-white leading-[1.14] [text-wrap:balance]">
                    Welcome lets prepare for tomorrow&apos;s war
                  </h1>
                  <p className="text-sm sm:text-base text-zinc-400">
                    Enter subject and topics, get your 1-night plan
                  </p>
                </div>

                <CenterInput
                  value={promptInput}
                  onChange={(val) => {
                    setPromptInput(val);
                    if (validationError) setValidationError('');
                  }}
                  attachments={attachments}
                  onAddFiles={(files) => {
                    void handleAddFiles(files);
                  }}
                  onRemoveAttachment={handleRemoveAttachment}
                  onSubmit={() => {
                    void handleGeneratePlan();
                  }}
                  isLoading={isGeneratingPlan}
                  validationError={validationError}
                  activeTheme={theme}
                  onOpenThemeModal={(label) => setThemeModalTrigger(label)}
                />

                {isGeneratingPlan && (
                  <div className="inline-flex items-center gap-2.5 text-sm text-blue-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Building your 1-night roadmap and exam blueprint...</span>
                  </div>
                )}

                {planError && !isGeneratingPlan && (
                  <div
                    role="alert"
                    className="max-w-xl mx-auto rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-3.5 text-left flex flex-wrap items-center justify-between gap-3 text-sm text-rose-200"
                  >
                    <span className="flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{planError}</span>
                    </span>
                    {planErrorActionable && (
                      <button
                        type="button"
                        onClick={() => setIsApiModalOpen(true)}
                        className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white whitespace-nowrap"
                      >
                        Open Add API
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Centered Multi-Provider API Key Popup */}
      <ApiKeyModal
        isOpen={isApiModalOpen}
        savedConfig={aiConfig}
        onClose={() => setIsApiModalOpen(false)}
        onSaveConfig={handleSaveAiConfig}
        onRemoveConfig={handleRemoveAiConfig}
      />

      {/* Centered Theme Modal */}
      <ThemeModal
        isOpen={themeModalTrigger !== null}
        triggerLabel={themeModalTrigger}
        currentTheme={theme}
        onClose={() => setThemeModalTrigger(null)}
        onSaveTheme={handleSaveTheme}
      />

      {/* Exact 3-Second "Brain Connected" Toast */}
      {justConnected && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#161a18] border border-emerald-500/35 px-4 py-3 shadow-2xl flex items-center gap-2.5 text-sm font-medium text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Brain Connected</span>
        </div>
      )}
    </div>
  );
}
