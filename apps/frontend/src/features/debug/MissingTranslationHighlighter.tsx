import { useEffect } from 'react';
import { MISSING_TRANSLATION_PREFIX } from '../../hooks/useTranslation';

const HIGHLIGHT_ATTR = 'data-missing-i18n-debug';
const SKIPPED_PARENT_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT']);

export function MissingTranslationHighlighter() {
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    highlightMissingTranslations(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          highlightMissingTranslations(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

function highlightMissingTranslations(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    highlightTextNodeParent(root as Text);
    return;
  }

  if (!(root instanceof Element)) return;
  if (shouldSkipElement(root)) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent || shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
      return node.textContent?.includes(MISSING_TRANSLATION_PREFIX)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const parents = new Set<Element>();
  let node = walker.nextNode();
  while (node) {
    if (node.parentElement) parents.add(node.parentElement);
    node = walker.nextNode();
  }

  parents.forEach(markElementAsMissingTranslation);
}

function highlightTextNodeParent(node: Text) {
  if (!node.textContent?.includes(MISSING_TRANSLATION_PREFIX)) return;
  if (!node.parentElement || shouldSkipElement(node.parentElement)) return;

  markElementAsMissingTranslation(node.parentElement);
}

function markElementAsMissingTranslation(element: Element) {
  element.setAttribute(HIGHLIGHT_ATTR, 'true');
}

function shouldSkipElement(element: Element) {
  return (
    element.hasAttribute(HIGHLIGHT_ATTR) ||
    SKIPPED_PARENT_TAGS.has(element.tagName)
  );
}

export default MissingTranslationHighlighter;
