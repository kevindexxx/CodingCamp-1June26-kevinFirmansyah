# Implementation Plan: todo-list-website

## Overview

Implement a single-page dashboard using HTML, CSS, and Vanilla JavaScript only. All four panels (Greeting, Focus Timer, To-Do List, Quick Links) are wired together in `index.html` + `css/style.css` + `js/app.js`. All state is persisted via `localStorage`. Testing uses **fast-check** for the 14 correctness properties defined in the design, plus example-based unit tests.

---

## Tasks

- [x] 1. Project scaffolding — create file structure and HTML skeleton
  - Create `index.html` with the required `<!DOCTYPE html>` boilerplate, a single `<link rel="stylesheet" href="css/style.css">` tag, and a single `<script src="js/app.js" defer></script>` tag; no `<style>` blocks and no inline JS allowed
  - Add the four semantic panel landmarks: `#greeting-panel`, `#timer-panel`, `#todo-panel`, `#links-panel`
  - Inside each panel add the exact element IDs and classes listed in the design (e.g. `#greeting-time`, `#timer-display`, `#todo-input`, `#links-grid`, etc.)
  - Create `css/style.css` and `js/app.js` as empty files to satisfy the browser's resource requests
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Storage helpers
  - [x] 2.1 Implement `safeRead(key, defaultValue)` in `js/app.js`
    - Parse the value at `key`; return `defaultValue` when the key is absent, when the value is not valid JSON, or when the parsed value is not an array
    - _Requirements: 7.1, 7.3, 9.1, 9.3_

  - [x] 2.2 Implement `safeWrite(key, value)` in `js/app.js`
    - Wrap `localStorage.setItem` in try/catch; return `true` on success, `false` on any error (including `QuotaExceededError`)
    - _Requirements: 7.2, 7.4, 8.9, 9.2, 9.4_

  - [ ]* 2.3 Write property test for `safeRead` — Property 10
    - **Property 10: Corrupted localStorage is handled gracefully without throwing**
    - Generate arbitrary strings (including non-JSON, valid JSON non-arrays, empty string) as the stored value; assert `safeRead` returns `defaultValue` and does not throw
    - **Validates: Requirements 7.3, 9.3**
    - `// Feature: todo-list-website, Property 10: Corrupted localStorage is handled gracefully without throwing`

