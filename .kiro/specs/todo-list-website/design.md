# Design Document — todo-list-website

## Overview

The **todo-list-website** is a single-page dashboard designed to replace or supplement the browser new-tab page. It is built exclusively with HTML, CSS, and Vanilla JavaScript — no frameworks, no build tools, no backend server. All persistent state lives in the browser's `localStorage` API.

The dashboard presents four self-contained panels on a single HTML page:

| Panel | Purpose |
|---|---|
| **Greeting Panel** | Displays the current time, date, and a time-of-day greeting |
| **Focus Timer** | 25-minute Pomodoro countdown with start / stop / reset |
| **To-Do List** | Full CRUD task management with localStorage persistence |
| **Quick Links** | Shortcut buttons to user-defined URLs |

Because there is no backend, the design prioritises clean DOM manipulation patterns, reliable `localStorage` read/write with graceful error handling, and a responsive CSS layout that works from 320 px to 1920 px.

---

## Architecture

The app follows a **thin MVC-like structure** entirely within a single JavaScript module file. There are no module bundlers; all code executes when the page loads via a single `<script src="js/app.js" defer>` tag.

```
index.html
├── css/
│   └── style.css          ← all styles; no inline CSS in HTML
└── js/
    └── app.js             ← all behaviour; no inline JS in HTML
```

### Execution Flow

```
DOMContentLoaded
    │
    ├─▶ initGreeting()     — read clock, start 60-second interval
    ├─▶ initTimer()        — render "25:00", wire up controls
    ├─▶ initTodoList()     — load from localStorage, render tasks
    └─▶ initQuickLinks()   — load from localStorage, render links
```

Each `init*` function is independent. A failure in one panel must not prevent the others from initialising (each wrapped in a try/catch during startup).

### Module Organisation (within app.js)

```
app.js
 ├── CONSTANTS
 ├── Storage helpers      — safeRead(), safeWrite()
 ├── Greeting module      — state, render, interval
 ├── Timer module         — state machine, interval, render
 ├── TodoList module      — CRUD, render, storage sync
 ├── QuickLinks module    — CRUD, render, storage sync
 └── Bootstrap            — DOMContentLoaded listener calling all init*()
```

---

## Components and Interfaces

### 1. Storage Helpers

Two utility functions used by every module that touches `localStorage`.

```js
/**
 * Reads and JSON-parses a localStorage key.
 * Returns `defaultValue` when the key is absent, the value is not valid
 * JSON, or not of the expected type.
 */
function safeRead(key, defaultValue) { … }

/**
 * JSON-serialises `value` and writes it to localStorage.
 * Returns true on success, false if a storage error occurs.
 * Callers must check the return value and show an error when false.
 */
function safeWrite(key, value) { … }
```

### 2. Greeting Panel

**DOM anchor:** `#greeting-panel`

**Rendered elements:**
- `#greeting-time` — HH:MM display
- `#greeting-date` — "Weekday, Month D, YYYY" display
- `#greeting-text` — "Good Morning / Afternoon / Evening / Night"

**Interface:**

```js
function initGreeting()              // sets up state and starts interval
function renderGreeting(now)         // takes a Date, updates all three elements
function getGreetingText(hour)       // pure: number → string
function formatTime(now)             // pure: Date → "HH:MM"
function formatDate(now)             // pure: Date → "Weekday, Month D, YYYY"
```

**Update cadence:** A single `setInterval` fires every 60 000 ms; on each tick the panel re-reads `new Date()` and calls `renderGreeting`. There is no separate midnight watcher — the 60-second interval naturally catches the date change.

### 3. Focus Timer

**DOM anchor:** `#timer-panel`

**Rendered elements:**
- `#timer-display` — MM:SS display
- `#timer-start` — Start button
- `#timer-stop` — Stop button
- `#timer-reset` — Reset button

**State machine:**

```
STOPPED ──[start]──▶ RUNNING
RUNNING ──[stop] ──▶ PAUSED
RUNNING ──[00:00]──▶ STOPPED
PAUSED  ──[start]──▶ RUNNING
* ──────[reset] ──▶ STOPPED (remainingSeconds = 1500)
```

**Interface:**

```js
function initTimer()
function startTimer()
function stopTimer()
function resetTimer()
function timerTick()           // called by setInterval every 1000 ms
function renderTimer(seconds)  // pure: number → updates #timer-display
function setTimerControls(state) // enables/disables buttons per state
```

`intervalId` is stored in the Timer module's closure. `startTimer` guards against duplicate intervals by checking `intervalId !== null`.

### 4. To-Do List

