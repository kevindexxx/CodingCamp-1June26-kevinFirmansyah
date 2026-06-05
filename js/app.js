// =============================================================================
// STORAGE HELPERS
// =============================================================================

function safeRead(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

function safeReadValue(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

// =============================================================================
// THEME MODULE  (Light / Dark mode)
// =============================================================================

/**
 * Applies `theme` ("dark" | "light") to the <html> element,
 * updates the toggle button label, and persists the preference.
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent  = theme === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label',
      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  safeWrite('theme', theme);
}

function initTheme() {
  try {
    const saved = safeReadValue('theme', 'dark');
    const theme = saved === 'light' ? 'light' : 'dark';
    applyTheme(theme);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
  } catch (e) {
    console.error('initTheme error:', e);
  }
}

// =============================================================================
// GREETING MODULE
// =============================================================================

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getGreetingText(hour) {
  if (hour >= 5  && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 21) return 'Good Evening';
  return 'Good Night';
}

function formatTime(now) {
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDate(now) {
  const weekday = WEEKDAY_NAMES[now.getDay()];
  const month   = MONTH_NAMES[now.getMonth()];
  const day     = now.getDate();
  const year    = now.getFullYear();
  return `${weekday}, ${month} ${day}, ${year}`;
}

/**
 * Builds the full greeting string, optionally including the user's name.
 * e.g. "Good Morning, Kevin" or just "Good Morning"
 */
function buildGreetingString(hour, name) {
  const base = getGreetingText(hour);
  const trimmed = (name || '').trim();
  return trimmed ? `${base}, ${trimmed}` : base;
}

function renderGreeting(now) {
  if (typeof document === 'undefined') return;
  const timeEl = document.getElementById('greeting-time');
  const dateEl = document.getElementById('greeting-date');
  const textEl = document.getElementById('greeting-text');
  if (timeEl) timeEl.textContent = formatTime(now);
  if (dateEl) dateEl.textContent = formatDate(now);
  if (textEl) {
    const name = safeReadValue('greeting_name', '');
    textEl.textContent = buildGreetingString(now.getHours(), name);
  }
}

const greetingState = { intervalId: null };

/**
 * Wires the inline name editor in the greeting panel.
 * Pencil button → shows input → Save persists to localStorage and re-renders.
 */
function initGreetingNameEditor() {
  const editBtn   = document.getElementById('greeting-name-edit-btn');
  const nameForm  = document.getElementById('greeting-name-form');
  const nameInput = document.getElementById('greeting-name-input');
  const saveBtn   = document.getElementById('greeting-name-save-btn');
  const cancelBtn = document.getElementById('greeting-name-cancel-btn');

  if (!editBtn || !nameForm) return;

  // Pre-fill input with any saved name
  const saved = safeReadValue('greeting_name', '');
  if (nameInput) nameInput.value = saved;

  const openForm = () => {
    nameForm.hidden = false;
    editBtn.hidden  = true;
    if (nameInput) { nameInput.value = safeReadValue('greeting_name', ''); nameInput.focus(); }
  };
  const closeForm = () => {
    nameForm.hidden = true;
    editBtn.hidden  = false;
  };
  const saveName = () => {
    const name = (nameInput ? nameInput.value : '').trim();
    safeWrite('greeting_name', name);
    renderGreeting(new Date());
    closeForm();
  };

  editBtn.addEventListener('click', openForm);
  if (saveBtn)   saveBtn.addEventListener('click', saveName);
  if (cancelBtn) cancelBtn.addEventListener('click', closeForm);
  if (nameInput) {
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); saveName(); }
      if (e.key === 'Escape') { e.preventDefault(); closeForm(); }
    });
  }
}

function initGreeting() {
  try {
    renderGreeting(new Date());
    greetingState.intervalId = setInterval(() => renderGreeting(new Date()), 60000);
    initGreetingNameEditor();
  } catch (e) {
    console.error('initGreeting failed:', e);
  }
}

// =============================================================================
// FOCUS TIMER MODULE
// =============================================================================