- [ ] 3. Greeting Panel
  - [x] 3.1 Implement `getGreetingText(hour)` — pure function
    - Return "Good Morning" for hours [5, 11], "Good Afternoon" for [12, 17], "Good Evening" for [18, 21], "Good Night" for {0–4, 22–23}; include a safe `else` fallback returning "Good Night"
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.2 Write property test for `getGreetingText` — Property 1
    - **Property 1: Greeting text covers every hour exactly once**
    - Generate integers from [0, 23]; assert the return value is one of the four valid strings and matches the correct range rule for every possible hour
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6**
    - `// Feature: todo-list-website, Property 1: Greeting text covers every hour exactly once`

  - [x] 3.3 Implement `formatTime(now)` — pure function
    - Accept a `Date`, return a string in `HH:MM` 24-hour format with zero-padded hours and minutes
    - _Requirements: 2.1_

  - [x] 3.4 Implement `formatDate(now)` — pure function
    - Accept a `Date`, return a string in `"Weekday, Month D, YYYY"` format (e.g. `"Monday, June 1, 2026"`) using full English weekday and month names and non-zero-padded day
    - _Requirements: 2.2_

  - [ ]* 3.5 Write property test for `formatDate` — Property 2
    - **Property 2: `formatDate` output matches the required pattern for any date**
    - Generate random `Date` objects; assert the output matches the regex `/<Weekday>, <Month> \d{1,2}, \d{4}/` where weekday and month are full English names
    - **Validates: Requirements 2.2**
    - `// Feature: todo-list-website, Property 2: formatDate output matches the required pattern for any date`

  - [-] 3.6 Implement `renderGreeting(now)`, `initGreeting()`
    - `renderGreeting` takes a `Date` and updates `#greeting-time`, `#greeting-date`, `#greeting-text` in the DOM
    - `initGreeting` calls `renderGreeting(new Date())` immediately, then starts a 60 000 ms `setInterval` that calls `renderGreeting(new Date())` on each tick
    - Wrap in try/catch so a failure here cannot block other panels
    - _Requirements: 2.1, 2.2, 2.7_

  - [ ]* 3.7 Write unit tests for Greeting boundary hours
    - Test `getGreetingText` at boundary values: 4, 5, 11, 12, 17, 18, 21, 22
    - Test `formatTime` for midnight (00:00) and noon (12:00)
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [ ] 4. Focus Timer
  - [x] 4.1 Implement `renderTimer(seconds)` — pure function
    - Accept an integer in [0, 1500]; return and write the `MM:SS` string to `#timer-display` where MM×60+SS equals the input, with zero-padded two-digit MM and SS
    - _Requirements: 3.1, 3.3_

  - [ ]* 4.2 Write property test for `renderTimer` — Property 4
    - **Property 4: Timer display is always a valid MM:SS string**
    - Generate integers in [0, 1500]; assert the output matches `/^\d{2}:\d{2}$/` and MM×60+SS equals the input
    - **Validates: Requirements 3.1, 3.3**
    - `// Feature: todo-list-website, Property 4: Timer display is always a valid MM:SS string`

  - [x] 4.3 Implement `setTimerControls(state)` — pure DOM update
    - Accept `"STOPPED"`, `"RUNNING"`, or `"PAUSED"`; set `#timer-start.disabled` and `#timer-stop.disabled` according to the state machine: Start enabled ↔ state is STOPPED or PAUSED; Stop enabled ↔ state is RUNNING
    - _Requirements: 3.2, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 4.4 Write property test for timer control state — Property 3
    - **Property 3: Timer controls always reflect the current timer state**
    - Simulate all state transitions (start → stop → start → reset, etc.) via `setTimerControls`; assert the `disabled` invariants hold after every transition
    - **Validates: Requirements 3.2, 3.4, 3.5, 3.6, 3.7, 3.8**
    - `// Feature: todo-list-website, Property 3: Timer controls always reflect the current timer state`

  - [-] 4.5 Implement `timerTick()`, `startTimer()`, `stopTimer()`, `resetTimer()`, `initTimer()`
    - `timerTick` decrements `remainingSeconds`, clamps to 0, calls `renderTimer`, stops the interval and calls `setTimerControls("STOPPED")` when `remainingSeconds` reaches 0
    - `startTimer` guards against a running interval (`intervalId !== null`), sets state to RUNNING, calls `setTimerControls("RUNNING")`, creates interval calling `timerTick`
    - `stopTimer` clears the interval, sets state to PAUSED, calls `setTimerControls("PAUSED")`
    - `resetTimer` clears any interval, sets `remainingSeconds = 1500`, calls `renderTimer(1500)` and `setTimerControls("STOPPED")`
    - `initTimer` sets initial state to STOPPED with 1500 s remaining, renders "25:00", disables Stop button, wires click events
    - Wrap in try/catch during bootstrap
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 4.6 Write unit tests for timer known values
    - Assert `renderTimer(0)` → `"00:00"`, `renderTimer(1500)` → `"25:00"`, `renderTimer(90)` → `"01:30"`
    - _Requirements: 3.1, 3.3_

- [~] 5. Checkpoint — ensure storage helpers and greeting/timer modules work
  - Ensure all passing tests continue to pass; open `index.html` in a browser and verify `#greeting-time` ticks, timer starts/stops/resets correctly, and no console errors appear
  - Ask the user if any issues or questions arise before proceeding