**DOM anchor:** `#todo-panel`

**Rendered elements:**
- `#todo-input` — text input (maxlength 200)
- `#todo-add-btn` — submit button
- `#todo-list` — `<ul>` containing task `<li>` items
- `.todo-error` — inline validation message area

**Per-task `<li>` structure:**

```
<li data-id="…">
  <input type="checkbox" class="todo-toggle">
  <span class="todo-text">…</span>
  <button class="todo-edit-btn">Edit</button>
  <button class="todo-delete-btn">Delete</button>
  <!-- replaced when editing: -->
  <input class="todo-edit-input" type="text" maxlength="200">
  <button class="todo-confirm-btn">✓</button>
  <button class="todo-cancel-btn">✗</button>
</li>
```

**Interface:**

```js
function initTodoList()
function addTask(name)              // validates, writes storage, renders
function editTask(id, newName)      // validates, writes storage, re-renders item
function deleteTask(id)             // writes storage, removes <li>
function toggleTask(id)             // flips completed, writes storage, re-styles
function renderTaskList(tasks)      // full re-render of #todo-list
function renderTaskItem(task)       // returns a populated <li> Node
function persistTasks()             // safeWrite + error display on failure
function enterEditMode(li, task)    // swaps display text for edit input
function exitEditMode(li, task)     // restores display text
```

**Storage key:** `"todo_tasks"`

### 5. Quick Links

**DOM anchor:** `#links-panel`

**Rendered elements:**
- `#link-label-input` — label field (maxlength 100)
- `#link-url-input` — URL field (maxlength 2048)
- `#link-add-btn` — submit button
- `#links-grid` — container for link buttons
- `.links-error` — inline validation/error area

**Per-link element:**

```
<div class="link-item" data-id="…">
  <a href="…" target="_blank" rel="noopener noreferrer" class="link-btn">Label</a>
  <button class="link-delete-btn">✕</button>
</div>
```

**Interface:**

```js
function initQuickLinks()
function addLink(label, url)        // validates, writes storage, renders
function deleteLink(id)             // writes storage, removes element
function renderLinks(links)         // full re-render of #links-grid
function renderLinkItem(link)       // returns a populated div Node
function persistLinks()             // safeWrite + error display on failure
function isValidUrl(url)            // pure: string → boolean (http/https check)
```

**Storage key:** `"quick_links"`

---

## Data Models

### Task

```js
{
  id:        string,   // crypto.randomUUID() or Date.now().toString()
  name:      string,   // trimmed, 1–200 characters
  completed: boolean   // false = pending, true = done
}
```

**localStorage shape (`"todo_tasks"` key):**

```json
[
  { "id": "1717200000000", "name": "Write unit tests", "completed": false },
  { "id": "1717200001234", "name": "Review PR", "completed": true }
]
```

### Link

```js
{
  id:    string,  // crypto.randomUUID() or Date.now().toString()
  label: string,  // trimmed, 1–100 characters
  url:   string   // trimmed, begins with http:// or https://, max 2048 chars
}
```

**localStorage shape (`"quick_links"` key):**

```json
[
  { "id": "1717200005000", "label": "GitHub", "url": "https://github.com" },
  { "id": "1717200006000", "label": "MDN",    "url": "https://developer.mozilla.org" }
]
```

### Timer State (in-memory only, never persisted)

```js
{
  state:            "STOPPED" | "RUNNING" | "PAUSED",
  remainingSeconds: number,   // 0–1500
  intervalId:       number | null
}
```

### Greeting State (in-memory only)

