import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_PROVIDERS,
  BUSY_PROVIDER_MESSAGE,
  buildProviderRequest,
  classifyProviderError,
  extractJsonObject,
  extractResponseText,
} from './aiClient';

test('buildProviderRequest targets exact endpoint and model for Gemini', () => {
  const req = buildProviderRequest({
    config: { provider: 'gemini', apiKey: 'AIzaTestKey1234' },
    systemInstruction: 'Be helpful',
    userPrompt: 'Plan OS',
  });
  assert.equal(
    req.url,
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
  );
  assert.equal(req.headers['x-goog-api-key'], 'AIzaTestKey1234');
});

test('buildProviderRequest targets exact endpoint and model for Groq', () => {
  const req = buildProviderRequest({
    config: { provider: 'groq', apiKey: 'gsk_test_1234' },
    systemInstruction: 'Be helpful',
    userPrompt: 'Plan OS',
  });
  assert.equal(req.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(req.headers.Authorization, 'Bearer gsk_test_1234');
  assert.equal(req.body.model, 'llama-3.3-70b-versatile');
});

test('buildProviderRequest targets exact endpoint and model for OpenAI', () => {
  const req = buildProviderRequest({
    config: { provider: 'openai', apiKey: 'sk-test-1234' },
    systemInstruction: 'Be helpful',
    userPrompt: 'Plan OS',
  });
  assert.equal(req.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(req.headers.Authorization, 'Bearer sk-test-1234');
  assert.equal(req.body.model, 'gpt-4o-mini');
});

test('buildProviderRequest targets exact endpoint and model for OpenRouter', () => {
  const req = buildProviderRequest({
    config: { provider: 'openrouter', apiKey: 'sk-or-test-1234' },
    systemInstruction: 'Be helpful',
    userPrompt: 'Plan OS',
    origin: 'https://example.app',
  });
  assert.equal(req.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(req.headers.Authorization, 'Bearer sk-or-test-1234');
  assert.equal(req.headers['HTTP-Referer'], 'https://example.app');
  assert.equal(req.body.model, 'meta-llama/llama-3.3-70b-instruct:free');
});

test('provider help texts match exact specifications', () => {
  assert.equal(AI_PROVIDERS.gemini.helpText, 'Get free key from aistudio.google.com');
  assert.equal(AI_PROVIDERS.groq.helpText, 'Get free key from console.groq.com');
  assert.equal(AI_PROVIDERS.openai.helpText, 'Get key from platform.openai.com');
  assert.equal(AI_PROVIDERS.openrouter.helpText, 'Get free key from openrouter.ai');
});

test('extractResponseText parses Gemini and OpenAI-compatible formats', () => {
  assert.equal(
    extractResponseText('gemini', {
      candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
    }),
    '{"ok":true}',
  );
  assert.equal(
    extractResponseText('groq', {
      choices: [{ message: { content: '{"ok":true}' } }],
    }),
    '{"ok":true}',
  );
});

test('classifyProviderError returns exact busy message for high demand / 429 / 503', () => {
  const rateLimitErr = classifyProviderError('groq', 429, {
    error: { message: 'Rate limit exceeded' },
  });
  assert.equal(rateLimitErr.kind, 'busy');
  assert.equal(rateLimitErr.message, BUSY_PROVIDER_MESSAGE);
  assert.equal(rateLimitErr.message, 'This AI is busy, try another provider from Add API');

  const overloadedErr = classifyProviderError('gemini', 503, {
    error: { message: 'Model overloaded' },
  });
  assert.equal(overloadedErr.kind, 'busy');
  assert.equal(overloadedErr.message, 'This AI is busy, try another provider from Add API');

  const authErr = classifyProviderError('openai', 401, {
    error: { message: 'Incorrect API key provided' },
  });
  assert.equal(authErr.kind, 'invalid_key');
});

test('extractJsonObject strips markdown code fences cleanly', () => {
  const parsed = extractJsonObject<{ subject: string }>('```json\n{"subject":"DBMS"}\n```');
  assert.equal(parsed.subject, 'DBMS');
});