- [ ] 6. To-Do List — core CRUD
  - [ ] 6.1 Implement `renderTaskItem(task)` and `renderTaskList(tasks)`
    - `renderTaskItem` returns a populated `<li>` with `data-id`, checkbox `.todo-toggle`, `<span class="todo-text">`, Edit / Delete buttons; apply done styles (`line-through`, reduced opacity) when `task.completed` is true
    - `renderTaskList` clears `#todo-list` and appends a `<li>` for each task
    - _Requirements: 4.1, 6.1, 6.4_

  - [~] 6.2 Implement `addTask(name)` with `persistTasks()`
    - Trim the input; reject if empty/whitespace (focus input, do not write storage) or if trimmed length > 200 (show inline validation); on success append `{ id, name: trimmedName, completed: false }` to the in-memory array, call `persistTasks()`, re-render the list, and clear the input
    - `persistTasks` calls `safeWrite("todo_tasks", tasks)`; on `false` return, show "Unable to save — storage is full or unavailable" and revert the in-memory change
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.2, 7.4_

  - [ ]* 6.3 Write property test for `addTask` valid input — Property 5
    - **Property 5: Adding a valid task grows the task list by exactly one**
    - Generate non-empty strings of trimmed length ≤ 200; assert array length increases by 1 and last entry has correct trimmed name and `completed: false`
    - **Validates: Requirements 4.2**
    - `// Feature: todo-list-website, Property 5: Adding a valid task grows the task list by exactly one`

  - [ ]* 6.4 Write property test for `addTask` invalid input — Property 6
    - **Property 6: Whitespace-only and empty task names are rejected**
    - Generate whitespace-only strings (spaces, tabs, newlines); assert array length is unchanged and `localStorage.setItem` is never called (use a spy/mock)
    - **Validates: Requirements 4.3**
    - `// Feature: todo-list-website, Property 6: Whitespace-only and empty task names are rejected`

  - [~] 6.5 Implement `toggleTask(id)`
    - Flip the `completed` field on the matching task; call `persistTasks()`; re-render only the affected `<li>` (or full list on failure)
    - _Requirements: 6.2, 6.3_

  - [ ]* 6.6 Write property test for task toggle round-trip — Property 7
    - **Property 7: Task completion toggle is a round trip**
    - Generate tasks with random `completed` values; toggle twice; assert `completed` returns to original value and the persisted array reflects that state
    - **Validates: Requirements 6.2, 6.3**
    - `// Feature: todo-list-website, Property 7: Task completion toggle is a round trip`

  - [~] 6.7 Implement `deleteTask(id)`
    - Remove the matching task from the in-memory array; call `persistTasks()`; remove the `<li>` from the DOM
    - _Requirements: 6.4, 6.5_

  - [ ]* 6.8 Write property test for `deleteTask` — Property 8
    - **Property 8: Deleting a task removes exactly that task**
    - Generate random task arrays (length ≥ 1); delete a randomly chosen task by id; assert array length decreases by exactly 1 and deleted id is absent; assert all remaining tasks are unmodified
    - **Validates: Requirements 6.5**
    - `// Feature: todo-list-website, Property 8: Deleting a task removes exactly that task`

  - [ ]* 6.9 Write property test for task storage round-trip — Property 9
    - **Property 9: Task storage round-trip preserves all fields**
    - Generate random arrays of task objects; assert `JSON.parse(JSON.stringify(arr))` produces equal `id`, `name`, and `completed` for every entry
    - **Validates: Requirements 7.2**
    - `// Feature: todo-list-website, Property 9: Task storage round-trip preserves all fields`