let timerState         = 'STOPPED';
let pomodoroMinutes    = 25;           // user-configurable duration
let remainingSeconds   = 25 * 60;
let timerIntervalId    = null;

function renderTimer(seconds) {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const display = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  if (typeof document !== 'undefined') {
    const el = document.getElementById('timer-display');
    if (el) el.textContent = display;
  }
  return display;
}

function setTimerControls(state) {
  if (typeof document === 'undefined') return;
  const startBtn = document.getElementById('timer-start');
  const stopBtn  = document.getElementById('timer-stop');
  if (!startBtn || !stopBtn) return;
  const isRunning = state === 'RUNNING';
  startBtn.disabled = isRunning;
  stopBtn.disabled  = !isRunning;
}

function timerTick() {
  remainingSeconds = Math.max(0, remainingSeconds - 1);
  renderTimer(remainingSeconds);
  if (remainingSeconds === 0) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    timerState      = 'STOPPED';
    setTimerControls('STOPPED');
  }
}

function startTimer() {
  if (timerIntervalId !== null) return;
  timerState      = 'RUNNING';
  setTimerControls('RUNNING');
  timerIntervalId = setInterval(timerTick, 1000);
}

function stopTimer() {
  clearInterval(timerIntervalId);
  timerIntervalId = null;
  timerState      = 'PAUSED';
  setTimerControls('PAUSED');
}

function resetTimer() {
  clearInterval(timerIntervalId);
  timerIntervalId  = null;
  timerState       = 'STOPPED';
  remainingSeconds = pomodoroMinutes * 60;
  renderTimer(remainingSeconds);
  setTimerControls('STOPPED');
}

/**
 * Sets a custom Pomodoro duration (in whole minutes, clamped to 1–99).
 * Stops any running timer, updates the display, and persists the preference.
 */
function setPomodoroDuration(minutes) {
  const mins = Math.max(1, Math.min(99, Math.round(Number(minutes))));
  if (!Number.isFinite(mins)) return;

  // Stop any active session before changing the duration
  clearInterval(timerIntervalId);
  timerIntervalId  = null;
  timerState       = 'STOPPED';

  pomodoroMinutes  = mins;
  remainingSeconds = mins * 60;

  renderTimer(remainingSeconds);
  setTimerControls('STOPPED');

  // Keep the input in sync
  const input = document.getElementById('timer-duration-input');
  if (input) input.value = mins;

  // Persist
  safeWrite('pomodoro_minutes', mins);
}

function initTimer() {
  try {
    // Restore saved duration (default 25)
    const saved = safeReadValue('pomodoro_minutes', 25);
    pomodoroMinutes = Math.max(1, Math.min(99, Math.round(Number(saved)))) || 25;

    timerState       = 'STOPPED';
    remainingSeconds = pomodoroMinutes * 60;
    timerIntervalId  = null;

    renderTimer(remainingSeconds);
    setTimerControls('STOPPED');

    // Sync the duration input to the restored value
    const durationInput = document.getElementById('timer-duration-input');
    if (durationInput) durationInput.value = pomodoroMinutes;

    // Wire control buttons
    const startBtn = document.getElementById('timer-start');
    const stopBtn  = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');
    if (startBtn) startBtn.addEventListener('click', startTimer);
    if (stopBtn)  stopBtn.addEventListener('click', stopTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);

    // Wire duration setter
    const setBtn = document.getElementById('timer-duration-set-btn');
    if (setBtn && durationInput) {
      const applyDuration = () => setPomodoroDuration(durationInput.value);
      setBtn.addEventListener('click', applyDuration);
      durationInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); applyDuration(); }
      });
    }
  } catch (e) {
    console.error('initTimer error:', e);
  }
}

// =============================================================================
// TODO LIST MODULE
// =============================================================================

let tasks = [];

function persistTasks() {
  const ok = safeWrite('todo_tasks', tasks);
  const errEl = document.querySelector('.todo-error');
  if (!ok) {
    if (errEl) errEl.textContent = 'Unable to save — storage is full or unavailable';
    return false;
  }
  if (errEl) errEl.textContent = '';
  return true;
}

