import type {
  BlueprintRow,
  DiagramSpec,
  ExamKitData,
  RoadmapData,
  UploadedAttachment,
} from '../types/study';
import { buildPassLineMessage, calculatePassTargetCount, dedupeTopics } from '../utils/parser';

export type AiProvider = 'gemini' | 'groq' | 'openai' | 'openrouter';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
}

export interface ProviderMeta {
  id: AiProvider;
  label: string;
  shortName: string;
  helpText: string;
  helpUrl: string;
  endpoint: string;
  model: string;
}

export const AI_PROVIDERS: Record<AiProvider, ProviderMeta> = {
  gemini: {
    id: 'gemini',
    label: 'Gemini (Google)',
    shortName: 'Gemini',
    helpText: 'Get free key from aistudio.google.com',
    helpUrl: 'https://aistudio.google.com/apikey',
    endpoint:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
    model: 'gemini-3.8-flash',
  },
  groq: {
    id: 'groq',
    label: 'Groq (Llama)',
    shortName: 'Groq',
    helpText: 'Get free key from console.groq.com',
    helpUrl: 'https://console.groq.com/keys',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: "openai/gpt-oss-120b",
  },
  openai: {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    shortName: 'OpenAI',
    helpText: 'Get key from platform.openai.com',
    helpUrl: 'https://platform.openai.com/api-keys',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter (Free Models)',
    shortName: 'OpenRouter',
    helpText: 'Get free key from openrouter.ai',
    helpUrl: 'https://openrouter.ai/keys',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
  },
};

export const AI_PROVIDER_LIST: ProviderMeta[] = [
  AI_PROVIDERS.gemini,
  AI_PROVIDERS.groq,
  AI_PROVIDERS.openai,
  AI_PROVIDERS.openrouter,
];

export const BUSY_PROVIDER_MESSAGE = 'This AI is busy, try another provider from Add API';

export type AiErrorKind = 'missing_key' | 'invalid_key' | 'busy' | 'parse';

export class AiClientError extends Error {
  kind: AiErrorKind;

  constructor(message: string, kind: AiErrorKind) {
    super(message);
    this.name = 'AiClientError';
    this.kind = kind;
  }
}

export function isValidProvider(value: unknown): value is AiProvider {
  return value === 'gemini' || value === 'groq' || value === 'openai' || value === 'openrouter';
}

interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface OpenAiContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface BuiltProviderRequest {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

function buildGeminiAttachmentParts(attachments: UploadedAttachment[]): GeminiPart[] {
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

function buildOpenAiUserContent(
  provider: AiProvider,
  userPrompt: string,
  attachments: UploadedAttachment[],
): string | OpenAiContentPart[] {
  const textSections: string[] = [userPrompt];
  const imageParts: OpenAiContentPart[] = [];

  for (const file of attachments) {
    if (file.textContent) {
      textSections.push(`Attached file (${file.name}):\n${file.textContent.slice(0, 12000)}`);
    } else if (file.base64Data && file.mimeType.startsWith('image/') && provider === 'openai') {
      imageParts.push({
        type: 'image_url',
        image_url: { url: `data:${file.mimeType};base64,${file.base64Data}` },
      });
    } else {
      textSections.push(`Attached file name: ${file.name} (${file.mimeType || 'file'})`);
    }
  }

  const combinedText = textSections.join('\n\n');
  if (imageParts.length > 0) {
    return [{ type: 'text', text: combinedText }, ...imageParts];
  }
  return combinedText;
}

/**
 * Pure request builder for all supported AI providers.
 */
export function buildProviderRequest(params: {
  config: AiConfig;
  systemInstruction: string;
  userPrompt: string;
  attachments?: UploadedAttachment[];
  origin?: string;
}): BuiltProviderRequest {
  const meta = AI_PROVIDERS[params.config.provider];
  const cleanKey = params.config.apiKey.trim();
  const attachments = params.attachments ?? [];

  if (params.config.provider === 'gemini') {
    const parts: GeminiPart[] = [
      { text: params.userPrompt },
      ...buildGeminiAttachmentParts(attachments),
    ];
    return {
      url: meta.endpoint,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanKey,
      },
      body: {
        system_instruction: {
          parts: [{ text: params.systemInstruction }],
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
      },
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cleanKey}`,
  };

  if (params.config.provider === 'openrouter') {
    headers['HTTP-Referer'] = params.origin || 'http://localhost:3000';
    headers['X-Title'] = 'Night Before';
  }

  const userContent = buildOpenAiUserContent(
    params.config.provider,
    params.userPrompt,
    attachments,
  );

  const body: Record<string, unknown> = {
    model: meta.model,
    temperature: 0.4,
    messages: [
      { role: 'system', content: params.systemInstruction },
      { role: 'user', content: userContent },
    ],
  };

  if (params.config.provider === 'openai' || params.config.provider === 'groq') {
    body.response_format = { type: 'json_object' };
  }

  return {
    url: meta.endpoint,
    headers,
    body,
  };
}

/**
 * Pure response text extractor across Gemini and OpenAI-compatible payloads.
 */
export function extractResponseText(provider: AiProvider, payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as Record<string, unknown>;

  if (provider === 'gemini') {
    const candidates = data.candidates as
      | Array<{ content?: { parts?: Array<{ text?: string }> } }>
      | undefined;
    return (
      candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('')
        .trim() ?? ''
    );
  }

  const choices = data.choices as
    | Array<{ message?: { content?: string | Array<{ text?: string }> } }>
    | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
  }
  return '';
}

/**
 * Classifies HTTP/API failures cleanly. Any high-demand, rate-limit, server,
 * or transient provider failure returns the exact user-friendly busy message.
 */
export function classifyProviderError(
  provider: AiProvider,
  status: number,
  payload: unknown,
): AiClientError {
  const errObj =
    payload && typeof payload === 'object' && 'error' in payload
      ? ((payload as { error?: { message?: string; status?: string; code?: string | number } })
          .error ?? {})
      : {};

  const combinedMsg = `${errObj.message ?? ''} ${errObj.status ?? ''} ${errObj.code ?? ''}`;

  const isAuthError =
    status === 401 ||
    status === 403 ||
    /API_KEY_INVALID|API key not valid|invalid_api_key|Incorrect API key|PERMISSION_DENIED|Unauthorized/i.test(
      combinedMsg,
    );

  if (isAuthError) {
    return new AiClientError(
      `Invalid API key for ${AI_PROVIDERS[provider].label}. Open "Add API" to update your key or switch provider.`,
      'invalid_key',
    );
  }

  // Rate limits (429), high demand, server 5xx, model unavailable, or other upstream failures
  return new AiClientError(BUSY_PROVIDER_MESSAGE, 'busy');
}

export function extractJsonObject<T>(rawText: string): T {
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
    throw new AiClientError(BUSY_PROVIDER_MESSAGE, 'parse');
  }
}

async function callProviderJson<T>(
  config: AiConfig,
  systemInstruction: string,
  userPrompt: string,
  attachments: UploadedAttachment[] = [],
): Promise<T> {
  const cleanKey = config.apiKey.trim();
  if (!cleanKey) {
    throw new AiClientError(
      'Please connect your AI API key using the "Add API" button in the sidebar first.',
      'missing_key',
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const built = buildProviderRequest({
    config: { provider: config.provider, apiKey: cleanKey },
    systemInstruction,
    userPrompt,
    attachments,
    origin,
  });

  let response: Response;
  try {
    response = await fetch(built.url, {
      method: 'POST',
      headers: built.headers,
      body: JSON.stringify(built.body),
    });
  } catch {
    throw new AiClientError(BUSY_PROVIDER_MESSAGE, 'busy');
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw classifyProviderError(config.provider, response.status, data);
  }

  const text = extractResponseText(config.provider, data);
  if (!text) {
    throw new AiClientError(BUSY_PROVIDER_MESSAGE, 'busy');
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
  config: AiConfig;
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
    'Return ONLY valid JSON matching the requested schema with no markdown commentary outside the JSON object.',
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

  const raw = await callProviderJson<RawPlanPayload>(
    params.config,
    systemInstruction,
    userPrompt,
    params.attachments,
  );

  const finalSubject = (raw.subject || params.subject || 'Untitled Subject').trim();
  const finalTopics = dedupeTopics(
    params.topics.length > 0 ? params.topics : raw.topics ?? [],
  );

  if (finalTopics.length === 0) {
    throw new AiClientError(
      'Could not find any topics to plan. Please enter a subject along with a comma-separated list of topics.',
      'parse',
    );
  }

  const highPriority = dedupeTopics(raw.roadmap?.highPriority ?? []);
  const mediumPriority = dedupeTopics(raw.roadmap?.mediumPriority ?? []);
  const lowPriority = dedupeTopics(raw.roadmap?.lowPriority ?? []);

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
          topics:
            Array.isArray(slot.topics) && slot.topics.length > 0
              ? slot.topics
              : defaultTimeline[idx].topics,
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
          const validTypes = (row.questionTypes ?? []).filter(
            (t): t is '2-mark' | '5-mark' | '10-mark' => allowedTypes.has(t),
          );
          return {
            unit: row.unit || `Unit ${idx + 1}`,
            topics:
              Array.isArray(row.topics) && row.topics.length > 0
                ? row.topics
                : [finalTopics[idx % finalTopics.length]],
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
  config: AiConfig;
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
    'Return ONLY valid JSON matching the exact schema with no extra text outside the JSON.',
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
      { "from": "n1", to: "n2", "label": "flow" },
      { "from": "n2", to: "n3" },
      { "from": "n3", to: "n4", "label": "valid" },
      { "from": "n4", to: "n5" }
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

  const raw = await callProviderJson<RawExamKitPayload>(
    params.config,
    systemInstruction,
    userPrompt,
  );

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