```js
{
  intervalId: number | null
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

> **Reflection note:** Requirements 2.3–2.6 each describe a different hour range for the same pure function `getGreetingText`. Rather than four separate properties that would all exercise the same code path, they are unified into a single exhaustive property (Property 1) that covers all 24 hours at once. Requirements 6.2 and 6.3 are two directions of the same toggle operation; they are unified into a round-trip property (Property 7). Requirements 3.7 and 3.8 both describe control-state invariants for the timer and are merged into Property 3.

---

### Property 1: Greeting text covers every hour exactly once

*For any* integer hour in the range [0, 23], `getGreetingText(hour)` SHALL return exactly one of {"Good Morning", "Good Afternoon", "Good Evening", "Good Night"} with no hour returning multiple values and no hour returning any other value. Specifically:
- hours [5, 11] → "Good Morning"
- hours [12, 17] → "Good Afternoon"
- hours [18, 21] → "Good Evening"
- hours {0, 1, 2, 3, 4, 22, 23} → "Good Night"

**Validates: Requirements 2.3, 2.4, 2.5, 2.6**

---

### Property 2: `formatDate` output matches the required pattern for any date

*For any* Date object, `formatDate(date)` SHALL return a string matching the pattern `"<Weekday>, <Month> <D>, <YYYY>"` (e.g., "Monday, June 1, 2026"), where Weekday and Month are full English names, D is the non-zero-padded day, and YYYY is the four-digit year.

**Validates: Requirements 2.2**

---

### Property 3: Timer controls always reflect the current timer state

*For any* timer state (STOPPED, RUNNING, or PAUSED), the Start and Stop button `disabled` attributes SHALL satisfy: Start is enabled ↔ state is STOPPED or PAUSED; Stop is enabled ↔ state is RUNNING. This invariant SHALL hold after every state transition (start, stop, reset, natural expiry).

**Validates: Requirements 3.2, 3.4, 3.5, 3.6, 3.7, 3.8**

---

### Property 4: Timer display is always a valid MM:SS string

*For any* integer `seconds` in [0, 1500], `renderTimer(seconds)` SHALL produce a string of the form `MM:SS` where the two-digit MM and SS values correctly represent the minutes and seconds of `seconds`, and the total value MM×60 + SS equals `seconds`.

**Validates: Requirements 3.1, 3.3**

---

### Property 5: Adding a valid task grows the task list by exactly one

*For any* task array and any string whose trimmed value is non-empty and at most 200 characters, calling `addTask(name)` SHALL increase the task array length by exactly one and the new entry SHALL appear at the end with the trimmed name and `completed: false`.

**Validates: Requirements 4.2**

---

### Property 6: Whitespace-only and empty task names are rejected

*For any* string whose trimmed value is empty (composed entirely of whitespace characters or of zero length), calling `addTask(name)` SHALL leave the task array unchanged and SHALL NOT call `localStorage.setItem`.

**Validates: Requirements 4.3**

---

### Property 7: Task completion toggle is a round trip

*For any* task in the task list, toggling its completion status twice (activate toggle → activate toggle again) SHALL restore the task to its original `completed` value and the persisted localStorage array SHALL reflect that restored state.

**Validates: Requirements 6.2, 6.3**

---

### Property 8: Deleting a task removes exactly that task

*For any* task array containing at least one task, deleting a task by its `id` SHALL decrease the array length by exactly one and the deleted task's `id` SHALL not appear in the remaining array; all other tasks SHALL be unmodified.

**Validates: Requirements 6.5**

---

### Property 9: Task storage round-trip preserves all fields

*For any* array of task objects, serializing with `JSON.stringify` and deserializing with `JSON.parse` SHALL produce an array of equal length whose entries have identical `id`, `name`, and `completed` values.

**Validates: Requirements 7.2**

---

### Property 10: Corrupted localStorage is handled gracefully without throwing

*For any* arbitrary string stored at `"todo_tasks"` or `"quick_links"` — including non-JSON strings, valid JSON non-arrays, and empty strings — `safeRead(key, defaultValue)` SHALL return `defaultValue` and SHALL NOT throw an uncaught exception.

**Validates: Requirements 7.3, 9.3**

---

### Property 11: Valid URL detection is consistent with the http/https rule

*For any* string, `isValidUrl(url)` SHALL return `true` if and only if the trimmed string starts with `http://` or `https://`, and SHALL return `false` for all other inputs (empty, whitespace-only, other schemes such as `ftp://`, relative paths, etc.).

**Validates: Requirements 8.2, 8.4**

---

### Property 12: Adding a valid link grows the link list by exactly one

*For any* links array whose length is in [0, 49], a non-empty trimmed label, and a valid URL (starts with `http://` or `https://`), calling `addLink(label, url)` SHALL increase the links array length by exactly one and the new entry SHALL contain the provided label and url.

**Validates: Requirements 8.2**

---

### Property 13: Link list never exceeds 50 entries

*For any* links array whose length is exactly 50, calling `addLink` with any label and URL SHALL leave the array length at 50 and the array contents unchanged.

**Validates: Requirements 8.5**

---

### Property 14: Quick Links storage round-trip preserves all fields

*For any* array of link objects, serializing with `JSON.stringify` and deserializing with `JSON.parse` SHALL produce an array of equal length whose entries have identical `id`, `label`, and `url` values.

**Validates: Requirements 9.2**

---

## Error Handling

### Storage Errors

Both `safeWrite` calls wrap `localStorage.setItem` in a try/catch. When a `QuotaExceededError` (or any other error) is caught:

