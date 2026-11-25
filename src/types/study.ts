export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface UploadedAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  textContent?: string;
  base64Data?: string;
}

export interface TimelineSlot {
  hours: string;
  phase: string;
  focus: string;
  topics: string[];
}

export interface RoadmapData {
  totalTopics: number;
  totalTime: string;
  highPriority: string[];
  mediumPriority: string[];
  lowPriority: string[];
  timeline: TimelineSlot[];
  passLine: string;
  passTargetCount: number;
}

export interface BlueprintRow {
  unit: string;
  topics: string[];
  expectedMarks: number;
  questionTypes: Array<'2-mark' | '5-mark' | '10-mark'>;
}

export interface DiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  kind?: 'start' | 'process' | 'decision' | 'io' | 'end';
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramSpec {
  title: string;
  caption: string;
  layout?: 'vertical' | 'horizontal';
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface ExamKitData {
  topic: string;
  subject: string;
  understandIn5Mins: string[];
  twoMarkAnswer: string[];
  fiveMarkAnswer: string[];
  tenMarkAnswer: {
    intro: string;
    steps: string[];
    conclusion: string;
  };
  diagram: DiagramSpec;
  realLifeExample: {
    title: string;
    analogy: string;
    connection: string;
  };
  generatedAt: string;
}

export interface SavedDiagram {
  id: string;
  subject: string;
  topic: string;
  title: string;
  caption: string;
  svgMarkup: string;
  createdAt: string;
}

export interface StudySession {
  subject: string;
  topics: string[];
  roadmap: RoadmapData;
  blueprint: BlueprintRow[];
  examKits: Record<string, ExamKitData>;
  createdAt: string;
}

export type AppView = 'welcome' | 'overview' | 'topic' | 'media';

export type ThemePresetLabel = 'Discover' | 'Ask anything' | 'Take action' | 'Create images';