function renderTaskItem(task) {
  const li = document.createElement('li');
  li.dataset.id = task.id;
  if (task.completed) li.classList.add('completed');

  const checkbox     = document.createElement('input');
  checkbox.type      = 'checkbox';
  checkbox.className = 'todo-toggle';
  checkbox.checked   = task.completed;
  checkbox.setAttribute('aria-label',
    `Mark "${task.name}" as ${task.completed ? 'incomplete' : 'complete'}`);

  const span       = document.createElement('span');
  span.className   = 'todo-text';
  span.textContent = task.name;

  const editBtn       = document.createElement('button');
  editBtn.type        = 'button';
  editBtn.className   = 'todo-edit-btn';
  editBtn.textContent = 'Edit';

  const deleteBtn       = document.createElement('button');
  deleteBtn.type        = 'button';
  deleteBtn.className   = 'todo-delete-btn';
  deleteBtn.textContent = 'Delete';

  li.append(checkbox, span, editBtn, deleteBtn);
  return li;
}

function renderTaskList(taskArray) {
  const list = document.getElementById('todo-list');
  if (!list) return;
  list.innerHTML = '';
  taskArray.forEach(task => list.appendChild(renderTaskItem(task)));
}

function addTask(name) {
  const errEl   = document.querySelector('.todo-error');
  const input   = document.getElementById('todo-input');
  const trimmed = (name || '').trim();
  if (errEl) errEl.textContent = '';
  if (trimmed === '') { if (input) input.focus(); return; }
  if (trimmed.length > 200) {
    if (errEl) errEl.textContent = 'Task name must not exceed 200 characters.';
    return;
  }
  const task = {
    id:        (typeof crypto !== 'undefined' && crypto.randomUUID)
                 ? crypto.randomUUID() : String(Date.now()),
    name:      trimmed,
    completed: false,
  };
  tasks.push(task);
  if (!persistTasks()) { tasks.pop(); return; }
  renderTaskList(tasks);
  if (input) input.value = '';
}

function toggleTask(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  const prev           = tasks[idx].completed;
  tasks[idx].completed = !prev;
  if (!persistTasks()) { tasks[idx].completed = prev; renderTaskList(tasks); return; }
  const list = document.getElementById('todo-list');
  const li   = list && list.querySelector(`li[data-id="${id}"]`);
  if (li) {
    const updated = tasks[idx];
    li.classList.toggle('completed', updated.completed);
    const cb = li.querySelector('.todo-toggle');
    if (cb) {
      cb.checked = updated.completed;
      cb.setAttribute('aria-label',
        `Mark "${updated.name}" as ${updated.completed ? 'incomplete' : 'complete'}`);
    }
  } else {
    renderTaskList(tasks);
  }
}

function deleteTask(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  const removed = tasks.splice(idx, 1)[0];
  if (!persistTasks()) { tasks.splice(idx, 0, removed); renderTaskList(tasks); return; }
  const list = document.getElementById('todo-list');
  const li   = list && list.querySelector(`li[data-id="${id}"]`);
  if (li) li.remove();
}

function enterEditMode(li, task) {
  li.querySelector('.todo-text').style.display       = 'none';
  li.querySelector('.todo-edit-btn').style.display   = 'none';
  li.querySelector('.todo-delete-btn').style.display = 'none';
  const cb = li.querySelector('.todo-toggle');
  if (cb) cb.style.display = 'none';

  const editInput     = document.createElement('input');
  editInput.type      = 'text';
  editInput.className = 'todo-edit-input';
  editInput.maxLength = 200;
  editInput.value     = task.name;

  const confirmBtn       = document.createElement('button');
  confirmBtn.type        = 'button';
  confirmBtn.className   = 'todo-confirm-btn';
  confirmBtn.textContent = '✓';
  confirmBtn.setAttribute('aria-label', 'Confirm edit');

  const cancelBtn       = document.createElement('button');
  cancelBtn.type        = 'button';
  cancelBtn.className   = 'todo-cancel-btn';
  cancelBtn.textContent = '✗';
  cancelBtn.setAttribute('aria-label', 'Cancel edit');

  const editErr     = document.createElement('span');
  editErr.className = 'todo-edit-error';
  editErr.setAttribute('role', 'alert');

  li.append(editInput, confirmBtn, cancelBtn, editErr);
  editInput.focus();

  const doConfirm = () => editTask(task.id, editInput.value, li, task);
  const doCancel  = () => exitEditMode(li, task);
  confirmBtn.addEventListener('click', doConfirm);
  cancelBtn.addEventListener('click', doCancel);
  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); doConfirm(); }
    if (e.key === 'Escape') { e.preventDefault(); doCancel(); }
  });
}

