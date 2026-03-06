// ── Utilities ──────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID();
}

function $(id) {
  return document.getElementById(id);
}

function showToast(msg, type = '') {
  const toast = $('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.className = 'toast hidden'; }, 2200);
}

// ── Storage ────────────────────────────────────────────────────────────────

async function loadData() {
  return new Promise(resolve => {
    chrome.storage.local.get('clients', result => {
      resolve(result.clients || []);
    });
  });
}

async function saveData(clients) {
  return new Promise(resolve => {
    chrome.storage.local.set({ clients }, resolve);
  });
}

// ── State ──────────────────────────────────────────────────────────────────

let clients = [];
let currentFolderId = null;
let editingFolderId = null;
let editingPromptId = null;

// ── Navigation ─────────────────────────────────────────────────────────────

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(id).classList.add('active');
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderFolders(filterText) {
  const list = $('folder-list');
  const empty = $('empty-state');
  const searchResults = $('search-results');

  if (filterText) {
    list.classList.add('hidden');
    empty.classList.add('hidden');
    searchResults.classList.remove('hidden');
    renderSearch(filterText);
    return;
  }

  list.classList.remove('hidden');
  searchResults.classList.add('hidden');

  if (clients.length === 0) {
    empty.classList.remove('hidden');
    list.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = clients.map(client => `
    <div class="folder-item" data-id="${client.id}">
      <div class="folder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/>
        </svg>
      </div>
      <div class="folder-info">
        <div class="folder-name">${escHtml(client.name)}</div>
        <div class="folder-count">${client.prompts.length} prompt${client.prompts.length !== 1 ? 's' : ''}</div>
      </div>
      <svg class="folder-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  `).join('');

  list.querySelectorAll('.folder-item').forEach(el => {
    el.addEventListener('click', () => openFolderDetail(el.dataset.id));
  });
}

function renderSearch(query) {
  const q = query.toLowerCase();
  const container = $('search-results');
  const groups = [];

  clients.forEach(client => {
    const matches = client.prompts.filter(p =>
      p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q)
    );
    if (matches.length > 0) {
      groups.push({ client, matches });
    }
  });

  if (groups.length === 0) {
    container.innerHTML = '<div class="no-results">No prompts found.</div>';
    return;
  }

  container.innerHTML = groups.map(({ client, matches }) => `
    <div class="search-result-group">
      <div class="search-group-label">${escHtml(client.name)}</div>
      ${matches.map(p => renderPromptCard(p, true)).join('')}
    </div>
  `).join('');

  attachPromptCardListeners(container);
}

function renderPromptCard(prompt, compact = false) {
  const preview = prompt.text.length > 100 ? prompt.text.slice(0, 100) + '…' : prompt.text;
  return `
    <div class="prompt-item" data-id="${prompt.id}">
      <div class="prompt-item-header">
        <div class="prompt-title">${escHtml(prompt.title)}</div>
        ${!compact ? `
        <div class="prompt-actions">
          <button class="btn-icon btn-edit-prompt" data-id="${prompt.id}" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon btn-danger btn-delete-prompt" data-id="${prompt.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>` : ''}
      </div>
      <div class="prompt-preview">${escHtml(preview)}</div>
      <button class="use-btn" data-prompt-id="${prompt.id}" data-folder-id="${currentFolderId || findFolderIdByPrompt(prompt.id)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        Use Prompt
      </button>
    </div>
  `;
}

function findFolderIdByPrompt(promptId) {
  for (const c of clients) {
    if (c.prompts.find(p => p.id === promptId)) return c.id;
  }
  return null;
}

function renderFolderDetail() {
  const client = clients.find(c => c.id === currentFolderId);
  if (!client) return;

  $('detail-folder-name').textContent = client.name;

  const container = $('prompt-list');
  const empty = $('prompt-empty');

  if (client.prompts.length === 0) {
    empty.classList.remove('hidden');
    container.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');
  container.innerHTML = client.prompts.map(p => renderPromptCard(p)).join('');
  attachPromptCardListeners(container);
}

function attachPromptCardListeners(container) {
  container.querySelectorAll('.btn-edit-prompt').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openEditPrompt(btn.dataset.id);
    });
  });

  container.querySelectorAll('.btn-delete-prompt').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deletePrompt(btn.dataset.id);
    });
  });

  container.querySelectorAll('.use-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      usePrompt(btn.dataset.promptId, btn.dataset.folderId);
    });
  });
}

// ── Folder CRUD ────────────────────────────────────────────────────────────

function openAddFolder() {
  editingFolderId = null;
  $('folder-form-title').textContent = 'New Client';
  $('folder-name-input').value = '';
  showView('view-folder-form');
  setTimeout(() => $('folder-name-input').focus(), 50);
}

function openEditFolderForm() {
  const client = clients.find(c => c.id === currentFolderId);
  if (!client) return;
  editingFolderId = currentFolderId;
  $('folder-form-title').textContent = 'Edit Client';
  $('folder-name-input').value = client.name;
  showView('view-folder-form');
  setTimeout(() => $('folder-name-input').focus(), 50);
}

async function saveFolder() {
  const name = $('folder-name-input').value.trim();
  if (!name) { showToast('Please enter a name.', 'error'); return; }

  if (editingFolderId) {
    const client = clients.find(c => c.id === editingFolderId);
    if (client) client.name = name;
  } else {
    clients.push({ id: uuid(), name, prompts: [] });
  }

  await saveData(clients);
  showToast(editingFolderId ? 'Client updated.' : 'Client created.', 'success');

  if (editingFolderId) {
    showView('view-folder-detail');
    renderFolderDetail();
  } else {
    showView('view-main');
    renderFolders($('search-input').value.trim());
  }
}

