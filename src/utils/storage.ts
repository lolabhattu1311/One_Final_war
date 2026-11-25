import type { AiConfig } from '../services/aiClient';
import { isValidProvider } from '../services/aiClient';
import type { SavedDiagram, StudySession } from '../types/study';

const STORAGE_KEYS = {
  AI_CONFIG: 'night_before_ai_config_v1',
  LEGACY_API_KEY: 'night_before_gemini_key_v1',
  SESSION: 'night_before_session_v1',
  MEDIA: 'night_before_media_v1',
  THEME: 'night_before_theme_v1',
} as const;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota errors cleanly
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors cleanly
  }
}

export function loadAiConfig(): AiConfig | null {
  const raw = safeGet(STORAGE_KEYS.AI_CONFIG);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<AiConfig>;
      if (
        parsed &&
        isValidProvider(parsed.provider) &&
        typeof parsed.apiKey === 'string' &&
        parsed.apiKey.trim().length > 0
      ) {
        return { provider: parsed.provider, apiKey: parsed.apiKey.trim() };
      }
    } catch {
      // Ignore malformed stored JSON
    }
  }

  // Graceful fallback migration from legacy single-key storage
  const legacyKey = safeGet(STORAGE_KEYS.LEGACY_API_KEY)?.trim();
  if (legacyKey) {
    return { provider: 'gemini', apiKey: legacyKey };
  }

  return null;
}

export function saveAiConfig(config: AiConfig): void {
  const normalized: AiConfig = {
    provider: config.provider,
    apiKey: config.apiKey.trim(),
  };
  safeSet(STORAGE_KEYS.AI_CONFIG, JSON.stringify(normalized));
  safeRemove(STORAGE_KEYS.LEGACY_API_KEY);
}

export function clearAiConfig(): void {
  safeRemove(STORAGE_KEYS.AI_CONFIG);
  safeRemove(STORAGE_KEYS.LEGACY_API_KEY);
}

export function loadTheme(): string {
  return safeGet(STORAGE_KEYS.THEME) ?? '';
}

export function saveTheme(theme: string): void {
  const cleaned = theme.trim();
  if (!cleaned) {
    safeRemove(STORAGE_KEYS.THEME);
    return;
  }
  safeSet(STORAGE_KEYS.THEME, cleaned);
}

export function loadSession(): StudySession | null {
  const raw = safeGet(STORAGE_KEYS.SESSION);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StudySession;
    if (!parsed || typeof parsed.subject !== 'string' || !Array.isArray(parsed.topics)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: StudySession | null): void {
  if (!session) {
    safeRemove(STORAGE_KEYS.SESSION);
    return;
  }
  safeSet(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

export function loadSavedDiagrams(): SavedDiagram[] {
  const raw = safeGet(STORAGE_KEYS.MEDIA);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavedDiagram[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDiagrams(diagrams: SavedDiagram[]): void {
  safeSet(STORAGE_KEYS.MEDIA, JSON.stringify(diagrams));
}