function exitEditMode(li, task) {
  const editInput  = li.querySelector('.todo-edit-input');
  const confirmBtn = li.querySelector('.todo-confirm-btn');
  const cancelBtn  = li.querySelector('.todo-cancel-btn');
  const editErr    = li.querySelector('.todo-edit-error');
  if (editInput)  editInput.remove();
  if (confirmBtn) confirmBtn.remove();
  if (cancelBtn)  cancelBtn.remove();
  if (editErr)    editErr.remove();
  const span = li.querySelector('.todo-text');
  if (span) { span.textContent = task.name; span.style.display = ''; }
  const editBtn   = li.querySelector('.todo-edit-btn');
  const deleteBtn = li.querySelector('.todo-delete-btn');
  const cb        = li.querySelector('.todo-toggle');
  if (editBtn)   editBtn.style.display   = '';
  if (deleteBtn) deleteBtn.style.display = '';
  if (cb)        cb.style.display        = '';
}

function editTask(id, newName, li, task) {
  const trimmed = (newName || '').trim();
  const editErr = li && li.querySelector('.todo-edit-error');
  if (trimmed === '') { exitEditMode(li, task); return; }
  if (trimmed.length > 200) {
    if (editErr) editErr.textContent = 'Task name must not exceed 200 characters.';
    return;
  }
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) { exitEditMode(li, task); return; }
  const oldName   = tasks[idx].name;
  tasks[idx].name = trimmed;
  if (!persistTasks()) {
    tasks[idx].name = oldName;
    if (editErr) editErr.textContent = 'Unable to save — storage is full or unavailable';
    return;
  }
  task.name = trimmed;
  exitEditMode(li, task);
}

function initTodoList() {
  try {
    tasks = safeRead('todo_tasks', []);
    renderTaskList(tasks);
    const input    = document.getElementById('todo-input');
    const addBtn   = document.getElementById('todo-add-btn');
    const todoList = document.getElementById('todo-list');
    if (addBtn)   addBtn.addEventListener('click', () => addTask(input ? input.value : ''));
    if (input)    input.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(input.value); });
    if (todoList) {
      todoList.addEventListener('change', e => {
        const cb = e.target.closest('.todo-toggle');
        if (!cb) return;
        const li = cb.closest('li[data-id]');
        if (li) toggleTask(li.dataset.id);
      });
      todoList.addEventListener('click', e => {
        const li = e.target.closest('li[data-id]');
        if (!li) return;
        const id   = li.dataset.id;
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        if (e.target.closest('.todo-edit-btn'))   enterEditMode(li, task);
        else if (e.target.closest('.todo-delete-btn')) deleteTask(id);
      });
    }
  } catch (e) {
    console.error('initTodoList error:', e);
  }
}

// =============================================================================
// QUICK LINKS MODULE
// =============================================================================

let links = [];

function isValidUrl(url) {
  const t = (url || '').trim();
  return t.startsWith('http://') || t.startsWith('https://');
}

function persistLinks() {
  const ok    = safeWrite('quick_links', links);
  const errEl = document.querySelector('.links-error');
  if (!ok) {
    if (errEl) errEl.textContent = 'Unable to save — storage is full or unavailable';
    return false;
  }
  if (errEl) errEl.textContent = '';
  return true;
}

