import { useState } from 'react';
import { Download, Images, Maximize2, Trash2, X } from 'lucide-react';
import type { SavedDiagram } from '../types/study';

interface MediaGalleryProps {
  diagrams: SavedDiagram[];
  onDeleteDiagram: (id: string) => void;
}

export function MediaGallery({ diagrams, onDeleteDiagram }: MediaGalleryProps) {
  const [expandedDiagram, setExpandedDiagram] = useState<SavedDiagram | null>(null);

  const handleDownload = (diagram: SavedDiagram) => {
    const blob = new Blob([diagram.svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${diagram.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-diagram.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-white/[0.08] flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Media</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Saved generated diagrams and flowcharts from your Exam Kits
          </p>
        </div>
        {diagrams.length > 0 && (
          <span className="font-mono text-xs tabular-nums text-zinc-400">
            {diagrams.length} saved
          </span>
        )}
      </div>

      {diagrams.length === 0 ? (
        <div className="rounded-2xl bg-[#131317] border border-white/[0.08] py-16 px-6 text-center flex flex-col items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
            <Images className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="font-display text-base font-semibold text-zinc-200">
            No saved diagrams yet
          </p>
          <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
            Open any topic Exam Kit to generate a clean exam diagram. Every diagram saves here
            automatically for quick revision.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {diagrams.map((diagram) => {
            const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(diagram.svgMarkup)}`;
            return (
              <article
                key={diagram.id}
                className="rounded-2xl bg-[#131317] border border-white/[0.08] overflow-hidden flex flex-col"
              >
                <div className="p-4 bg-[#0d0d10] border-b border-white/[0.07]">
                  <img
                    src={src}
                    alt={diagram.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto rounded-lg block"
                  />
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-xs text-zinc-400">
                      <span>{diagram.subject}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{diagram.topic}</span>
                    </p>
                    <h2 className="font-display text-base font-semibold text-white mt-1">
                      {diagram.title}
                    </h2>
                    {diagram.caption && (
                      <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                        {diagram.caption}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.07]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedDiagram(diagram)}
                        aria-label={`View ${diagram.title} full size`}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] text-xs font-medium text-zinc-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(diagram)}
                        aria-label={`Download ${diagram.title} SVG`}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg border border-white/[0.1] hover:bg-white/[0.06] text-xs font-medium text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>SVG</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteDiagram(diagram.id)}
                      aria-label={`Delete ${diagram.title}`}
                      className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Fullscreen Preview Lightbox */}
      {expandedDiagram && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expanded-diagram-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExpandedDiagram(null);
          }}
        >
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#141418] border border-white/[0.1] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs text-zinc-400">
                  {expandedDiagram.subject} · {expandedDiagram.topic}
                </p>
                <h2
                  id="expanded-diagram-title"
                  className="font-display text-lg font-bold text-white mt-0.5"
                >
                  {expandedDiagram.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setExpandedDiagram(null)}
                aria-label="Close diagram preview"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(expandedDiagram.svgMarkup)}`}
              alt={expandedDiagram.title}
              referrerPolicy="no-referrer"
              className="w-full h-auto rounded-xl border border-white/[0.08]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