async function deleteFolder() {
  if (!confirm('Delete this client and all its prompts?')) return;
  clients = clients.filter(c => c.id !== currentFolderId);
  await saveData(clients);
  showView('view-main');
  renderFolders($('search-input').value.trim());
  showToast('Client deleted.', 'success');
}

function openFolderDetail(id) {
  currentFolderId = id;
  renderFolderDetail();
  showView('view-folder-detail');
}

// ── Prompt CRUD ────────────────────────────────────────────────────────────

function openAddPrompt() {
  editingPromptId = null;
  $('prompt-form-title').textContent = 'New Prompt';
  $('prompt-title-input').value = '';
  $('prompt-text-input').value = '';
  showView('view-prompt-form');
  setTimeout(() => $('prompt-title-input').focus(), 50);
}

function openEditPrompt(promptId) {
  const client = clients.find(c => c.id === currentFolderId);
  if (!client) return;
  const prompt = client.prompts.find(p => p.id === promptId);
  if (!prompt) return;

  editingPromptId = promptId;
  $('prompt-form-title').textContent = 'Edit Prompt';
  $('prompt-title-input').value = prompt.title;
  $('prompt-text-input').value = prompt.text;
  showView('view-prompt-form');
  setTimeout(() => $('prompt-title-input').focus(), 50);
}

async function savePrompt() {
  const title = $('prompt-title-input').value.trim();
  const text = $('prompt-text-input').value.trim();

  if (!title) { showToast('Please enter a title.', 'error'); return; }
  if (!text) { showToast('Please enter prompt text.', 'error'); return; }

  const client = clients.find(c => c.id === currentFolderId);
  if (!client) return;

  if (editingPromptId) {
    const prompt = client.prompts.find(p => p.id === editingPromptId);
    if (prompt) { prompt.title = title; prompt.text = text; }
  } else {
    client.prompts.push({ id: uuid(), title, text });
  }

  await saveData(clients);
  showToast(editingPromptId ? 'Prompt updated.' : 'Prompt saved.', 'success');
  showView('view-folder-detail');
  renderFolderDetail();
}

async function deletePrompt(promptId) {
  if (!confirm('Delete this prompt?')) return;
  const client = clients.find(c => c.id === currentFolderId);
  if (!client) return;
  client.prompts = client.prompts.filter(p => p.id !== promptId);
  await saveData(clients);
  renderFolderDetail();
  showToast('Prompt deleted.', 'success');
}

// ── Use Prompt (inject into active tab) ────────────────────────────────────

async function usePrompt(promptId, folderId) {
  const client = clients.find(c => c.id === folderId);
  if (!client) return;
  const prompt = client.prompts.find(p => p.id === promptId);
  if (!prompt) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) { showToast('No active tab found.', 'error'); return; }

  const supportedUrls = ['claude.ai', 'gemini.google.com', 'chatgpt.com'];
  const isSupported = supportedUrls.some(u => tab.url && tab.url.includes(u));

  if (!isSupported) {
    showToast('Open Claude, Gemini, or ChatGPT first.', 'error');
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'fillPrompt',
      text: prompt.text
    });
    showToast('Prompt inserted!', 'success');
    window.close();
  } catch (err) {
    // Content script may not be ready, inject it on-demand
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
      await new Promise(r => setTimeout(r, 200));
      await chrome.tabs.sendMessage(tab.id, {
        action: 'fillPrompt',
        text: prompt.text
      });
      showToast('Prompt inserted!', 'success');
      window.close();
    } catch (err2) {
      showToast('Could not insert prompt. Try refreshing the page.', 'error');
    }
  }
}

// ── Escape HTML ────────────────────────────────────────────────────────────

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Event Listeners ────────────────────────────────────────────────────────

function init() {
  // Search
  const searchInput = $('search-input');
  const clearBtn = $('btn-clear-search');

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    clearBtn.classList.toggle('hidden', !q);
    renderFolders(q);
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    renderFolders('');
  });

  // Add folder
  $('btn-add-folder').addEventListener('click', openAddFolder);
  $('btn-folder-save').addEventListener('click', saveFolder);
  $('btn-folder-cancel').addEventListener('click', () => {
    if (editingFolderId) {
      showView('view-folder-detail');
    } else {
      showView('view-main');
    }
  });
  $('btn-folder-back').addEventListener('click', () => {
    if (editingFolderId) {
      showView('view-folder-detail');
    } else {
      showView('view-main');
    }
  });

  $('folder-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveFolder();
  });

  // Folder detail
  $('btn-detail-back').addEventListener('click', () => {
    currentFolderId = null;
    showView('view-main');
    renderFolders($('search-input').value.trim());
  });
  $('btn-edit-folder').addEventListener('click', openEditFolderForm);
  $('btn-delete-folder').addEventListener('click', deleteFolder);
  $('btn-add-prompt').addEventListener('click', openAddPrompt);

  // Prompt form
  $('btn-prompt-save').addEventListener('click', savePrompt);
  $('btn-prompt-cancel').addEventListener('click', () => showView('view-folder-detail'));
  $('btn-prompt-back').addEventListener('click', () => showView('view-folder-detail'));

  $('btn-prompt-title-input') && $('btn-prompt-title-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('prompt-text-input').focus();
  });
}

// ── Boot ───────────────────────────────────────────────────────────────────

(async () => {
  clients = await loadData();
  init();
  showView('view-main');
  renderFolders('');
})();