1. The function returns `false`.
2. The calling module (Todo or QuickLinks) displays an inline non-blocking message: **"Unable to save — storage is full or unavailable"**.
3. The in-memory array and rendered DOM are **not** updated, keeping the UI consistent with the last successfully persisted state.

```js
function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}
```

### Malformed localStorage Data

`safeRead` catches `JSON.parse` failures and type mismatches:

```js
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
```

For Quick Links, an additional filter is applied after parsing to discard entries missing `label` or `url` fields (Requirement 9.3).

### Timer Edge Cases

- `timerTick` guards against `remainingSeconds < 0` and clamps to 0.
- `startTimer` checks `intervalId !== null` before creating a new interval to prevent double-running.

### Greeting Edge Cases

- `getGreetingText` uses explicit range checks covering all 24 hours; a final `else` branch returns "Good Night" as a safe fallback.

### Panel Isolation

Each `init*` call in the bootstrap is wrapped:

```js
document.addEventListener('DOMContentLoaded', () => {
  [initGreeting, initTimer, initTodoList, initQuickLinks].forEach(fn => {
    try { fn(); } catch (e) { console.error(e); }
  });
});
```

A JavaScript error in one panel will not block the others.

---

## Testing Strategy

### Applicability Assessment

This feature contains pure functions (`getGreetingText`, `formatTime`, `formatDate`, `renderTimer`, `isValidUrl`) and data-transformation logic (`addTask`, `editTask`, `toggleTask`, `addLink`, `safeRead`, `safeWrite`) that vary meaningfully with input. Property-based testing is appropriate for these units.

UI rendering (DOM manipulation, CSS layout) and `localStorage` I/O will be covered by example-based tests and manual/integration checks.

### Recommended PBT Library

**fast-check** (JavaScript) — runs in Node.js without a browser, integrates with any test runner, and has built-in arbitraries for strings, integers, arrays, and objects.

### Unit Tests (example-based)

Focus on:
- Specific greeting outputs at boundary hours (4, 5, 11, 12, 17, 18, 21, 22)
- Timer display for known values (0 → "00:00", 1500 → "25:00", 90 → "01:30")
- Task/link CRUD with concrete inputs
- Storage error handling with a mocked `localStorage`
- Invalid Quick Links URL examples (`ftp://`, `//`, empty string)

### Property-Based Tests

Each property test MUST run a minimum of **100 iterations**. Each test MUST include a comment referencing its design property in the format:

```
// Feature: todo-list-website, Property N: <property_text>
```

| Property | Test description |
|---|---|
| 1 | Generate integers from each of the four hour ranges; assert `getGreetingText` returns the correct string and only valid strings |
| 2 | Generate random Date objects; assert `formatDate` output matches `"<Weekday>, <Month> <D>, <YYYY>"` pattern |
| 3 | Simulate state transitions; assert Start/Stop `disabled` attributes match the expected rule for every resulting state |
| 4 | Generate integers [0,1500]; assert `renderTimer` output matches `MM:SS` regex and MM×60+SS equals input |
| 5 | Generate non-empty, ≤200-char trimmed strings; assert `addTask` increases array length by 1 and last entry has correct name |
| 6 | Generate whitespace-only strings; assert `addTask` leaves array unchanged and never calls `localStorage.setItem` |
| 7 | Generate tasks with random `completed`; toggle twice; assert `completed` restores and storage reflects it |
| 8 | Generate random task arrays; delete one task; assert array shrinks by 1 and deleted id is absent |
| 9 | Generate random task arrays; assert JSON round-trip preserves id, name, completed for all entries |
| 10 | Generate arbitrary strings; assert `safeRead` returns defaultValue without throwing |
| 11 | Generate random strings; assert `isValidUrl` returns true iff starts with `http://` or `https://` |
| 12 | Generate arrays of 0–49 links with valid label/url; assert `addLink` grows array by 1 |
| 13 | Generate arrays of exactly 50 links; assert `addLink` is a no-op |
| 14 | Generate random link arrays; assert JSON round-trip preserves id, label, url for all entries |

### Integration / Manual Tests

- Open `index.html` in Chrome, Firefox, Edge, Safari; verify no console errors and all four panels render (Requirement 1.5)
- Resize viewport from 320 px to 1920 px; verify no horizontal scrollbar or clipping (Requirement 10.4)
- Fill `localStorage` to near-quota, then attempt to add a task; verify the error message appears and the list is unchanged (Requirements 7.4, 9.4)
- Verify focus indicators appear on all interactive controls via keyboard navigation (Requirement 10.5)
- Verify colour contrast ratios using a browser accessibility tool (Requirement 10.2)