- [ ] 7. To-Do List — edit mode and persistence bootstrap
  - [~] 7.1 Implement `enterEditMode(li, task)` and `exitEditMode(li, task)`
    - `enterEditMode` swaps the `<span>` and Edit/Delete buttons for a pre-filled `<input class="todo-edit-input" maxlength="200">`, a confirm button (✓), and a cancel button (✗); sets focus on the input
    - `exitEditMode` restores the original display state from `task.name`
    - _Requirements: 5.1, 5.2_

  - [~] 7.2 Implement `editTask(id, newName)`
    - Trim `newName`; if empty/whitespace → call `exitEditMode` without modifying storage; if trimmed length > 200 → show inline validation message; on success → update the in-memory task name, call `persistTasks()`, call `exitEditMode` with the updated task
    - Wire Escape key on the edit input to cancel; Enter key to confirm
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

  - [~] 7.3 Implement `initTodoList()`
    - Call `safeRead("todo_tasks", [])` to load the initial array; call `renderTaskList`; wire `#todo-add-btn` click and `#todo-input` keydown (Enter) to `addTask`; wrap in try/catch during bootstrap
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 7.4 Write unit tests for To-Do List storage error path
    - Mock `localStorage.setItem` to throw `QuotaExceededError`; assert the inline error message appears and the in-memory array and rendered DOM are unchanged
    - _Requirements: 7.4_

- [~] 8. Checkpoint — To-Do List functional
  - Ensure all To-Do property tests and unit tests pass; open `index.html` and manually add, edit, toggle, and delete a few tasks; reload the page and verify tasks persist correctly
  - Ask the user if any issues arise before proceeding

- [ ] 9. Quick Links — core CRUD
  - [-] 9.1 Implement `isValidUrl(url)` — pure function
    - Return `true` iff the trimmed string starts with `http://` or `https://`; return `false` for empty, whitespace-only, other schemes, or relative paths
    - _Requirements: 8.2, 8.4_

  - [ ]* 9.2 Write property test for `isValidUrl` — Property 11
    - **Property 11: Valid URL detection is consistent with the http/https rule**
    - Generate random strings; assert `isValidUrl` returns `true` iff the trimmed value starts with `http://` or `https://`; generate explicit `ftp://`, `//`, and empty-string cases to assert `false`
    - **Validates: Requirements 8.2, 8.4**
    - `// Feature: todo-list-website, Property 11: Valid URL detection is consistent with the http/https rule`

  - [~] 9.3 Implement `renderLinkItem(link)` and `renderLinks(links)`
    - `renderLinkItem` returns a `<div class="link-item" data-id="…">` containing an `<a href="…" target="_blank" rel="noopener noreferrer" class="link-btn">` and a delete button `<button class="link-delete-btn">✕</button>`
    - `renderLinks` clears `#links-grid` and appends a div for each link
    - _Requirements: 8.6, 8.7_

  - [~] 9.4 Implement `addLink(label, url)` with `persistLinks()`
    - Validate: trimmed label non-empty (else show "Label is required"); trimmed URL passes `isValidUrl` (else show "A valid URL starting with http:// or https:// is required"); current link count < 50 (else show "Maximum of 50 links reached")
    - On success: append `{ id, label: trimmedLabel, url: trimmedUrl }` to the in-memory array; call `persistLinks()`; re-render; clear inputs
    - `persistLinks` calls `safeWrite("quick_links", links)`; on `false` return, show "Unable to save — storage is full or unavailable" and revert the in-memory change
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.9, 9.2_

  - [ ]* 9.5 Write property test for `addLink` valid input — Property 12
    - **Property 12: Adding a valid link grows the link list by exactly one**
    - Generate links arrays of length [0, 49] with valid non-empty label and `http(s)://` URL; assert array grows by exactly 1 and new entry contains the provided label and url
    - **Validates: Requirements 8.2**
    - `// Feature: todo-list-website, Property 12: Adding a valid link grows the link list by exactly one`

  - [ ]* 9.6 Write property test for `addLink` at capacity — Property 13
    - **Property 13: Link list never exceeds 50 entries**
    - Generate arrays of exactly 50 links; assert `addLink` with any label/URL leaves the array at length 50 and contents unchanged
    - **Validates: Requirements 8.5**
    - `// Feature: todo-list-website, Property 13: Link list never exceeds 50 entries`

  - [~] 9.7 Implement `deleteLink(id)`
    - Remove the matching link from the in-memory array; call `persistLinks()`; remove the `.link-item` from the DOM
    - _Requirements: 8.7, 8.8_

  - [ ]* 9.8 Write property test for Quick Links storage round-trip — Property 14
    - **Property 14: Quick Links storage round-trip preserves all fields**
    - Generate random arrays of link objects; assert `JSON.parse(JSON.stringify(arr))` produces equal `id`, `label`, and `url` for every entry
    - **Validates: Requirements 9.2**
    - `// Feature: todo-list-website, Property 14: Quick Links storage round-trip preserves all fields`

  - [~] 9.9 Implement `initQuickLinks()`
    - Call `safeRead("quick_links", [])`, filter out entries missing `label` or `url`, store the clean array; call `renderLinks`; wire `#link-add-btn` click to `addLink`; wire delete clicks on `#links-grid` via event delegation; wrap in try/catch during bootstrap
    - _Requirements: 9.1, 9.3_

  - [ ]* 9.10 Write unit tests for Quick Links storage error path and URL validation
    - Mock `localStorage.setItem` to throw; assert inline error and unchanged DOM
    - Test `isValidUrl` with concrete inputs: `"https://example.com"` (true), `"http://x"` (true), `"ftp://x"` (false), `""` (false), `"  "` (false), `"//x"` (false)
    - _Requirements: 8.4, 8.9_

