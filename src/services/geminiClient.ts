import type {
  BlueprintRow,
  DiagramSpec,
  ExamKitData,
  RoadmapData,
  UploadedAttachment,
} from '../types/study';
import { buildPassLineMessage, calculatePassTargetCount, dedupeTopics } from '../utils/parser';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export type GeminiErrorKind = 'missing_key' | 'invalid_key' | 'rate_limit' | 'network' | 'parse' | 'unknown';

export class GeminiClientError extends Error {
  kind: GeminiErrorKind;

  constructor(message: string, kind: GeminiErrorKind) {
    super(message);
    this.name = 'GeminiClientError';
    this.kind = kind;
  }
}

interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface GeminiResponsePayload {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

function buildAttachmentParts(attachments: UploadedAttachment[]): GeminiPart[] {
  const parts: GeminiPart[] = [];
  for (const file of attachments) {
    if (file.textContent) {
      parts.push({
        text: `Attached file (${file.name}):\n${file.textContent.slice(0, 12000)}`,
      });
    } else if (file.base64Data) {
      parts.push({
        inline_data: {
          mime_type: file.mimeType || 'application/octet-stream',
          data: file.base64Data,
        },
      });
    }
  }
  return parts;
}

function extractJsonObject<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const startIdx = candidate.indexOf('{');
    const endIdx = candidate.lastIndexOf('}');
    if (startIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(candidate.slice(startIdx, endIdx + 1)) as T;
      } catch {
        // Fall through to structured error
      }
    }
    throw new GeminiClientError(
      'Received an unexpected response format from Gemini. Please try generating again.',
      'parse',
    );
  }
}

async function callGeminiJson<T>(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  attachments: UploadedAttachment[] = [],
): Promise<T> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new GeminiClientError(
      'Please connect your Gemini API key using the "Add API" button in the sidebar first.',
      'missing_key',
    );
  }

  const parts: GeminiPart[] = [{ text: userPrompt }, ...buildAttachmentParts(attachments)];

  let response: Response;
  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      }),
    });
  } catch {
    throw new GeminiClientError(
      'Network error while reaching Gemini API. Check your internet connection and try again.',
      'network',
    );
  }

  let data: GeminiResponsePayload | null = null;
  try {
    data = (await response.json()) as GeminiResponsePayload;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const apiMessage = data?.error?.message || '';
    const status = data?.error?.status || '';
    if (
      response.status === 400 ||
      response.status === 401 ||
      response.status === 403 ||
      /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(`${apiMessage} ${status}`)
    ) {
      throw new GeminiClientError(
        'Your Gemini API key appears invalid or lacks permission. Click "Add API" to verify or replace your key.',
        'invalid_key',
      );
    }
    if (response.status === 429 || /RESOURCE_EXHAUSTED/i.test(`${apiMessage} ${status}`)) {
      throw new GeminiClientError(
        'Gemini API rate limit reached. Wait a few seconds and try again.',
        'rate_limit',
      );
    }
    throw new GeminiClientError(
      apiMessage || `Gemini API request failed with status ${response.status}.`,
      'unknown',
    );
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new GeminiClientError('Gemini returned an empty response. Please try again.', 'parse');
  }

  return extractJsonObject<T>(text);
}

export interface GeneratedPlanResponse {
  subject: string;
  topics: string[];
  roadmap: RoadmapData;
  blueprint: BlueprintRow[];
}

interface RawPlanPayload {
  subject?: string;
  topics?: string[];
  roadmap?: {
    highPriority?: string[];
    mediumPriority?: string[];
    lowPriority?: string[];
    timeline?: Array<{
      hours?: string;
      phase?: string;
      focus?: string;
      topics?: string[];
    }>;
    passTargetCount?: number;
    passLine?: string;
  };
  blueprint?: Array<{
    unit?: string;
    topics?: string[];
    expectedMarks?: number;
    questionTypes?: string[];
  }>;
}

