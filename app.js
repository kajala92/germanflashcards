/* German Flashcards — with optional Text-to-Speech (TTS) */
(function () {
  const key = 'gf_cards_v1';
  const settingsKey = 'gf_settings_v2'; // bump for TTS
  /** @typedef {{id:string, front:string, back:string, pos?:string, notes?:string, created:number, srs:{interval:number, ease:number, due:number, reps:number, lapses:number, new:boolean}}} Card */

  /** @type {{cards: Card[]}} */
  let state = load();
  let settings = loadSettings();

  // Elements
  const reviewTabBtn = document.getElementById('reviewTabBtn');
  const manageTabBtn = document.getElementById('manageTabBtn');
  const settingsTabBtn = document.getElementById('settingsTabBtn');
  const reviewPanel = document.getElementById('reviewPanel');
  const managePanel = document.getElementById('managePanel');
  const settingsPanel = document.getElementById('settingsPanel');

  const dueCount = document.getElementById('dueCount');
  const newCount = document.getElementById('newCount');
  const totalCount = document.getElementById('totalCount');

  const cardEl = document.getElementById('card');
  const cardFront = document.getElementById('cardFront');
  const cardBack = document.getElementById('cardBack');
  const showBtn = document.getElementById('showBtn');
  const gradeBtns = document.getElementById('gradeBtns');
  const againBtn = document.getElementById('againBtn');
  const goodBtn = document.getElementById('goodBtn');
  const easyBtn = document.getElementById('easyBtn');

  const typingWrap = document.getElementById('typingWrap');
  const typedAnswer = document.getElementById('typedAnswer');
  const emptyMessage = document.getElementById('emptyMessage');

  const speakFrontBtn = document.getElementById('speakFrontBtn');
  const speakBackBtn = document.getElementById('speakBackBtn');

  const addForm = document.getElementById('addForm');
  const deckTableBody = document.querySelector('#deckTable tbody');
  const bulkText = document.getElementById('bulkText');
  const bulkAddBtn = document.getElementById('bulkAddBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const exportBtn = document.getElementById('exportBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');

  const settingsForm = document.getElementById('settingsForm');
  const newLimit = document.getElementById('newLimit');
  const typingMode = document.getElementById('typingMode');
  const shuffleDue = document.getElementById('shuffleDue');
  const ttsEnabled = document.getElementById('ttsEnabled');
  const ttsAutoSpeak = document.getElementById('ttsAutoSpeak');
  const ttsVoice = document.getElementById('ttsVoice');
  const ttsRate = document.getElementById('ttsRate');
  const ttsPitch = document.getElementById('ttsPitch');

  // Tabs
  function showTab(tab) {
    const tabs = [
      [reviewTabBtn, reviewPanel],
      [manageTabBtn, managePanel],
      [settingsTabBtn, settingsPanel],
    ];
    tabs.forEach(([btn, panel]) => {
      const active = (btn === tab);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      panel.hidden = !active;
    });
  }
  reviewTabBtn.addEventListener('click', () => showTab(reviewTabBtn));
  manageTabBtn.addEventListener('click', () => showTab(manageTabBtn));
  settingsTabBtn.addEventListener('click', () => showTab(settingsTabBtn));

  // Settings
  function defaultSettings() {
    return {
      newPerSession: 10,
      typingMode: false,
      shuffleDue: true,
      ttsEnabled: false,
      ttsAutoSpeak: false,
      ttsVoiceURI: '',
      ttsRate: 1.0,
      ttsPitch: 1.0,
    };
  }
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(settingsKey) || 'null');
      return Object.assign(defaultSettings(), s || {});
    } catch { return defaultSettings(); }
  }
  function saveSettings() {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }
  function renderSettings() {
    newLimit.value = settings.newPerSession;
    typingMode.checked = settings.typingMode;
    shuffleDue.checked = settings.shuffleDue;
    ttsEnabled.checked = settings.ttsEnabled;
    ttsAutoSpeak.checked = settings.ttsAutoSpeak;
    ttsRate.value = settings.ttsRate;
    ttsPitch.value = settings.ttsPitch;
  }
  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    settings.newPerSession = parseInt(newLimit.value || '0', 10);
    settings.typingMode = typingMode.checked;
    settings.shuffleDue = shuffleDue.checked;
    settings.ttsEnabled = ttsEnabled.checked;
    settings.ttsAutoSpeak = ttsAutoSpeak.checked;
    settings.ttsRate = parseFloat(ttsRate.value);
    settings.ttsPitch = parseFloat(ttsPitch.value);
    const selected = ttsVoice.value;
    if (selected) settings.ttsVoiceURI = selected;
    saveSettings();
    updateStats();
    prepareQueue();
  });

  // Storage
  function load() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { cards: [] };
      const parsed = JSON.parse(raw);
      parsed.cards.forEach(c => {
        c.srs = Object.assign({ interval: 0, ease: 2.5, due: Date.now(), reps: 0, lapses: 0, new: true }, c.srs || {});
      });
      return parsed;
    } catch (e) {
      console.warn('Failed to load, resetting.', e);
      return { cards: [] };
    }
  }
  function save() {
    localStorage.setItem(key, JSON.stringify(state));
  }

  // Cards helpers
  function makeId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function addCard(front, back, pos, notes) {
    const now = Date.now();
    state.cards.push({
      id: makeId(),
      front: String(front||'').trim(),
      back: String(back||'').trim(),
      pos: String(pos||'').trim(),
      notes: String(notes||'').trim(),
      created: now,
      srs: { interval: 0, ease: 2.5, due: now, reps: 0, lapses: 0, new: true }
    });
    save();
  }
  function deleteCard(id) {
    state.cards = state.cards.filter(c => c.id !== id);
    save();
  }

  // Manage view
  function renderDeckTable() {
    deckTableBody.innerHTML = '';
    const rows = state.cards.map((c, i) => {
      const tr = document.createElement('tr');
      const dueStr = new Date(c.srs.due).toLocaleDateString() + ' ' + new Date(c.srs.due).toLocaleTimeString();
      tr.innerHTML = `<td>${i+1}</td><td>${escapeHtml(c.front)}</td><td>${escapeHtml(c.back)}</td><td>${escapeHtml(c.pos||'')}</td><td>${dueStr}</td>
                      <td><button data-del="${c.id}">Delete</button></td>`;
      return tr;
    });
    rows.forEach(r => deckTableBody.appendChild(r));
  }
  deckTableBody.addEventListener('click', (e) => {
    const id = e.target.dataset && e.target.dataset.del;
    if (id && confirm('Delete this card?')) {
      deleteCard(id);
      renderDeckTable();
      updateStats();
      prepareQueue();
    }
  });

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData(addForm);
    addCard(form.get('front'), form.get('back'), form.get('pos'), form.get('notes'));
    addForm.reset();
    renderDeckTable();
    updateStats();
    prepareQueue();
  });

  bulkAddBtn.addEventListener('click', () => {
    const lines = bulkText.value.split('\n').map(s => s.trim()).filter(Boolean);
    let count = 0;
    for (const line of lines) {
      const m = line.split('=');
      if (m.length >= 2) {
        addCard(m[0], m.slice(1).join('='), '', '');
        count++;
      }
    }
    if (count) {
      renderDeckTable();
      updateStats();
      prepareQueue();
      bulkText.value = '';
      alert('Added ' + count + ' cards.');
    } else {
      alert('No lines in the form "German = English" were found.');
    }
  });

  // Import / Export
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'german_flashcards_backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  importBtn.addEventListener('click', async () => {
    if (!importFile.files || importFile.files.length === 0) { alert('Choose a JSON file first.'); return; }
    const file = importFile.files[0];
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (!data.cards) throw new Error('Invalid file');
      state = data;
      save();
      renderDeckTable();
      updateStats();
      prepareQueue();
      alert('Imported ' + state.cards.length + ' cards.');
    } catch (e) {
      alert('Import failed: ' + e.message);
    }
  });
  clearAllBtn.addEventListener('click', () => {
    if (confirm('This will delete ALL cards and progress. Continue?')) {
      state = { cards: [] };
      save();
      renderDeckTable();
      updateStats();
      prepareQueue();
    }
  });

  // Review queue
  let queue = [];
  let shown = null;
  let newUsedThisSession = 0;

  function dueCards() {
    const now = Date.now();
    return state.cards.filter(c => c.srs.due <= now && !c.srs.new);
  }
  function newCards() {
    return state.cards.filter(c => c.srs.new);
  }
  function prepareQueue() {
    const due = dueCards();
    if (settings.shuffleDue) shuffle(due);
    const news = newCards().slice(0, Math.max(0, settings.newPerSession - newUsedThisSession));
    queue = [...due, ...news];
    renderNext();
    updateStats();
  }

  function renderNext() {
    if (queue.length === 0) {
      cardEl.hidden = true;
      emptyMessage.hidden = false;
      return;
    }
    emptyMessage.hidden = true;
    cardEl.hidden = false;
    shown = queue.shift();
    cardFront.textContent = shown.front;
    typedAnswer.value = '';
    typingWrap.hidden = !settings.typingMode;
    cardBack.hidden = true;
    showBtn.hidden = false;
    gradeBtns.hidden = true;
    // If TTS auto-speak, speak the front
    if (settings.ttsEnabled && settings.ttsAutoSpeak) speakText(shown.front, true);
  }

  showBtn.addEventListener('click', () => {
    if (settings.typingMode) {
      const typed = normalize(typedAnswer.value);
      const target = normalize(shown.back);
      if (!typed) { alert('Type your answer first.'); return; }
      if (levenshtein(typed, target) <= Math.max(1, Math.floor(target.length * 0.2))) {
        typedAnswer.setCustomValidity('Looks correct or very close.');
      } else {
        typedAnswer.setCustomValidity('Not quite — compare with the answer below.');
      }
      typedAnswer.reportValidity();
    }
    cardBack.innerHTML = renderBack(shown);
    cardBack.hidden = false;
    showBtn.hidden = true;
    gradeBtns.hidden = false;
    if (settings.ttsEnabled && settings.ttsAutoSpeak) speakText(shown.back, false);
  });

  againBtn.addEventListener('click', () => grade(shown, 1));
  goodBtn.addEventListener('click', () => grade(shown, 3));
  easyBtn.addEventListener('click', () => grade(shown, 4));

  function renderBack(c) {
    let html = `<div class="answer"><strong>${escapeHtml(c.back)}</strong></div>`;
    if (c.pos) html += `<div class="meta">Part of speech: ${escapeHtml(c.pos)}</div>`;
    if (c.notes) html += `<div class="meta">${escapeHtml(c.notes)}</div>`;
    return html;
  }

  // ---- TTS Support ----
  let voices = [];
  function loadVoices() {
    voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    // Prefer de-DE/de-AT/de-CH voice
    const preferred = voices.find(v => /^(de-|de_)/i.test(v.lang)) || voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    // Fill select
    if (ttsVoice) {
      ttsVoice.innerHTML = '';
      voices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} — ${v.lang}`;
        ttsVoice.appendChild(opt);
      });
      // select saved or preferred
      const choice = settings.ttsVoiceURI || (preferred ? preferred.voiceURI : '');
      if (choice) ttsVoice.value = choice;
    }
  }
  if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  function speakText(text, preferGerman) {
    if (!('speechSynthesis' in window) || !settings.ttsEnabled) return;
    const u = new SpeechSynthesisUtterance(String(text));
    const selectedURI = ttsVoice && ttsVoice.value;
    let voice = voices.find(v => v.voiceURI === selectedURI);
    if (!voice && preferGerman) {
      voice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('de'));
    }
    if (voice) u.voice = voice;
    u.rate = settings.ttsRate || 1.0;
    u.pitch = settings.ttsPitch || 1.0;
    try { window.speechSynthesis.cancel(); } catch {}
    window.speechSynthesis.speak(u);
  }

  speakFrontBtn.addEventListener('click', () => { if (shown) speakText(shown.front, true); });
  speakBackBtn.addEventListener('click', () => { if (shown) speakText(shown.back, false); });

  // SRS logic (simple SM-2 style)
  function grade(c, q) {
    const now = Date.now();
    const s = c.srs;
    s.reps++;
    if (c.srs.new) {
      c.srs.new = false;
      if (q <= 2) { s.interval = 0; s.due = now + 10 * 60 * 1000; }
      else if (q === 3) { s.interval = 24 * 3600 * 1000; s.due = now + s.interval; }
      else { s.interval = 3 * 24 * 3600 * 1000; s.due = now + s.interval; s.ease += 0.05; }
      newUsedThisSession++;
    } else {
      if (q <= 2) {
        s.lapses++; s.ease = Math.max(1.3, s.ease - 0.2);
        s.interval = 10 * 60 * 1000;
        s.due = now + s.interval;
      } else if (q === 3) {
        s.ease = Math.max(1.3, s.ease - 0.02);
        s.interval = Math.max(24 * 3600 * 1000, Math.round(s.interval * s.ease));
        s.due = now + s.interval;
      } else {
        s.ease = Math.min(3.0, s.ease + 0.05);
        s.interval = Math.max(3 * 24 * 3600 * 1000, Math.round(s.interval * (s.ease + 0.15)));
        s.due = now + s.interval;
      }
    }
    save();
    updateStats();
    prepareQueue();
  }

  // UI helpers
  function updateStats() {
    const due = dueCards().length;
    const news = newCards().length;
    dueCount.textContent = due;
    newCount.textContent = Math.max(0, settings.newPerSession - newUsedThisSession, news);
    totalCount.textContent = state.cards.length;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }
  function normalize(s) {
    return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }
  function levenshtein(a, b) {
    const m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        m[i][j] = Math.min(
          m[i-1][j] + 1,
          m[i][j-1] + 1,
          m[i-1][j-1] + (a[j-1] === b[i-1] ? 0 : 1)
        );
      }
    }
    return m[b.length][a.length];
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (document.activeElement && ['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); if (!cardBack.hidden) goodBtn.click(); else showBtn.click(); }
    if (e.key === '1') againBtn.click();
    if (e.key === '2') goodBtn.click();
    if (e.key === '3') easyBtn.click();
  });

  // Init
  renderSettings();
  renderDeckTable();
  updateStats();
  prepareQueue();

})();