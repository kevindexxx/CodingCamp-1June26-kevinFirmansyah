# Requirements Document

## Introduction

A to-do list website built as a dashboard / new tab page using only HTML, CSS, and Vanilla JavaScript with no backend server. All data is persisted client-side using the browser's Local Storage API. The app is usable as a standalone web page or a browser extension new-tab replacement. It consists of four main feature areas: a real-time Greeting panel, a Focus Timer, a To-Do List, and a Quick Links panel.

---

## Glossary

- **App**: The to-do list website as a whole.
- **Dashboard**: The single-page UI presented to the user.
- **Greeting_Panel**: The UI section that displays the current time, date, and a contextual greeting message.
- **Focus_Timer**: The UI section that provides a 25-minute countdown timer with start, stop, and reset controls.
- **Timer**: The countdown mechanism managed by the Focus_Timer.
- **Todo_List**: The UI section that allows the user to manage task items.
- **Task**: A single to-do item that can be added, edited, marked done, or deleted.
- **Quick_Links**: The UI section that stores and displays shortcut buttons to user-defined URLs.
- **Link**: A single Quick Links entry consisting of a label and a URL.
- **Storage**: The browser's Local Storage API used to persist data client-side.
- **Local_Storage**: The browser's `localStorage` object.

---

## Requirements

### Requirement 1: Single-Page Dashboard Layout

**User Story:** As a user, I want a clean single-page dashboard, so that I can access all features at a glance without navigating between pages.

#### Acceptance Criteria

1. THE App SHALL render all four feature panels (Greeting_Panel, Focus_Timer, Todo_List, Quick_Links) on a single HTML page without triggering a page reload at any point during normal use.
2. THE App SHALL use exactly one CSS file located in the `css/` directory for all styling; no `<style>` blocks or inline `style` attributes shall appear in the HTML file.
3. THE App SHALL use exactly one JavaScript file located in the `js/` directory for all behavior; no `<script>` blocks with inline JavaScript shall appear in the HTML file.
4. THE App SHALL reach an interactive state — defined as all four panels visible, the clock ticking, and all interactive controls responding to user input — within 2 seconds of the browser's `DOMContentLoaded` event firing, with no additional network requests after the initial page load.
5. THE App SHALL render all four panels without layout overflow, missing controls, or JavaScript console errors in the latest stable release of Chrome, Firefox, Edge, and Safari at the time of evaluation.

---

### Requirement 2: Greeting Panel

**User Story:** As a user, I want to see the current time, date, and a greeting based on the time of day, so that the dashboard feels personal and contextually relevant.

#### Acceptance Criteria

1. WHEN the App loads, THE Greeting_Panel SHALL immediately display the current local time in HH:MM (24-hour) format and SHALL update that display once every 60 seconds thereafter.
2. WHEN the App loads, THE Greeting_Panel SHALL immediately display the current local date in the format "Weekday, Month D, YYYY" (e.g., "Monday, June 1, 2026") and SHALL update that display at midnight each day.
3. IF the current local hour is in the range [05, 11] inclusive, THEN THE Greeting_Panel SHALL display the greeting text "Good Morning".
4. IF the current local hour is in the range [12, 17] inclusive, THEN THE Greeting_Panel SHALL display the greeting text "Good Afternoon".
5. IF the current local hour is in the range [18, 21] inclusive, THEN THE Greeting_Panel SHALL display the greeting text "Good Evening".
6. IF the current local hour is in the range [22, 23] or [0, 4] inclusive, THEN THE Greeting_Panel SHALL display the greeting text "Good Night".
7. WHEN the local clock crosses any hour boundary that changes the active greeting range, THE Greeting_Panel SHALL update the greeting text to reflect the new range within 60 seconds.

---

### Requirement 3: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can use the Pomodoro technique to manage focused work sessions.

#### Acceptance Criteria