- [~] 10. Checkpoint — Quick Links functional
  - Ensure all Quick Links property tests and unit tests pass; open `index.html` and add, open, and delete links; reload and verify persistence
  - Ask the user if any issues arise before proceeding

- [ ] 11. Bootstrap wiring — connect all panels
  - [~] 11.1 Implement the `DOMContentLoaded` bootstrap in `js/app.js`
    - Loop over `[initGreeting, initTimer, initTodoList, initQuickLinks]` and call each inside a try/catch, logging errors to `console.error`; a failure in one panel must not block the others
    - Verify the app reaches an interactive state (all four panels visible, clock ticking, controls responding) with no console errors in Chrome
    - _Requirements: 1.1, 1.4, 1.5_

  - [ ]* 11.2 Write unit tests for panel isolation
    - Mock one `init*` function to throw; assert the other three panels still initialise (their DOM elements are populated)
    - _Requirements: 1.4_

- [ ] 12. Visual design and accessibility — `css/style.css`
  - [~] 12.1 Implement base layout and typography
    - Set `body` base font-size ≥ 14 px; no content text computes below 14 px
    - Establish typographic hierarchy: each heading level must be at least 4 px larger than the level below it (or 300 font-weight units heavier)
    - _Requirements: 10.1, 10.3_

  - [~] 12.2 Implement responsive four-panel layout
    - Use CSS Grid or Flexbox to place all four panels without horizontal overflow or content clipping from 320 px to 1920 px viewport width
    - Test using browser DevTools responsive mode at 320 px, 768 px, 1280 px, and 1920 px
    - _Requirements: 1.5, 10.4_

  - [~] 12.3 Implement colour scheme and contrast
    - Choose foreground/background colours achieving ≥ 4.5:1 contrast ratio for normal-weight body text and ≥ 3:1 for large text (≥ 18 px regular or ≥ 14 px bold), per WCAG 2.1 SC 1.4.3
    - Apply visual "done" style to completed tasks (strikethrough text, reduced opacity) while maintaining legibility
    - _Requirements: 6.2, 10.2_

  - [~] 12.4 Implement keyboard focus indicators
    - Apply a visible `:focus-visible` outline with minimum width 2 px on all interactive controls (buttons, inputs, links); ensure the indicator colour achieves ≥ 3:1 contrast against the adjacent background per WCAG 2.1 SC 2.4.7
    - _Requirements: 10.5_

