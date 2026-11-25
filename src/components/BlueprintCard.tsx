import { BarChart3 } from 'lucide-react';
import type { BlueprintRow } from '../types/study';
import { summarizeBlueprintMarks } from '../utils/parser';

interface BlueprintCardProps {
  blueprint: BlueprintRow[];
  onSelectTopic: (topic: string) => void;
}

export function BlueprintCard({ blueprint, onSelectTopic }: BlueprintCardProps) {
  const summary = summarizeBlueprintMarks(blueprint);
  const safeTotal = Math.max(1, summary.totalMarks);

  const typeBars: Array<{
    key: '2-mark' | '5-mark' | '10-mark';
    label: string;
    colorClass: string;
    marks: number;
  }> = [
    {
      key: '10-mark',
      label: '10-mark Long Answers',
      colorClass: 'bg-blue-500',
      marks: summary.byQuestionType['10-mark'],
    },
    {
      key: '5-mark',
      label: '5-mark Medium Answers',
      colorClass: 'bg-sky-400',
      marks: summary.byQuestionType['5-mark'],
    },
    {
      key: '2-mark',
      label: '2-mark Short Answers',
      colorClass: 'bg-emerald-400',
      marks: summary.byQuestionType['2-mark'],
    },
  ];

  return (
    <section
      aria-labelledby="blueprint-heading"
      className="rounded-2xl bg-[#131317] border border-white/[0.08] p-6 sm:p-7"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-6 border-b border-white/[0.07]">
        <div>
          <h2
            id="blueprint-heading"
            className="font-display text-xl sm:text-2xl font-bold text-white"
          >
            Exam Blueprint
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Expected marks weightage and question types derived from your topics
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs text-zinc-500">Projected Paper Total</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-white mt-0.5">
            {summary.totalMarks} Marks
          </p>
        </div>
      </div>

      {/* Table: Unit | Topics | Expected Marks | Question Type */}
      <div className="mt-6 overflow-x-auto -mx-2 px-2">
        <table className="w-full text-left border-collapse min-w-[540px]">
          <thead>
            <tr className="border-b border-white/[0.08] text-xs font-medium text-zinc-400">
              <th scope="col" className="py-3 pr-4 font-medium">
                Unit
              </th>
              <th scope="col" className="py-3 px-4 font-medium">
                Topics
              </th>
              <th scope="col" className="py-3 px-4 font-medium text-right whitespace-nowrap">
                Expected Marks
              </th>
              <th scope="col" className="py-3 pl-4 font-medium whitespace-nowrap">
                Question Type
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] text-sm">
            {blueprint.map((row) => (
              <tr key={row.unit} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 pr-4 font-medium text-white whitespace-nowrap align-top">
                  {row.unit}
                </td>
                <td className="py-3.5 px-4 text-zinc-300 align-top">
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {row.topics.map((topic, idx) => (
                      <span key={topic} className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectTopic(topic)}
                          className="text-left hover:text-blue-400 underline-offset-4 hover:underline transition-colors"
                        >
                          {topic}
                        </button>
                        {idx < row.topics.length - 1 && (
                          <span aria-hidden="true" className="text-zinc-600">
                            ·
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-zinc-100 whitespace-nowrap align-top">
                  {row.expectedMarks}
                </td>
                <td className="py-3.5 pl-4 text-xs text-zinc-300 font-mono whitespace-nowrap align-top">
                  {row.questionTypes.join(' / ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Marks Distribution Bars */}
      <div className="mt-8 pt-6 border-t border-white/[0.07] space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <h3 className="font-display text-sm font-semibold text-zinc-200">
            Marks Distribution
          </h3>
        </div>

        {/* Stacked Question-Type Bar */}
        <div className="space-y-3">
          <div
            className="h-3 w-full rounded-full overflow-hidden bg-white/[0.06] flex"
            role="img"
            aria-label="Question type marks distribution bar"
          >
            {typeBars.map((bar) => {
              const widthPct = Math.round((bar.marks / safeTotal) * 100);
              if (widthPct <= 0) return null;
              return (
                <div
                  key={bar.key}
                  style={{ width: `${widthPct}%` }}
                  className={`${bar.colorClass} h-full transition-all`}
                  title={`${bar.label}: ${bar.marks} marks`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-300">
            {typeBars.map((bar) => {
              const pct = Math.round((bar.marks / safeTotal) * 100);
              return (
                <div key={bar.key} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-xs ${bar.colorClass}`} aria-hidden="true" />
                  <span>{bar.label}</span>
                  <span className="font-mono tabular-nums text-zinc-400">
                    {bar.marks}m ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unit-wise Horizontal Distribution Bars */}
        <div className="space-y-3 pt-2">
          {blueprint.map((row) => {
            const pct = Math.min(100, Math.round((row.expectedMarks / safeTotal) * 100));
            return (
              <div key={row.unit} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{row.unit}</span>
                  <span className="font-mono tabular-nums text-zinc-400">
                    {row.expectedMarks} marks · {pct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full rounded-full bg-blue-500/85 transition-all"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