1. WHEN the App loads, THE Focus_Timer SHALL display "25:00" and the Timer SHALL be in the stopped state.
2. WHEN the user activates the Start control while the Timer is stopped or paused, THE Timer SHALL begin counting down in one-second decrements; the Start control SHALL become disabled and the Stop control SHALL become enabled.
3. WHILE the Timer is counting down, THE Focus_Timer SHALL update the displayed MM:SS value once per elapsed second, with no duplicate or skipped updates under normal CPU load.
4. WHEN the user activates the Stop control while the Timer is counting down, THE Timer SHALL pause and retain the exact remaining time; the Stop control SHALL become disabled and the Start control SHALL become enabled.
5. WHEN the user activates the Reset control at any Timer state, THE Timer SHALL stop counting down and THE Focus_Timer SHALL display "25:00"; the Start control SHALL become enabled and the Stop control SHALL become disabled.
6. WHEN the Timer display reaches "00:00", THE Timer SHALL stop counting down automatically without user interaction; the Start control SHALL become enabled and the Stop control SHALL become disabled.
7. WHILE the Timer is counting down, THE Focus_Timer SHALL keep the Start control in a disabled state so that a second simultaneous interval cannot be started.
8. WHILE the Timer is in the stopped or paused state, THE Focus_Timer SHALL keep the Stop control in a disabled state.

---

### Requirement 4: To-Do List — Adding Tasks

**User Story:** As a user, I want to add new tasks, so that I can track things I need to do.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a visible text input field and a submit control (button or Enter-key press) for adding a new Task; the input field SHALL accept up to 200 characters.
2. WHEN the user submits a task name whose trimmed value is non-empty and does not exceed 200 characters, THE Todo_List SHALL append the new Task to the bottom of the list, persist the updated task array to Storage, and clear the input field.
3. IF the user attempts to submit a task name whose trimmed value is empty or consists solely of whitespace, THEN THE Todo_List SHALL not add a Task, SHALL not modify Storage, and SHALL retain focus on the input field.
4. IF the user attempts to submit a task name whose trimmed value exceeds 200 characters, THEN THE Todo_List SHALL not add a Task and SHALL display an inline validation message stating the 200-character limit.

---

### Requirement 5: To-Do List — Editing Tasks

**User Story:** As a user, I want to edit existing tasks inline, so that I can correct or update task descriptions without deleting and re-adding them.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a visible edit control for each Task in the list.
2. WHEN the user activates the edit control for a Task, THE Todo_List SHALL replace the task's display text with an editable input field pre-filled with the current task name, and SHALL set focus on that input field.
3. WHEN the user confirms an edit (via a confirm button or Enter key) with a trimmed value that is non-empty and does not exceed 200 characters, THE Todo_List SHALL update the Task name to the trimmed value, persist the change to Storage, and return the Task to its display state.
4. IF the user confirms an edit with a trimmed value that is empty or whitespace-only, THEN THE Todo_List SHALL not update the Task, SHALL retain the original task name, and SHALL return the Task to its display state.
5. IF the user confirms an edit with a trimmed value that exceeds 200 characters, THEN THE Todo_List SHALL not update the Task and SHALL display an inline validation message stating the 200-character limit.
6. WHEN the user cancels an edit (via a cancel button or Escape key), THE Todo_List SHALL discard any changes and return the Task to its original display state without modifying Storage.

---

### Requirement 6: To-Do List — Completing and Deleting Tasks

**User Story:** As a user, I want to mark tasks as done and delete tasks I no longer need, so that I can keep my list current.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a completion toggle control (e.g., checkbox) for each Task.
2. WHEN the user activates the completion toggle for an incomplete Task, THE Todo_List SHALL set the Task's `completed` property to `true`, apply a visual "done" style (strikethrough text and reduced opacity), and persist the updated task array to Storage.
3. WHEN the user activates the completion toggle for a completed Task, THE Todo_List SHALL set the Task's `completed` property to `false`, remove the "done" style, and persist the updated task array to Storage.
4. THE Todo_List SHALL provide a visible delete control for each Task.
5. WHEN the user activates the delete control for a Task, THE Todo_List SHALL immediately remove the Task from the rendered list and persist the updated task array to Storage.

---

### Requirement 7: To-Do List — Persistence

**User Story:** As a user, I want my tasks saved automatically, so that they are still there when I reopen the page.

#### Acceptance Criteria

1. WHEN the App loads, THE Todo_List SHALL read the task array from the fixed Storage key `"todo_tasks"` and render each Task in its last-saved state (name and completion status); if the key is absent, THE Todo_List SHALL render an empty list.
2. WHEN any add, edit, complete/uncomplete, or delete operation succeeds, THE Todo_List SHALL synchronously serialize the full task array as a JSON array and write it to the `"todo_tasks"` key in Local_Storage before the operation's UI update is visible.
3. IF the value at `"todo_tasks"` is not valid JSON or not a JSON array on load, THEN THE Todo_List SHALL treat it as absent, render an empty list, and continue operating without throwing an uncaught exception.
4. IF a write to Local_Storage throws a `QuotaExceededError` or any other storage error during use, THEN THE Todo_List SHALL display a non-blocking inline error message "Unable to save — storage is full or unavailable" and SHALL NOT apply the corresponding UI change, keeping the displayed list consistent with the last successfully persisted state.