export async function generateRoadmapAndBlueprint(params: {
  apiKey: string;
  subject: string;
  topics: string[];
  rawPrompt: string;
  theme: string;
  attachments: UploadedAttachment[];
}): Promise<GeneratedPlanResponse> {
  const themeNote = params.theme
    ? `Apply this explanation style/theme across descriptions and study guidance: "${params.theme}".`
    : 'Use clear, supportive, practical Indian BTech exam preparation tone (concise, exam-focused, zero fluff).';

  const systemInstruction = [
    'You are an experienced Indian BTech senior mentoring a student the night before their university semester exam.',
    'Generate a structured 1-Night Study Roadmap and Exam Blueprint using ONLY the provided subject, topics, and attached syllabus/notes.',
    'Do not assume any specific university regulation or old question paper; prioritize strictly by conceptual weight and standard BTech exam scoring potential.',
    themeNote,
    'Return ONLY valid JSON matching the requested schema.',
  ].join(' ');

  const topicPrompt =
    params.topics.length > 0
      ? `Subject: ${params.subject}\nTopics: ${params.topics.join(', ')}`
      : `Raw student input: ${params.rawPrompt}\nExtract the subject name and 5 to 10 concrete exam topics from the input and any attached syllabus/notes.`;

  const userPrompt = `${topicPrompt}

Return a JSON object with this exact structure:
{
  "subject": "Cleaned subject title",
  "topics": ["Topic 1", "Topic 2", "..."],
  "roadmap": {
    "highPriority": ["Most important high-yield topics from the list"],
    "mediumPriority": ["Secondary scoring topics from the list"],
    "lowPriority": ["Quick overview / bonus topics from the list"],
    "timeline": [
      { "hours": "Hour 0-2", "phase": "High Priority Sprint", "focus": "Master core concepts & 10-mark answers", "topics": ["..."] },
      { "hours": "Hour 2-5", "phase": "Medium Priority Build", "focus": "Cover diagrams & 5-mark structures", "topics": ["..."] },
      { "hours": "Hour 5-7", "phase": "Revise 2-Mark Bank", "focus": "Rapid-fire definitions, formulas & short notes", "topics": ["..."] },
      { "hours": "Hour 7-8", "phase": "Sleep + 5 AM Revision", "focus": "Rest brain + quick 20-min morning diagram scan", "topics": ["..."] }
    ],
    "passTargetCount": 5,
    "passLine": "If you finish 5 topics, you can pass"
  },
  "blueprint": [
    {
      "unit": "Unit 1",
      "topics": ["Topic A", "Topic B"],
      "expectedMarks": 15,
      "questionTypes": ["2-mark", "5-mark", "10-mark"]
    }
  ]
}

Rules:
1. Keep every topic from the student's list inside "topics" (and distribute all of them across highPriority/mediumPriority/lowPriority and blueprint units).
2. Ensure timeline has exactly those 4 slots: Hour 0-2, Hour 2-5, Hour 5-7, Hour 7-8.
3. Expected marks across blueprint units should realistically total around 60-75 marks (typical BTech external paper).
4. questionTypes must only contain values from: "2-mark", "5-mark", "10-mark".
5. passLine must follow the exact concise format "If you finish X topics, you can pass".`;

  const raw = await callGeminiJson<RawPlanPayload>(
    params.apiKey,
    systemInstruction,
    userPrompt,
    params.attachments,
  );

  const finalSubject = (raw.subject || params.subject || 'Untitled Subject').trim();
  const finalTopics = dedupeTopics(
    params.topics.length > 0 ? params.topics : raw.topics ?? [],
  );

  if (finalTopics.length === 0) {
    throw new GeminiClientError(
      'Could not find any topics to plan. Please enter a subject along with a comma-separated list of topics.',
      'parse',
    );
  }

  const highPriority = dedupeTopics(raw.roadmap?.highPriority ?? []);
  const mediumPriority = dedupeTopics(raw.roadmap?.mediumPriority ?? []);
  const lowPriority = dedupeTopics(raw.roadmap?.lowPriority ?? []);

  // Ensure every topic appears in at least one priority bucket
  const assigned = new Set(
    [...highPriority, ...mediumPriority, ...lowPriority].map((t) => t.toLowerCase()),
  );
  for (const t of finalTopics) {
    if (!assigned.has(t.toLowerCase())) {
      if (highPriority.length < Math.ceil(finalTopics.length / 2)) {
        highPriority.push(t);
      } else {
        mediumPriority.push(t);
      }
      assigned.add(t.toLowerCase());
    }
  }

  const defaultTimeline = [
    {
      hours: 'Hour 0-2',
      phase: 'High Priority Sprint',
      focus: 'Nail core high-weight topics and 10-mark structures first',
      topics: highPriority,
    },
    {
      hours: 'Hour 2-5',
      phase: 'Medium Priority Build',
      focus: 'Cover medium topics with neat diagrams and 5-mark answers',
      topics: mediumPriority.length > 0 ? mediumPriority : highPriority,
    },
    {
      hours: 'Hour 5-7',
      phase: 'Revise 2-Mark Questions',
      focus: 'Rapid recall of definitions, formulas, and short notes',
      topics: finalTopics.slice(0, 6),
    },
    {
      hours: 'Hour 7-8',
      phase: 'Sleep + 5 AM Revision',
      focus: 'Short sleep cycle followed by 5 AM diagram & keyword scan',
      topics: lowPriority.length > 0 ? lowPriority : highPriority.slice(0, 3),
    },
  ];

  const timeline =
    Array.isArray(raw.roadmap?.timeline) && raw.roadmap.timeline.length >= 4
      ? raw.roadmap.timeline.slice(0, 4).map((slot, idx) => ({
          hours: slot.hours || defaultTimeline[idx].hours,
          phase: slot.phase || defaultTimeline[idx].phase,
          focus: slot.focus || defaultTimeline[idx].focus,
          topics: Array.isArray(slot.topics) && slot.topics.length > 0 ? slot.topics : defaultTimeline[idx].topics,
        }))
      : defaultTimeline;

  const passTargetCount =
    typeof raw.roadmap?.passTargetCount === 'number' && raw.roadmap.passTargetCount > 0
      ? Math.min(finalTopics.length, Math.round(raw.roadmap.passTargetCount))
      : calculatePassTargetCount(finalTopics.length);

  const passLine =
    raw.roadmap?.passLine && raw.roadmap.passLine.trim()
      ? raw.roadmap.passLine.trim()
      : buildPassLineMessage(finalTopics.length);

  const allowedTypes = new Set(['2-mark', '5-mark', '10-mark']);
  const blueprint: BlueprintRow[] =
    Array.isArray(raw.blueprint) && raw.blueprint.length > 0
      ? raw.blueprint.map((row, idx) => {
          const validTypes = (row.questionTypes ?? []).filter((t): t is '2-mark' | '5-mark' | '10-mark' =>
            allowedTypes.has(t),
          );
          return {
            unit: row.unit || `Unit ${idx + 1}`,
            topics: Array.isArray(row.topics) && row.topics.length > 0 ? row.topics : [finalTopics[idx % finalTopics.length]],
            expectedMarks:
              typeof row.expectedMarks === 'number' && row.expectedMarks > 0
                ? Math.round(row.expectedMarks)
                : 15,
            questionTypes: validTypes.length > 0 ? validTypes : ['2-mark', '5-mark', '10-mark'],
          };
        })
      : [
          {
            unit: 'Unit 1',
            topics: finalTopics,
            expectedMarks: 60,
            questionTypes: ['2-mark', '5-mark', '10-mark'],
          },
        ];

  return {
    subject: finalSubject,
    topics: finalTopics,
    roadmap: {
      totalTopics: finalTopics.length,
      totalTime: '8 Hours',
      highPriority,
      mediumPriority,
      lowPriority,
      timeline,
      passLine,
      passTargetCount,
    },
    blueprint,
  };
}

