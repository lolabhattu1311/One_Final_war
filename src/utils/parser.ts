import type { BlueprintRow } from '../types/study';

export interface ParsedInput {
  subject: string;
  topics: string[];
  rawPrompt: string;
}

/**
 * Masks an API key so only the final 4 characters are ever visible.
 * Never returns the full key.
 */
export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 4) {
    return '••••...••••';
  }
  const last4 = trimmed.slice(-4);
  return `••••...${last4}`;
}

/**
 * Deduplicates topics case-insensitively while preserving the first seen casing.
 */
export function dedupeTopics(topics: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of topics) {
    const cleaned = item
      .replace(/^[\s•\-*\d.)]+/, '')
      .replace(/[\s.;:]+$/, '')
      .trim();
    if (!cleaned) continue;
    const lower = cleaned.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(cleaned);
    }
  }
  return result;
}

/**
 * Splits a raw topic list string on commas, semicolons, pipes, or newlines.
 */
function splitTopicString(raw: string): string[] {
  return dedupeTopics(raw.split(/[,;\n|]+/));
}

/**
 * Parses flexible BTech student input into a subject name and a clean list of topics.
 * Supports patterns like:
 * - "Subject: Operating Systems, Topics: Deadlocks, Paging, Scheduling"
 * - "Operating Systems: Deadlocks, Paging, Scheduling"
 * - "Operating Systems - Deadlocks, Paging, Scheduling"
 * - Multi-line input where line 1 is subject and subsequent lines are topics
 * - Single subject name (when files are uploaded for topic extraction)
 */
export function parseSubjectAndTopics(input: string): ParsedInput {
  const rawPrompt = input.trim();
  if (!rawPrompt) {
    return { subject: '', topics: [], rawPrompt: '' };
  }

  // Pattern 1: Explicit "Subject: ... Topics: ..." (with optional comma/newline/semicolon between)
  const explicitMatch = rawPrompt.match(
    /^(?:subject\s*[:\-]\s*)(.+?)(?:[,\n;]+\s*topics?\s*[:\-]\s*|\s+topics?\s*[:\-]\s*)([\s\S]+)$/i,
  );
  if (explicitMatch) {
    const subject = explicitMatch[1].replace(/[,\s;.\-]+$/, '').trim();
    const topics = splitTopicString(explicitMatch[2]);
    return { subject, topics, rawPrompt };
  }

  // Pattern 2: Multiline input where first line is subject (maybe prefixed with "Subject:")
  const lines = rawPrompt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    const firstLine = lines[0].replace(/^subject\s*[:\-]\s*/i, '').trim();
    const rest = lines
      .slice(1)
      .join('\n')
      .replace(/^topics?\s*[:\-]\s*/i, '')
      .trim();
    const topics = splitTopicString(rest);
    if (firstLine && topics.length > 0) {
      return { subject: firstLine, topics, rawPrompt };
    }
  }

  // Pattern 3: "Subject Name : topic1, topic2, topic3" or "Subject Name - topic1, topic2"
  const delimiterMatch = rawPrompt.match(/^([^:\-–—]{2,80}?)\s*(?::|[-–—]{1,2}\s+)([\s\S]+)$/);
  if (delimiterMatch) {
    const possibleSubject = delimiterMatch[1].replace(/^subject\s*/i, '').trim();
    const rightSide = delimiterMatch[2].replace(/^topics?\s*[:\-]\s*/i, '').trim();
    const topics = splitTopicString(rightSide);
    if (possibleSubject && topics.length >= 1) {
      return { subject: possibleSubject, topics, rawPrompt };
    }
  }

  // Pattern 4: Comma-separated without explicit subject label (treat first item as subject if >2 items, or whole string as subject if 1 item)
  const commaParts = splitTopicString(rawPrompt.replace(/^subject\s*[:\-]\s*/i, ''));
  if (commaParts.length >= 2) {
    return {
      subject: commaParts[0],
      topics: commaParts.slice(1),
      rawPrompt,
    };
  }

  // Fallback: Single subject phrase (useful when syllabus files are attached)
  return {
    subject: rawPrompt.replace(/^subject\s*[:\-]\s*/i, '').trim(),
    topics: [],
    rawPrompt,
  };
}

/**
 * Calculates how many topics a student needs to safely cross the exam pass threshold (~45-55%).
 */
export function calculatePassTargetCount(totalTopics: number): number {
  if (totalTopics <= 0) return 0;
  if (totalTopics <= 2) return totalTopics;
  return Math.max(2, Math.ceil(totalTopics * 0.6));
}

export function buildPassLineMessage(totalTopics: number): string {
  const target = calculatePassTargetCount(totalTopics);
  if (target <= 1) {
    return 'If you finish 1 core topic thoroughly, you can pass';
  }
  return `If you finish ${target} topics, you can pass`;
}

export interface MarksDistributionSummary {
  totalMarks: number;
  byQuestionType: {
    '2-mark': number;
    '5-mark': number;
    '10-mark': number;
  };
}

/**
 * Summarizes blueprint marks distribution across units and question types.
 */
export function summarizeBlueprintMarks(rows: BlueprintRow[]): MarksDistributionSummary {
  let totalMarks = 0;
  const byQuestionType = {
    '2-mark': 0,
    '5-mark': 0,
    '10-mark': 0,
  };

  for (const row of rows) {
    const marks = Math.max(0, Number(row.expectedMarks) || 0);
    totalMarks += marks;
    const types = row.questionTypes.length > 0 ? row.questionTypes : (['5-mark'] as const);
    const weightMap = { '2-mark': 2, '5-mark': 5, '10-mark': 10 };
    const totalWeight = types.reduce((sum, t) => sum + weightMap[t], 0);

    let allocated = 0;
    types.forEach((t, idx) => {
      if (idx === types.length - 1) {
        byQuestionType[t] += Math.max(0, marks - allocated);
      } else {
        const share = Math.round((marks * weightMap[t]) / totalWeight);
        byQuestionType[t] += share;
        allocated += share;
      }
    });
  }

  return { totalMarks, byQuestionType };
}