function renderLinkItem(link) {
  const div      = document.createElement('div');
  div.className  = 'link-item';
  div.dataset.id = link.id;
  const a           = document.createElement('a');
  a.href            = link.url;
  a.target          = '_blank';
  a.rel             = 'noopener noreferrer';
  a.className       = 'link-btn';
  a.textContent     = link.label;
  const deleteBtn       = document.createElement('button');
  deleteBtn.type        = 'button';
  deleteBtn.className   = 'link-delete-btn';
  deleteBtn.textContent = '✕';
  deleteBtn.setAttribute('aria-label', `Delete link "${link.label}"`);
  div.append(a, deleteBtn);
  return div;
}

function renderLinks(linksArray) {
  const grid = document.getElementById('links-grid');
  if (!grid) return;
  grid.innerHTML = '';
  linksArray.forEach(link => grid.appendChild(renderLinkItem(link)));
}

function addLink(label, url) {
  const errEl     = document.querySelector('.links-error');
  const trimLabel = (label || '').trim();
  const trimUrl   = (url   || '').trim();
  if (errEl) errEl.textContent = '';
  if (trimLabel === '') { if (errEl) errEl.textContent = 'Label is required'; return; }
  if (!isValidUrl(trimUrl)) {
    if (errEl) errEl.textContent = 'A valid URL starting with http:// or https:// is required';
    return;
  }
  if (links.length >= 50) { if (errEl) errEl.textContent = 'Maximum of 50 links reached'; return; }
  const link = {
    id:    (typeof crypto !== 'undefined' && crypto.randomUUID)
             ? crypto.randomUUID() : String(Date.now()),
    label: trimLabel,
    url:   trimUrl,
  };
  links.push(link);
  if (!persistLinks()) { links.pop(); return; }
  renderLinks(links);
  const labelInput = document.getElementById('link-label-input');
  const urlInput   = document.getElementById('link-url-input');
  if (labelInput) labelInput.value = '';
  if (urlInput)   urlInput.value   = '';
}

function deleteLink(id) {
  const idx = links.findIndex(l => l.id === id);
  if (idx === -1) return;
  const removed = links.splice(idx, 1)[0];
  if (!persistLinks()) { links.splice(idx, 0, removed); renderLinks(links); return; }
  const grid = document.getElementById('links-grid');
  const div  = grid && grid.querySelector(`.link-item[data-id="${id}"]`);
  if (div) div.remove();
}

function initQuickLinks() {
  try {
    const raw = safeRead('quick_links', []);
    links = raw.filter(l => l && typeof l.label === 'string' && typeof l.url === 'string');
    renderLinks(links);
    const addBtn    = document.getElementById('link-add-btn');
    const linksGrid = document.getElementById('links-grid');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const labelInput = document.getElementById('link-label-input');
        const urlInput   = document.getElementById('link-url-input');
        addLink(labelInput ? labelInput.value : '', urlInput ? urlInput.value : '');
      });
    }
    if (linksGrid) {
      linksGrid.addEventListener('click', e => {
        const btn = e.target.closest('.link-delete-btn');
        if (!btn) return;
        const div = btn.closest('.link-item[data-id]');
        if (div) deleteLink(div.dataset.id);
      });
    }
  } catch (e) {
    console.error('initQuickLinks error:', e);
  }
}

// =============================================================================
// BOOTSTRAP
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  [initTheme, initGreeting, initTimer, initTodoList, initQuickLinks].forEach(fn => {
    try { fn(); } catch (e) { console.error(`${fn.name} failed:`, e); }
  });
});

// =============================================================================
// CONDITIONAL EXPORTS — Node.js / test runner only
// =============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    safeRead, safeWrite, safeReadValue,
    getGreetingText, formatTime, formatDate, buildGreetingString,
    renderGreeting, initGreeting,
    renderTimer, setTimerControls, timerTick,
    startTimer, stopTimer, resetTimer, setPomodoroDuration, initTimer,
    renderTaskItem, renderTaskList,
    addTask, toggleTask, deleteTask, enterEditMode, exitEditMode, editTask,
    initTodoList, persistTasks,
    isValidUrl, renderLinkItem, renderLinks,
    addLink, deleteLink, initQuickLinks, persistLinks,
    applyTheme, initTheme,
  };
}
