import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_DIR = new URL('../src/', import.meta.url).pathname;

const ATOMIC_LAYERS = ['atoms', 'molecules', 'organisms', 'templates'];
const LAYER_RANK = {
  atoms: 0,
  molecules: 1,
  organisms: 2,
  templates: 3,
};

const allowedInlineStyleFiles = new Set([
  'components/molecules/BadgeDropdown/BadgeDropdown.tsx',
  'components/molecules/GlobalProgressGauge/GlobalProgressGauge.tsx',
  'components/molecules/GenericGraph.tsx',
  'components/organisms/ManagementTable/ManagementTable.tsx',
]);

const violations = [];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    return /\.(ts|tsx|css)$/.test(entry) ? [path] : [];
  });
}

function report(path, message, lineNumber) {
  violations.push(`${relative(SRC_DIR, path)}:${lineNumber}: ${message}`);
}

function lineNumberFor(content, index) {
  return content.slice(0, index).split('\n').length;
}

function getLayer(path) {
  const parts = relative(SRC_DIR, path).split('/');
  const componentsIndex = parts.indexOf('components');
  if (componentsIndex === -1) return undefined;
  return ATOMIC_LAYERS.find((layer) => parts[componentsIndex + 1] === layer);
}

function resolveImportedLayer(importPath) {
  const match = importPath.match(/(?:^|\/)(atoms|molecules|organisms|templates)(?:\/|$)/);
  return match?.[1];
}

for (const path of walk(SRC_DIR)) {
  const relPath = relative(SRC_DIR, path);
  const content = readFileSync(path, 'utf8');
  const isTokenSource = relPath === 'styles/index.css';
  const isTsx = path.endsWith('.tsx');

  if (!isTokenSource) {
    for (const match of content.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      report(path, 'Hardcoded hex colors must be declared as design tokens.', lineNumberFor(content, match.index));
    }
  }

  for (const match of content.matchAll(/rgba?\([^)]*\)/g)) {
    if (!isTokenSource) {
      report(path, 'Raw rgb/rgba values must use token-backed utilities.', lineNumberFor(content, match.index));
    }
  }

  for (const match of content.matchAll(/\b(?:bg|text|border|ring|shadow|from|via|to|fill|stroke)-\[[^\]]+\]/g)) {
    if (/(#[0-9a-fA-F]{3,8}\b|rgba?\()/i.test(match[0])) {
      report(path, 'Arbitrary color/style utility must be replaced by a token utility.', lineNumberFor(content, match.index));
    }
  }

  if (isTsx && !allowedInlineStyleFiles.has(relPath)) {
    for (const match of content.matchAll(/\bstyle=\{/g)) {
      report(path, 'Inline style props are not allowed in presentational TSX.', lineNumberFor(content, match.index));
    }
  }

  const currentLayer = getLayer(path);
  if (currentLayer) {
    for (const match of content.matchAll(/from ['"]([^'"]+)['"]/g)) {
      const importedLayer = resolveImportedLayer(match[1]);
      if (importedLayer && LAYER_RANK[importedLayer] > LAYER_RANK[currentLayer]) {
        report(
          path,
          `Atomic import boundary violation: ${currentLayer} cannot import ${importedLayer}.`,
          lineNumberFor(content, match.index)
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Design-system audit failed:\n');
  console.error(violations.map((violation) => `- ${violation}`).join('\n'));
  process.exit(1);
}

console.log('Design-system audit passed.');
