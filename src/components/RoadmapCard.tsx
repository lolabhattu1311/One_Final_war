import { ArrowRight, CheckCircle2, Clock, Target } from 'lucide-react';
import type { RoadmapData } from '../types/study';

interface RoadmapCardProps {
  subject: string;
  roadmap: RoadmapData;
  onSelectTopic: (topic: string) => void;
}

export function RoadmapCard({ subject, roadmap, onSelectTopic }: RoadmapCardProps) {
  const priorityGroups = [
    {
      label: 'High Priority',
      subtitle: 'Do first · Highest scoring weight',
      accentText: 'text-rose-300',
      topics: roadmap.highPriority,
    },
    {
      label: 'Medium Priority',
      subtitle: 'Do next · Strong 5-mark & diagram yield',
      accentText: 'text-amber-300',
      topics: roadmap.mediumPriority,
    },
    {
      label: 'Low Priority',
      subtitle: 'Quick scan · Good for 2-mark backup',
      accentText: 'text-sky-300',
      topics: roadmap.lowPriority,
    },
  ];

  return (
    <section
      aria-labelledby="roadmap-heading"
      className="rounded-2xl bg-[#131317] border border-white/[0.08] p-6 sm:p-7"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.07]">
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-1.5">{subject}</p>
          <h2 id="roadmap-heading" className="font-display text-xl sm:text-2xl font-bold text-white">
            Your 1-Night Roadmap
          </h2>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <p className="text-xs text-zinc-500">Total Topics</p>
            <p className="font-mono text-lg font-semibold tabular-nums text-white mt-0.5">
              {roadmap.totalTopics}
            </p>
          </div>
          <div className="h-8 w-px bg-white/[0.08]" aria-hidden="true" />
          <div>
            <p className="text-xs text-zinc-500">Total Time</p>
            <p className="font-mono text-lg font-semibold tabular-nums text-white mt-0.5">
              {roadmap.totalTime}
            </p>
          </div>
        </div>
      </div>

      {/* Pass Line Callout */}
      <div className="mt-6 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3.5 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-emerald-300/80 font-medium">Pass Line</p>
          <p className="text-sm sm:text-[15px] font-semibold text-emerald-100 mt-0.5">
            {roadmap.passLine}
          </p>
        </div>
      </div>

      {/* Priority Tiers */}
      <div className="mt-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
          <h3 className="font-display text-sm font-semibold text-zinc-200 flex items-center gap-2 whitespace-nowrap">
            <Target className="h-4 w-4 text-blue-400 shrink-0" />
            <span>Priority Order</span>
          </h3>
          <span className="text-xs text-zinc-500">Click any topic to open its Exam Kit</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {priorityGroups.map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="pb-2 border-b border-white/[0.07]">
                <p className={`text-sm font-semibold ${group.accentText}`}>{group.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{group.subtitle}</p>
              </div>

              {group.topics.length === 0 ? (
                <p className="text-xs text-zinc-500 py-1">No topics in this bucket</p>
              ) : (
                <ul className="space-y-1.5">
                  {group.topics.map((topic) => (
                    <li key={topic}>
                      <button
                        type="button"
                        onClick={() => onSelectTopic(topic)}
                        className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-left text-sm text-zinc-200 hover:text-white flex items-center justify-between gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <span className="truncate">{topic}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 8-Hour Timeline */}
      <div className="mt-8 pt-6 border-t border-white/[0.07]">
        <h3 className="font-display text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-blue-400" />
          <span>8-Hour Timeline</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roadmap.timeline.map((slot) => (
            <div
              key={slot.hours}
              className="rounded-xl bg-[#0e0e12] border border-white/[0.07] p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold tabular-nums text-blue-400">
                    {slot.hours}
                  </span>
                  <span className="text-xs text-zinc-500">{slot.phase}</span>
                </div>
                <p className="text-sm text-zinc-200 mt-2 leading-relaxed">{slot.focus}</p>
              </div>

              {slot.topics.length > 0 && (
                <p className="text-xs text-zinc-400 pt-2.5 border-t border-white/[0.06] leading-relaxed">
                  {slot.topics.join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
