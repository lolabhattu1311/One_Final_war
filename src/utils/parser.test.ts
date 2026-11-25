import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPassLineMessage,
  calculatePassTargetCount,
  dedupeTopics,
  maskApiKey,
  parseSubjectAndTopics,
  summarizeBlueprintMarks,
} from './parser';

test('maskApiKey reveals only last 4 characters and hides prefix', () => {
  assert.equal(maskApiKey('AIzaSyFakeKey9876Ab12'), '••••••••...Ab12');
  assert.equal(maskApiKey('  12345678  '), '••••••••...5678');
  assert.equal(maskApiKey('abc'), '••••••••...••••');
  assert.equal(maskApiKey(''), '');
});

test('parseSubjectAndTopics handles explicit Subject and Topics format', () => {
  const result = parseSubjectAndTopics(
    'Subject: Operating Systems, Topics: Deadlocks, Paging, CPU Scheduling, Semaphores',
  );
  assert.equal(result.subject, 'Operating Systems');
  assert.deepEqual(result.topics, ['Deadlocks', 'Paging', 'CPU Scheduling', 'Semaphores']);
});

test('parseSubjectAndTopics handles colon and dash formats', () => {
  const colonRes = parseSubjectAndTopics('DBMS: Normalization, B+ Trees, ACID Properties');
  assert.equal(colonRes.subject, 'DBMS');
  assert.deepEqual(colonRes.topics, ['Normalization', 'B+ Trees', 'ACID Properties']);

  const dashRes = parseSubjectAndTopics('Compiler Design - Lexical Analysis, LL(1) Parser, TAC');
  assert.equal(dashRes.subject, 'Compiler Design');
  assert.deepEqual(dashRes.topics, ['Lexical Analysis', 'LL(1) Parser', 'TAC']);
});

test('parseSubjectAndTopics handles multiline input and deduplicates topics', () => {
  const res = parseSubjectAndTopics('Computer Organization\n1. Pipelining\n2. Cache Memory\n3. pipelining');
  assert.equal(res.subject, 'Computer Organization');
  assert.deepEqual(res.topics, ['Pipelining', 'Cache Memory']);
});

test('parseSubjectAndTopics handles empty input cleanly', () => {
  const res = parseSubjectAndTopics('   ');
  assert.equal(res.subject, '');
  assert.deepEqual(res.topics, []);
});

test('dedupeTopics strips list bullets and removes case-insensitive duplicates', () => {
  assert.deepEqual(dedupeTopics(['- Paging', '1. Deadlocks', 'paging', '• Thrashing']), [
    'Paging',
    'Deadlocks',
    'Thrashing',
  ]);
});

test('calculatePassTargetCount and buildPassLineMessage scale sensibly', () => {
  assert.equal(calculatePassTargetCount(0), 0);
  assert.equal(calculatePassTargetCount(2), 2);
  assert.equal(calculatePassTargetCount(8), 5);
  assert.equal(buildPassLineMessage(8), 'If you finish 5 topics, you can pass');
});

test('summarizeBlueprintMarks totals expected marks across units and question types', () => {
  const summary = summarizeBlueprintMarks([
    { unit: 'Unit 1', topics: ['A', 'B'], expectedMarks: 17, questionTypes: ['2-mark', '5-mark', '10-mark'] },
    { unit: 'Unit 2', topics: ['C'], expectedMarks: 10, questionTypes: ['10-mark'] },
  ]);
  assert.equal(summary.totalMarks, 27);
  assert.equal(
    summary.byQuestionType['2-mark'] +
      summary.byQuestionType['5-mark'] +
      summary.byQuestionType['10-mark'],
    27,
  );
  assert.equal(summary.byQuestionType['10-mark'], 20);
});