- [ ] 13. Testing setup — install fast-check and write test harness
  - [~] 13.1 Set up fast-check and test runner
    - Add `fast-check` as a dev dependency (e.g. via `npm install --save-dev fast-check vitest` or equivalent); create a `tests/` directory with a `app.test.js` (or `.spec.js`) file that imports the pure functions exported from `js/app.js`
    - Export all pure functions (`getGreetingText`, `formatTime`, `formatDate`, `renderTimer`, `isValidUrl`) and CRUD functions (`addTask`, `editTask`, `toggleTask`, `deleteTask`, `addLink`, `deleteLink`, `safeRead`, `safeWrite`) via a conditional export block or a separate test-entry-point module
    - _Requirements: testing strategy in design_

  - [ ]* 13.2 Write all 14 property-based tests
    - Each test must include a comment `// Feature: todo-list-website, Property N: <property_text>` and run a minimum of 100 iterations via `fc.assert(fc.property(…), { numRuns: 100 })`
    - Cover Properties 1–14 as described in the design's property-based test table
    - _Requirements: design testing strategy_

  - [ ]* 13.3 Write all unit / example-based tests
    - Greeting boundary hours (4, 5, 11, 12, 17, 18, 21, 22) for `getGreetingText`
    - `formatTime` for midnight and noon
    - `renderTimer` for 0, 1500, and 90 seconds
    - `addTask`, `editTask`, `toggleTask`, `deleteTask` with concrete inputs
    - `addLink`, `deleteLink` with concrete inputs
    - `safeRead` / `safeWrite` with mocked `localStorage` (quota error path)
    - `isValidUrl` with the explicit examples from the design
    - _Requirements: design unit test list_

- [~] 14. Final checkpoint — all tests pass and cross-browser verification
  - Run the full test suite (`npm test` or equivalent); all property-based tests (min 100 iterations each) and unit tests must pass
  - Open `index.html` in Chrome, Firefox, Edge, and Safari; verify no console errors and all four panels render and function correctly (Requirement 1.5)
  - Resize viewport from 320 px to 1920 px; verify no horizontal scrollbar or clipping (Requirement 10.4)
  - Tab through all interactive controls and verify visible 2 px focus indicators (Requirement 10.5)
  - Verify colour contrast ratios using a browser accessibility tool (Requirement 10.2)
  - Ask the user if any final issues arise

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all 14 property tests are marked optional but strongly recommended
- Each task references specific requirements for full traceability back to the design and requirements documents
- The design uses Vanilla JavaScript (no framework, no build tools) — all code stays in `index.html`, `css/style.css`, and `js/app.js`; the only dev dependency is the test tooling
- All pure functions (`getGreetingText`, `formatTime`, `formatDate`, `renderTimer`, `isValidUrl`) must be unit-testable without a DOM; use conditional exports or a test-entry module
- `safeWrite` must always be called synchronously before any DOM update so the persisted state and rendered state remain consistent (Requirement 7.2)
- Panel isolation (try/catch around each `init*`) is a hard requirement — one broken panel must never crash the page

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2"] },
    { "id": 1, "tasks": ["2.3", "3.1", "3.3", "3.4", "4.1", "4.3"] },
    { "id": 2, "tasks": ["3.2", "3.5", "4.2", "4.4", "3.6"] },
    { "id": 3, "tasks": ["3.7", "4.5", "6.1", "9.1"] },
    { "id": 4, "tasks": ["4.6", "6.2", "9.2", "9.3"] },
    { "id": 5, "tasks": ["6.3", "6.4", "6.5", "9.4"] },
    { "id": 6, "tasks": ["6.6", "6.7", "9.5", "9.6", "9.7"] },
    { "id": 7, "tasks": ["6.8", "6.9", "7.1", "9.8", "9.9"] },
    { "id": 8, "tasks": ["7.2", "7.4", "9.10"] },
    { "id": 9, "tasks": ["7.3", "11.1"] },
    { "id": 10, "tasks": ["11.2", "12.1"] },
    { "id": 11, "tasks": ["12.2", "12.3", "12.4", "13.1"] },
    { "id": 12, "tasks": ["13.2", "13.3"] }
  ]
}
```
