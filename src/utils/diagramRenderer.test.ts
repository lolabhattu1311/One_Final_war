import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiagramSvg, escapeXml } from './diagramRenderer';

test('escapeXml escapes special XML characters', () => {
  assert.equal(escapeXml('<script>&"test"</script>'), '&lt;script&gt;&amp;&quot;test&quot;&lt;/script&gt;');
});

test('buildDiagramSvg creates valid SVG with escaped labels and edges', () => {
  const svg = buildDiagramSvg({
    title: 'Deadlock Detection & Recovery',
    caption: 'Draw arrows cleanly in exam',
    nodes: [
      { id: 'a', label: 'Process Request', kind: 'start' },
      { id: 'b', label: 'Resource Available?', kind: 'decision' },
      { id: 'c', label: 'Allocate Resource', kind: 'process' },
      { id: 'd', label: 'Wait Queue', kind: 'end' },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c', label: 'Yes' },
      { from: 'b', to: 'd', label: 'No' },
    ],
  });

  assert.ok(svg.startsWith('<svg '));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('Deadlock Detection &amp; Recovery'));
  assert.ok(svg.includes('Process Request'));
  assert.ok(svg.includes('Yes'));
  assert.ok(svg.includes('No'));
  assert.ok(!svg.includes('NaN'));
});

test('buildDiagramSvg safely handles empty nodes with fallback blocks', () => {
  const svg = buildDiagramSvg({
    title: 'Paging Flow',
    caption: 'Simple flow',
    nodes: [],
    edges: [],
  });
  assert.ok(svg.startsWith('<svg '));
  assert.ok(svg.includes('Paging Flow'));
  assert.ok(!svg.includes('NaN'));
});
