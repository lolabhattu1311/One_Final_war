import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Download,
  Images,
  Lightbulb,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { ExamKitData } from '../types/study';
import { buildDiagramSvg } from '../utils/diagramRenderer';

interface ExamKitViewProps {
  subject: string;
  topic: string;
  kit: ExamKitData | null;
  isLoading: boolean;
  error: string;
  isInvalidKeyError: boolean;
  onBackToOverview: () => void;
  onRegenerate: () => void;
  onOpenMedia: () => void;
  onOpenApiModal: () => void;
}

export function ExamKitView({
  subject,
  topic,
  kit,
  isLoading,
  error,
  isInvalidKeyError,
  onBackToOverview,
  onRegenerate,
  onOpenMedia,
  onOpenApiModal,
}: ExamKitViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const svgMarkup = useMemo(() => {
    if (!kit) return '';
    return buildDiagramSvg(kit.diagram);
  }, [kit]);

  const svgDataUri = useMemo(() => {
    if (!svgMarkup) return '';
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  }, [svgMarkup]);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleDownloadSvg = () => {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-diagram.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToOverview}
          className="min-h-[40px] px-3 py-2 -ml-3 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] inline-flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Roadmap & Blueprint</span>
        </button>

        {kit && !isLoading && (
          <button
            type="button"
            onClick={onRegenerate}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-white/[0.1] hover:bg-white/[0.06] text-xs font-medium text-zinc-300 hover:text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Regenerate Kit</span>
          </button>
        )}
      </div>

      {/* Topic Header */}
      <div className="pb-5 border-b border-white/[0.08]">
        <p className="text-xs text-zinc-400 mb-1.5">
          <span>{subject}</span>
          <span aria-hidden="true"> · </span>
          <span>Exam Kit</span>
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">{topic}</h1>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-2xl bg-[#131317] border border-white/[0.08] p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-4">
          <Loader2 className="h-7 w-7 text-blue-400 animate-spin" />
          <div>
            <p className="font-display text-base font-semibold text-white">
              Building Exam Kit for {topic}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              Generating 5-minute intuition, 2/5/10-mark answers, diagram, and real-life example
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          role="alert"
          className="rounded-2xl bg-rose-500/10 border border-rose-500/25 p-6 space-y-4"
        >
          <p className="text-sm text-rose-200 leading-relaxed">{error}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRegenerate}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-white/[0.09] hover:bg-white/[0.14] text-xs font-medium text-white transition-colors whitespace-nowrap"
            >
              Try Again
            </button>
            {isInvalidKeyError && (
              <button
                type="button"
                onClick={onOpenApiModal}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors whitespace-nowrap"
              >
                Open Add API
              </button>
            )}
          </div>
        </div>
      )}

      {/* Exam Kit Content */}
      {!isLoading && kit && (
        <div className="space-y-6">
          {/* 1. Understand in 5 mins */}
          <section className="rounded-2xl bg-[#131317] border border-white/[0.08] p-6 sm:p-7">
            <div className="flex items-center gap-2.5 mb-4">
              <BookOpen className="h-4 w-4 text-blue-400 shrink-0" />
              <h2 className="font-display text-lg font-bold text-white">Understand in 5 mins</h2>
            </div>
            <div className="space-y-3.5 text-[15px] leading-relaxed text-zinc-200">
              {kit.understandIn5Mins.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* 2. 2-Mark Answer */}
          <section className="rounded-2xl bg-[#131317] border border-white/[0.08] p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-white">2-Mark Answer</h2>
                <p className="text-xs text-zinc-400 mt-0.5">3 crisp exam-writable lines</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('2mark', kit.twoMarkAnswer.join('\n'))}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {copiedKey === '2mark' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <ol className="space-y-2.5 text-[15px] leading-relaxed text-zinc-200">
              {kit.twoMarkAnswer.map((line, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="font-mono text-xs tabular-nums text-zinc-500 pt-1 shrink-0">
                    {idx + 1}.
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 3. 5-Mark Answer */}
          <section className="rounded-2xl bg-[#131317] border border-white/[0.08] p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-white">5-Mark Answer</h2>
                <p className="text-xs text-zinc-400 mt-0.5">10 structured lines for full credit</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('5mark', kit.fiveMarkAnswer.join('\n'))}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {copiedKey === '5mark' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <ol className="space-y-2.5 text-[15px] leading-relaxed text-zinc-200">
              {kit.fiveMarkAnswer.map((line, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="font-mono text-xs tabular-nums text-zinc-500 pt-1 w-5 shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 4. 10-Mark Answer */}
          <section className="rounded-2xl bg-[#131317] border border-white/[0.08] p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="font-display text-lg font-bold text-white">10-Mark Answer</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Intro · Steps · Conclusion (exam writable)
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    '10mark',
                    [
                      `Introduction:\n${kit.tenMarkAnswer.intro}`,
                      `\nSteps:\n${kit.tenMarkAnswer.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
                      `\nConclusion:\n${kit.tenMarkAnswer.conclusion}`,
                    ].join('\n'),
                  )
                }
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {copiedKey === '10mark' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-6 text-[15px] leading-relaxed text-zinc-200">
              <div>
                <h3 className="text-xs font-semibold text-blue-400 mb-2">Introduction</h3>
                <p>{kit.tenMarkAnswer.intro}</p>
              </div>

              <div className="pt-4 border-t border-white/[0.07]">
                <h3 className="text-xs font-semibold text-blue-400 mb-3">Steps & Explanation</h3>
                <ol className="space-y-3">
                  {kit.tenMarkAnswer.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="font-mono text-xs tabular-nums text-zinc-500 pt-1 shrink-0">
                        Step {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="pt-4 border-t border-white/[0.07]">
                <h3 className="text-xs font-semibold text-blue-400 mb-2">Conclusion</h3>
                <p>{kit.tenMarkAnswer.conclusion}</p>
              </div>
            </div>
          </section>

          {/* 5. One Diagram to Draw + One Real Life Example */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Diagram */}
            <section className="xl:col-span-7 rounded-2xl bg-[#131317] border border-white/[0.08] p-6 sm:p-7 flex flex-col justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-white">
                      One Diagram to Draw
                    </h2>
                    <p className="text-xs text-emerald-400/90 mt-0.5">
                      Auto-saved to Media
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadSvg}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] text-xs font-medium text-zinc-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download SVG</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenMedia}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-white/[0.1] hover:bg-white/[0.06] text-xs font-medium text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Images className="h-3.5 w-3.5" />
                      <span>Media</span>
                    </button>
                  </div>
                </div>

                {svgDataUri && (
                  <div className="rounded-xl overflow-hidden bg-[#0c0c0f] border border-white/[0.07]">
                    <img
                      src={svgDataUri}
                      alt={kit.diagram.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-auto block"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Real Life Example */}
            <section className="xl:col-span-5 rounded-2xl bg-[#131317] border border-white/[0.08] p-6 sm:p-7 flex flex-col justify-between gap-5">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Lightbulb className="h-4 w-4 text-amber-400 shrink-0" />
                  <h2 className="font-display text-lg font-bold text-white">
                    One Real Life Example
                  </h2>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    {kit.realLifeExample.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-zinc-300 mt-2.5">
                    {kit.realLifeExample.analogy}
                  </p>
                </div>
              </div>

              {kit.realLifeExample.connection && (
                <div className="pt-4 border-t border-white/[0.07]">
                  <p className="text-xs font-semibold text-zinc-400 mb-1">Exam Tip</p>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {kit.realLifeExample.connection}
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