---

### Requirement 8: Quick Links — Managing Links

**User Story:** As a user, I want to add and remove shortcut buttons to my favorite websites, so that I can open them quickly from the dashboard.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide an input form with a label field (max 100 characters) and a URL field (max 2048 characters), plus a submit control for adding a new Link.
2. WHEN the user submits a non-empty label (trimmed) and a valid URL (trimmed, begins with `http://` or `https://`), and the current link count is fewer than 50, THE Quick_Links SHALL render a new clickable button showing the label, and SHALL persist the updated links array to Storage.
3. IF the user submits with the label field empty or whitespace-only, THEN THE Quick_Links SHALL not add a Link and SHALL display the inline error "Label is required".
4. IF the user submits with the URL field empty, whitespace-only, or not beginning with `http://` or `https://`, THEN THE Quick_Links SHALL not add a Link and SHALL display the inline error "A valid URL starting with http:// or https:// is required".
5. IF the current link count is already 50 and the user attempts to add another Link, THEN THE Quick_Links SHALL not add the Link and SHALL display the inline error "Maximum of 50 links reached".
6. WHEN the user activates a Link button, THE Quick_Links SHALL open the associated URL in a new browser tab (target `_blank`) without navigating the current tab.
7. THE Quick_Links SHALL provide a visible delete control for each Link button.
8. WHEN the user activates the delete control for a Link, THE Quick_Links SHALL remove the Link from the rendered list and persist the updated links array to Storage.
9. IF a Storage write fails when adding or deleting a Link, THEN THE Quick_Links SHALL display an inline error "Unable to save — storage is full or unavailable" and SHALL NOT apply the corresponding UI change, keeping the displayed list consistent with the last successfully persisted state.

---

### Requirement 9: Quick Links — Persistence

**User Story:** As a user, I want my quick links saved automatically, so that they are still there when I reopen the page.

#### Acceptance Criteria

1. WHEN the App loads, THE Quick_Links SHALL read the links array from the fixed Storage key `"quick_links"` and render each Link as a clickable button; if the key is absent, THE Quick_Links SHALL render an empty links area.
2. WHEN the user successfully adds or deletes a Link, THE Quick_Links SHALL synchronously serialize the full links array as a JSON array and write it to the `"quick_links"` key in Local_Storage before the UI update is visible.
3. IF the value at `"quick_links"` on load is not valid JSON, is not a JSON array, or contains entries missing required `label` or `url` fields, THEN THE Quick_Links SHALL discard those invalid entries, render only the valid entries, and continue operating without throwing an uncaught exception.
4. IF a Storage write fails during a session (QuotaExceededError or equivalent), THE Quick_Links SHALL display an inline error message and retain the last successfully persisted state; THE Quick_Links SHALL reattempt the failed write once if the same operation is retried by the user within the same session.

---

### Requirement 10: Visual Design and Accessibility

**User Story:** As a user, I want a clean, readable, and visually structured interface, so that I can use the dashboard comfortably for extended periods.

#### Acceptance Criteria

1. THE App SHALL set a base font size of at least 14px on the `<body>` element; no content text in any panel SHALL render at a computed font size smaller than 14px.
2. THE App SHALL use foreground and background color combinations that achieve a contrast ratio of at least 4.5:1 for all normal-weight body text and at least 3:1 for all large text (≥18px regular or ≥14px bold), as defined by WCAG 2.1 Success Criterion 1.4.3.
3. THE App SHALL establish a typographic hierarchy where each heading level's computed font size is at least 4px larger than the level immediately below it, or alternatively at least 300 font-weight units heavier, so the hierarchy is unambiguous without relying on color alone.
4. THE App SHALL display all four panels and their content without horizontal scrollbars and without clipping any visible content at viewport widths ranging from 320px to 1920px inclusive.
5. WHERE an interactive control (button, input, link) receives keyboard focus, THE App SHALL render a visible focus indicator with a minimum outline width of 2px and a color contrast ratio of at least 3:1 between the indicator and the adjacent background, in compliance with WCAG 2.1 SC 2.4.7.
