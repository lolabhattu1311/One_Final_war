import type { DiagramNode, DiagramSpec } from '../types/study';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
      if (lines.length === maxLines - 1) {
        break;
      }
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines.slice(0, maxLines);
}

interface PositionedNode {
  node: DiagramNode;
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

/**
 * Deterministically renders a clean, exam-drawable dark-theme vector SVG flowchart
 * from a structured DiagramSpec. Guarantees crisp typography, zero broken layouts,
 * and strict XML escaping.
 */
export function buildDiagramSvg(spec: DiagramSpec): string {
  const safeNodes: DiagramNode[] =
    spec.nodes && spec.nodes.length > 0
      ? spec.nodes.slice(0, 8)
      : [
          { id: 'n1', label: spec.title || 'Concept Input', kind: 'start' },
          { id: 'n2', label: 'Core Mechanism', kind: 'process' },
          { id: 'n3', label: 'Exam Output', kind: 'end' },
        ];

  const nodeIds = new Set(safeNodes.map((n) => n.id));
  const rawEdges = (spec.edges || []).filter(
    (e) => nodeIds.has(e.from) && nodeIds.has(e.to) && e.from !== e.to,
  );

  // If no valid edges were supplied, chain nodes sequentially
  const safeEdges =
    rawEdges.length > 0
      ? rawEdges
      : safeNodes.slice(0, -1).map((node, idx) => ({
          from: node.id,
          to: safeNodes[idx + 1].id,
          label: '',
        }));

  // Compute topological depth (BFS from roots) so branching diagrams lay out cleanly
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  safeNodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  });

  safeEdges.forEach((edge) => {
    adjacency.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  });

  const levelMap = new Map<string, number>();
  const queue: string[] = [];
  safeNodes.forEach((n) => {
    if ((inDegree.get(n.id) ?? 0) === 0) {
      levelMap.set(n.id, 0);
      queue.push(n.id);
    }
  });

  if (queue.length === 0) {
    levelMap.set(safeNodes[0].id, 0);
    queue.push(safeNodes[0].id);
  }

  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor++];
    const currentLevel = levelMap.get(current) ?? 0;
    const neighbors = adjacency.get(current) ?? [];
    for (const next of neighbors) {
      if (!levelMap.has(next)) {
        levelMap.set(next, currentLevel + 1);
        queue.push(next);
      }
    }
  }

  // Assign any disconnected nodes sequentially after the max level
  let maxLevel = 0;
  levelMap.forEach((lvl) => {
    if (lvl > maxLevel) maxLevel = lvl;
  });
  safeNodes.forEach((n) => {
    if (!levelMap.has(n.id)) {
      maxLevel += 1;
      levelMap.set(n.id, maxLevel);
    }
  });

  // Group nodes by level
  const levels = new Map<number, DiagramNode[]>();
  safeNodes.forEach((n) => {
    const lvl = levelMap.get(n.id) ?? 0;
    const bucket = levels.get(lvl) ?? [];
    bucket.push(n);
    levels.set(lvl, bucket);
  });

  const sortedLevelKeys = Array.from(levels.keys()).sort((a, b) => a - b);
  const maxNodesPerLevel = Math.max(
    1,
    ...sortedLevelKeys.map((lvl) => (levels.get(lvl) ?? []).length),
  );

  const nodeW = 220;
  const nodeH = 66;
  const gapX = 48;
  const gapY = 54;
  const padX = 44;
  const headerH = 56;
  const footerH = 38;

  const contentWidth = maxNodesPerLevel * nodeW + Math.max(0, maxNodesPerLevel - 1) * gapX;
  const svgWidth = Math.max(580, contentWidth + padX * 2);
  const svgHeight =
    headerH +
    sortedLevelKeys.length * nodeH +
    Math.max(0, sortedLevelKeys.length - 1) * gapY +
    footerH +
    28;

  const positioned = new Map<string, PositionedNode>();

  sortedLevelKeys.forEach((lvl, rowIdx) => {
    const rowNodes = levels.get(lvl) ?? [];
    const rowWidth = rowNodes.length * nodeW + Math.max(0, rowNodes.length - 1) * gapX;
    const startX = (svgWidth - rowWidth) / 2;
    const y = headerH + rowIdx * (nodeH + gapY);

    rowNodes.forEach((node, colIdx) => {
      const x = startX + colIdx * (nodeW + gapX);
      positioned.set(node.id, {
        node,
        x,
        y,
        width: nodeW,
        height: nodeH,
        cx: x + nodeW / 2,
        cy: y + nodeH / 2,
      });
    });
  });

  const strokeForKind = (kind?: DiagramNode['kind']): { stroke: string; fill: string; rx: number } => {
    switch (kind) {
      case 'start':
        return { stroke: '#3b82f6', fill: '#101b2e', rx: 28 };
      case 'end':
        return { stroke: '#10b981', fill: '#0e211c', rx: 28 };
      case 'decision':
        return { stroke: '#f59e0b', fill: '#221c10', rx: 10 };
      case 'io':
        return { stroke: '#38bdf8', fill: '#10202b', rx: 14 };
      default:
        return { stroke: '#3f3f46', fill: '#18181b', rx: 12 };
    }
  };

  const edgeParts: string[] = [];
  for (const edge of safeEdges) {
    const src = positioned.get(edge.from);
    const dst = positioned.get(edge.to);
    if (!src || !dst) continue;

    let pathD = '';
    let labelX = (src.cx + dst.cx) / 2;
    let labelY = (src.cy + dst.cy) / 2;

    if (dst.y > src.y) {
      const x1 = src.cx;
      const y1 = src.y + src.height;
      const x2 = dst.cx;
      const y2 = dst.y;
      const midY = (y1 + y2) / 2;
      pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2 - 3}`;
      labelX = (x1 + x2) / 2;
      labelY = midY - 4;
    } else if (dst.y === src.y) {
      const leftToRight = dst.x > src.x;
      const x1 = leftToRight ? src.x + src.width : src.x;
      const x2 = leftToRight ? dst.x - 3 : dst.x + dst.width + 3;
      const y = src.cy;
      pathD = `M ${x1} ${y} L ${x2} ${y}`;
      labelX = (x1 + x2) / 2;
      labelY = y - 8;
    } else {
      // Back-edge routed cleanly along the right gutter
      const gutterX = Math.max(src.x + src.width, dst.x + dst.width) + 26;
      const x1 = src.x + src.width;
      const y1 = src.cy;
      const x2 = dst.x + dst.width + 3;
      const y2 = dst.cy;
      pathD = `M ${x1} ${y1} L ${gutterX} ${y1} L ${gutterX} ${y2} L ${x2} ${y2}`;
      labelX = gutterX - 8;
      labelY = (y1 + y2) / 2;
    }

    edgeParts.push(
      `<path d="${pathD}" fill="none" stroke="#60a5fa" stroke-width="1.75" stroke-opacity="0.85" marker-end="url(#arrow-head)" />`,
    );

    if (edge.label && edge.label.trim()) {
      const cleanEdgeLabel = escapeXml(edge.label.trim().slice(0, 22));
      const pillW = Math.max(44, cleanEdgeLabel.length * 6.8 + 14);
      edgeParts.push(
        `<g>` +
          `<rect x="${(labelX - pillW / 2).toFixed(1)}" y="${(labelY - 10).toFixed(1)}" width="${pillW.toFixed(1)}" height="18" rx="4" fill="#0d0d10" stroke="#27272a" stroke-width="1" />` +
          `<text x="${labelX.toFixed(1)}" y="${(labelY + 2.5).toFixed(1)}" text-anchor="middle" fill="#cbd5e1" font-family="DM Sans, sans-serif" font-size="10.5" font-weight="500">${cleanEdgeLabel}</text>` +
          `</g>`,
      );
    }
  }

  const nodeParts: string[] = [];
  positioned.forEach((p) => {
    const style = strokeForKind(p.node.kind);
    const titleLines = wrapText(p.node.label, 24, 2);
    const sublabel = p.node.sublabel ? wrapText(p.node.sublabel, 28, 1)[0] : '';

    const hasSub = Boolean(sublabel);
    const firstLineY =
      titleLines.length === 1
        ? hasSub
          ? p.y + 28
          : p.y + 38
        : hasSub
          ? p.y + 22
          : p.y + 28;

    const textSpans = titleLines
      .map(
        (line, idx) =>
          `<text x="${p.cx}" y="${firstLineY + idx * 16}" text-anchor="middle" fill="#f4f4f5" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="600">${escapeXml(line)}</text>`,
      )
      .join('');

    const subSpan = hasSub
      ? `<text x="${p.cx}" y="${p.y + p.height - 13}" text-anchor="middle" fill="#a1a1aa" font-family="DM Sans, sans-serif" font-size="11">${escapeXml(sublabel)}</text>`
      : '';

    nodeParts.push(
      `<g>` +
        `<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="${style.rx}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="1.5" />` +
        textSpans +
        subSpan +
        `</g>`,
    );
  });

  const safeTitle = escapeXml((spec.title || 'Exam Diagram').slice(0, 72));
  const safeCaption = escapeXml((spec.caption || 'Draw and label each block cleanly in your answer sheet').slice(0, 96));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="auto" role="img" aria-label="${safeTitle}">`,
    `<defs>`,
    `<pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">`,
    `<circle cx="1.5" cy="1.5" r="1" fill="#ffffff" fill-opacity="0.06" />`,
    `</pattern>`,
    `<marker id="arrow-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">`,
    `<path d="M 0 1 L 10 5 L 0 9 z" fill="#60a5fa" />`,
    `</marker>`,
    `</defs>`,
    `<rect width="${svgWidth}" height="${svgHeight}" rx="14" fill="#111114" stroke="#27272a" stroke-width="1" />`,
    `<rect width="${svgWidth}" height="${svgHeight}" rx="14" fill="url(#dot-grid)" />`,
    `<text x="24" y="32" fill="#e4e4e7" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700">${safeTitle}</text>`,
    `<line x1="24" y1="44" x2="${svgWidth - 24}" y2="44" stroke="#27272a" stroke-width="1" />`,
    ...edgeParts,
    ...nodeParts,
    `<text x="${svgWidth / 2}" y="${svgHeight - 16}" text-anchor="middle" fill="#a1a1aa" font-family="DM Sans, sans-serif" font-size="11.5">${safeCaption}</text>`,
    `</svg>`,
  ].join('');
}
