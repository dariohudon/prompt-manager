// Prompt Manager - Content Script
// Handles auto-filling the chat input on Claude, Gemini, and ChatGPT

(function () {
  'use strict';

  // ── Site detection ──────────────────────────────────────────────────────

  const host = location.hostname;

  function getSite() {
    if (host.includes('claude.ai')) return 'claude';
    if (host.includes('gemini.google.com')) return 'gemini';
    if (host.includes('chatgpt.com')) return 'chatgpt';
    return null;
  }

  // ── Input selectors per site ────────────────────────────────────────────
  // These are ordered by preference (most specific first)

  const SELECTORS = {
    claude: [
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
    ],
    gemini: [
      'div.ql-editor[contenteditable="true"]',
      'rich-textarea div[contenteditable="true"]',
      'div[contenteditable="true"][aria-label]',
      'div[contenteditable="true"]',
    ],
    chatgpt: [
      'div#prompt-textarea[contenteditable="true"]',
      'div[contenteditable="true"][data-id="root"]',
      'div[contenteditable="true"]',
    ],
  };

  // ── Find the chat input ─────────────────────────────────────────────────

  function findInput(site) {
    const selectors = SELECTORS[site] || ['div[contenteditable="true"]', 'textarea'];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) return el;
    }

    // Fallback: any visible textarea
    const ta = document.querySelector('textarea');
    if (ta && isVisible(ta)) return ta;

    return null;
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 &&
      window.getComputedStyle(el).visibility !== 'hidden' &&
      window.getComputedStyle(el).display !== 'none';
  }

  // ── Fill the input ──────────────────────────────────────────────────────

  function fillInput(el, text) {
    el.focus();

    if (el.tagName.toLowerCase() === 'textarea') {
      // Standard textarea
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    // ContentEditable (ProseMirror, Quill, plain div, etc.)
    // Select all existing content and replace it
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);

    // execCommand works across all major editors
    const inserted = document.execCommand('insertText', false, text);

    if (!inserted) {
      // Fallback for strict CSP environments
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: text,
        inputType: 'insertText',
      }));
    }

    // Move caret to end
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    sel.removeAllRanges();
    sel.addRange(r);
  }

  // ── Message handler ─────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action !== 'fillPrompt') return;

    const site = getSite();
    if (!site) {
      sendResponse({ success: false, error: 'Unsupported site' });
      return;
    }

    let input = findInput(site);

    if (!input) {
      // Sometimes the editor is lazy-loaded; wait briefly and retry
      setTimeout(() => {
        input = findInput(site);
        if (input) {
          fillInput(input, message.text);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Chat input not found' });
        }
      }, 500);
      return true; // keep message channel open for async response
    }

    fillInput(input, message.text);
    sendResponse({ success: true });
  });

})();