interface RawExamKitPayload {
  understandIn5Mins?: string[];
  twoMarkAnswer?: string[];
  fiveMarkAnswer?: string[];
  tenMarkAnswer?: {
    intro?: string;
    steps?: string[];
    conclusion?: string;
  };
  diagram?: DiagramSpec;
  realLifeExample?: {
    title?: string;
    analogy?: string;
    connection?: string;
  };
}

export async function generateTopicExamKit(params: {
  apiKey: string;
  subject: string;
  topic: string;
  allTopics: string[];
  theme: string;
}): Promise<ExamKitData> {
  const themeStyle = params.theme
    ? `Follow this exact student-chosen theme/voice for explanations: "${params.theme}".`
    : 'For "understandIn5Mins", explain in friendly, natural simple English + Telugu mix (Tenglish in Latin script, e.g., "Bro simple ga cheppali ante...") just like a helpful BTech hostel senior explaining the night before exams. Keep 2-Mark, 5-Mark, and 10-Mark answers in clean, formal, directly exam-writable English.';

  const systemInstruction = [
    'You are a top-scoring Indian BTech senior helping a junior prepare a complete exam kit for a single topic the night before exams.',
    themeStyle,
    'Return ONLY valid JSON matching the exact schema.',
  ].join(' ');

  const userPrompt = `Subject: ${params.subject}
Target Topic: ${params.topic}
Other topics in this subject (for context): ${params.allTopics.join(', ')}

Return a JSON object with this exact structure:
{
  "understandIn5Mins": [
    "Paragraph/bullet 1 explaining the intuition clearly",
    "Paragraph/bullet 2 breaking down how it actually works",
    "Paragraph/bullet 3 highlighting the #1 exam shortcut to remember"
  ],
  "twoMarkAnswer": [
    "Line 1: Crisp formal definition.",
    "Line 2: Core mechanism or formula.",
    "Line 3: Primary advantage or use-case."
  ],
  "fiveMarkAnswer": [
    "Line 1",
    "Line 2",
    "Line 3",
    "Line 4",
    "Line 5",
    "Line 6",
    "Line 7",
    "Line 8",
    "Line 9",
    "Line 10"
  ],
  "tenMarkAnswer": {
    "intro": "Clear 3-4 sentence exam-writable introduction defining the concept and its significance.",
    "steps": [
      "Step 1 / Component 1 with detailed explanation",
      "Step 2 / Component 2 with detailed explanation",
      "Step 3 / Component 3 with detailed explanation",
      "Step 4 / Component 4 with detailed explanation",
      "Step 5 / Advantages, limitations, or complexity analysis"
    ],
    "conclusion": "Concise 2-3 sentence exam-writable conclusion summarizing impact and real-world relevance."
  },
  "diagram": {
    "title": "Clean exam diagram title for ${params.topic}",
    "caption": "Short tip on what labels earn full marks when drawing this in exam",
    "nodes": [
      { "id": "n1", "label": "Start / Input Block", "sublabel": "Short note", "kind": "start" },
      { "id": "n2", "label": "Core Stage 1", "sublabel": "Short note", "kind": "process" },
      { "id": "n3", "label": "Decision / Check", "sublabel": "Short note", "kind": "decision" },
      { "id": "n4", "label": "Core Stage 2", "sublabel": "Short note", "kind": "io" },
      { "id": "n5", "label": "Final Output", "sublabel": "Short note", "kind": "end" }
    ],
    "edges": [
      { "from": "n1", "to": "n2", "label": "flow" },
      { "from": "n2", "to": "n3" },
      { "from": "n3", "to": "n4", "label": "valid" },
      { "from": "n4", "to": "n5" }
    ]
  },
  "realLifeExample": {
    "title": "Relatable Indian everyday tech example (e.g., WhatsApp, UPI, OTP, IRCTC, Swiggy)",
    "analogy": "2-3 clear sentences mapping the real-life scenario to ${params.topic}.",
    "connection": "1 crisp sentence showing how to mention this example in the exam for extra marks."
  }
}

Strict rules:
- twoMarkAnswer MUST have exactly 3 crisp exam-writable lines.
- fiveMarkAnswer MUST have 10 structured exam-writable lines/points.
- diagram MUST have 4 to 6 clean, short-labeled nodes (max 24 chars per label) with valid edge connections referencing those node IDs.`;

  const raw = await callGeminiJson<RawExamKitPayload>(params.apiKey, systemInstruction, userPrompt);

  return {
    topic: params.topic,
    subject: params.subject,
    understandIn5Mins:
      Array.isArray(raw.understandIn5Mins) && raw.understandIn5Mins.length > 0
        ? raw.understandIn5Mins
        : ['Focus on the core definition, block flow, and key advantage of this concept.'],
    twoMarkAnswer:
      Array.isArray(raw.twoMarkAnswer) && raw.twoMarkAnswer.length > 0
        ? raw.twoMarkAnswer.slice(0, 4)
        : ['No 2-mark answer returned. Click Regenerate to retry.'],
    fiveMarkAnswer:
      Array.isArray(raw.fiveMarkAnswer) && raw.fiveMarkAnswer.length > 0
        ? raw.fiveMarkAnswer
        : ['No 5-mark answer returned. Click Regenerate to retry.'],
    tenMarkAnswer: {
      intro: raw.tenMarkAnswer?.intro || '',
      steps: Array.isArray(raw.tenMarkAnswer?.steps) ? raw.tenMarkAnswer.steps : [],
      conclusion: raw.tenMarkAnswer?.conclusion || '',
    },
    diagram: {
      title: raw.diagram?.title || `${params.topic} Architecture Flow`,
      caption: raw.diagram?.caption || 'Draw neat boxes and labeled arrows in your answer booklet.',
      nodes: Array.isArray(raw.diagram?.nodes) ? raw.diagram.nodes : [],
      edges: Array.isArray(raw.diagram?.edges) ? raw.diagram.edges : [],
    },
    realLifeExample: {
      title: raw.realLifeExample?.title || 'Everyday Tech Example',
      analogy: raw.realLifeExample?.analogy || '',
      connection: raw.realLifeExample?.connection || '',
    },
    generatedAt: new Date().toISOString(),
  };
}
