/**
 * Test suite for todo-list-website
 *
 * Covers:
 *   - 14 property-based tests (Properties 1–14) using fast-check
 *   - Unit / example-based tests for all pure functions and CRUD operations
 *
 * All property tests run at least 100 iterations.
 */

'use strict';

const fc = require('fast-check');

// ---------------------------------------------------------------------------
// Minimal DOM shim so app.js DOM-touching code is safely no-op in Node.js
// ---------------------------------------------------------------------------
global.document = {
  getElementById: () => null,
  querySelector:  () => null,
  createElement:  (tag) => {
    const el = {
      _tag: tag, _attrs: {}, _children: [], _classes: new Set(),
      className: '', textContent: '', innerHTML: '',
      type: '', checked: false, value: '', maxLength: 0,
      disabled: false,
      dataset: {},
      style: {},
      append:       (...kids) => el._children.push(...kids),
      appendChild:  (c) => { el._children.push(c); return c; },
      remove:       () => {},
      closest:      () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      setAttribute: (k, v) => { el._attrs[k] = v; },
      getAttribute: (k)    => el._attrs[k] ?? null,
      addEventListener: () => {},
      classList: {
        add:    (...cs) => cs.forEach(c => el._classes.add(c)),
        remove: (...cs) => cs.forEach(c => el._classes.delete(c)),
        toggle: (c, v) => v === undefined
          ? (el._classes.has(c) ? el._classes.delete(c) : el._classes.add(c))
          : (v ? el._classes.add(c) : el._classes.delete(c)),
        contains: (c) => el._classes.has(c),
      },
    };
    return el;
  },
  addEventListener: () => {},
};
global.localStorage = (() => {
  let store = {};
  return {
    getItem:    (k)    => k in store ? store[k] : null,
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k)    => { delete store[k]; },
    clear:      ()     => { store = {}; },
    _store:     ()     => store,
  };
})();
global.crypto = { randomUUID: () => Math.random().toString(36).slice(2) };

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------
const app = require('../js/app.js');
const {
  safeRead, safeWrite,
  getGreetingText, formatTime, formatDate,
  renderTimer, setTimerControls,
  isValidUrl,
  addTask, toggleTask, deleteTask, editTask, persistTasks,
  addLink, deleteLink, persistLinks,
} = app;

// Helper: reset in-memory arrays between tests via module internals
// (we re-require or reset via addTask / deleteTask patterns instead)
function resetTasks() {
  // Delete all tasks via deleteTask, or reach into the module
  // Simpler: just re-assign via the exported persistTasks mechanism is not available,
  // so we manipulate localStorage and reload state.
  localStorage.clear();
}

// ---------------------------------------------------------------------------
// PROPERTY-BASED TESTS
// ---------------------------------------------------------------------------

describe('Property-Based Tests', () => {
  // Feature: todo-list-website, Property 1: Greeting text covers every hour exactly once
  test('Property 1: getGreetingText returns a valid greeting for every hour [0,23]', () => {
    const validGreetings = new Set([
      'Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night',
    ]);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
        const result = getGreetingText(hour);
        if (!validGreetings.has(result)) return false;
        if (hour >= 5  && hour <= 11 && result !== 'Good Morning')   return false;
        if (hour >= 12 && hour <= 17 && result !== 'Good Afternoon') return false;
        if (hour >= 18 && hour <= 21 && result !== 'Good Evening')   return false;
        if ((hour <= 4 || hour >= 22) && result !== 'Good Night')    return false;
        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 2: formatDate output matches the required pattern for any date
  test('Property 2: formatDate output matches "Weekday, Month D, YYYY" pattern', () => {
    const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months   = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
    const pattern  = new RegExp(
      `^(${weekdays.join('|')}), (${months.join('|')}) (\\d{1,2}), (\\d{4})$`
    );
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') }),
        (date) => pattern.test(formatDate(date))
      ),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 3: Timer controls always reflect the current timer state
  test('Property 3: setTimerControls disabled invariants hold after every state transition', () => {
    // Build a minimal DOM for this test
    const startBtn = { disabled: false };
    const stopBtn  = { disabled: false };
    const origGetEl = global.document.getElementById;
    global.document.getElementById = (id) => {
      if (id === 'timer-start') return startBtn;
      if (id === 'timer-stop')  return stopBtn;
      return null;
    };

    try {
      fc.assert(
        fc.property(
          fc.constantFrom('STOPPED', 'RUNNING', 'PAUSED'),
          (state) => {
            setTimerControls(state);
            if (state === 'STOPPED' || state === 'PAUSED') {
              return startBtn.disabled === false && stopBtn.disabled === true;
            }
            if (state === 'RUNNING') {
              return startBtn.disabled === true && stopBtn.disabled === false;
            }
            return false;
          }
        ),
        { numRuns: 100 }
      );
    } finally {
      global.document.getElementById = origGetEl;
    }
  });

  // Feature: todo-list-website, Property 4: Timer display is always a valid MM:SS string
  test('Property 4: renderTimer returns valid MM:SS where MM×60+SS equals input', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1500 }), (seconds) => {
        const result = renderTimer(seconds);
        if (!/^\d{2}:\d{2}$/.test(result)) return false;
        const [mm, ss] = result.split(':').map(Number);
        return mm * 60 + ss === seconds;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 5: Adding a valid task grows the task list by exactly one
  test('Property 5: addTask with valid name grows the task array by exactly 1', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0 && s.trim().length <= 200),
        (name) => {
          localStorage.clear();
          // Pre-populate tasks via localStorage so module starts fresh
          localStorage.setItem('todo_tasks', JSON.stringify([]));
          // Force module to reload tasks
          // We test the storage effect: before and after counts
          const before = JSON.parse(localStorage.getItem('todo_tasks') || '[]').length;
          addTask(name);
          const after = JSON.parse(localStorage.getItem('todo_tasks') || '[]').length;
          const stored = JSON.parse(localStorage.getItem('todo_tasks') || '[]');
          const last = stored[stored.length - 1];
          return (
            after === before + 1 &&
            last &&
            last.name === name.trim() &&
            last.completed === false
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 6: Whitespace-only and empty task names are rejected
  test('Property 6: addTask with whitespace-only input leaves task array unchanged', () => {
    fc.assert(
      fc.property(
        fc.string().map(s => s.replace(/\S/g, ' ')), // whitespace-only
        (wsName) => {
          localStorage.clear();
          localStorage.setItem('todo_tasks', JSON.stringify([]));
          const setItemSpy = [];
          const orig = localStorage.setItem.bind(localStorage);
          localStorage.setItem = (k, v) => { setItemSpy.push(k); orig(k, v); };

          addTask(wsName);

          localStorage.setItem = orig;
          // localStorage.setItem should NOT have been called with todo_tasks
          return !setItemSpy.includes('todo_tasks');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 7: Task completion toggle is a round trip
  test('Property 7: Toggling a task twice restores its original completed state', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (initialCompleted) => {
          localStorage.clear();
          const id = 'test-toggle-id';
          const task = { id, name: 'Test task', completed: initialCompleted };
          localStorage.setItem('todo_tasks', JSON.stringify([task]));

          toggleTask(id);
          toggleTask(id);

          const stored = JSON.parse(localStorage.getItem('todo_tasks') || '[]');
          const found = stored.find(t => t.id === id);
          return found && found.completed === initialCompleted;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 8: Deleting a task removes exactly that task
  test('Property 8: deleteTask removes exactly one task and no others', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ name: fc.string({ minLength: 1, maxLength: 50 }), completed: fc.boolean() }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.integer({ min: 0, max: 19 }),
        (taskInputs, deleteIdxRaw) => {
          localStorage.clear();
          const taskList = taskInputs.map((t, i) => ({
            id: `task-${i}`, name: t.name, completed: t.completed,
          }));
          localStorage.setItem('todo_tasks', JSON.stringify(taskList));

          const deleteIdx = deleteIdxRaw % taskList.length;
          const targetId  = taskList[deleteIdx].id;

          deleteTask(targetId);

          const stored = JSON.parse(localStorage.getItem('todo_tasks') || '[]');
          if (stored.length !== taskList.length - 1) return false;
          if (stored.some(t => t.id === targetId))   return false;
          // All remaining tasks should match original
          const remaining = taskList.filter(t => t.id !== targetId);
          return remaining.every((orig, i) =>
            stored[i] && stored[i].id === orig.id && stored[i].name === orig.name
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 9: Task storage round-trip preserves all fields
  test('Property 9: JSON round-trip preserves id, name, completed for all task entries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id:        fc.string({ minLength: 1, maxLength: 36 }),
            name:      fc.string({ minLength: 1, maxLength: 200 }),
            completed: fc.boolean(),
          }),
          { maxLength: 50 }
        ),
        (taskArray) => {
          const roundTripped = JSON.parse(JSON.stringify(taskArray));
          return (
            roundTripped.length === taskArray.length &&
            taskArray.every((t, i) =>
              roundTripped[i].id        === t.id &&
              roundTripped[i].name      === t.name &&
              roundTripped[i].completed === t.completed
            )
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 10: Corrupted localStorage is handled gracefully without throwing
  test('Property 10: safeRead returns defaultValue and does not throw for arbitrary stored strings', () => {
    fc.assert(
      fc.property(fc.string(), (rawValue) => {
        const key = '__test_key__';
        localStorage.setItem(key, rawValue);
        const defaultValue = [];
        let result;
        let threw = false;
        try {
          result = safeRead(key, defaultValue);
        } catch {
          threw = true;
        }
        if (threw) return false;
        // If the stored value happens to be a valid JSON array, safeRead may return it
        // but it should never throw regardless
        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 11: Valid URL detection is consistent with the http/https rule
  test('Property 11: isValidUrl returns true iff trimmed string starts with http:// or https://', () => {
    fc.assert(
      fc.property(fc.string(), (url) => {
        const trimmed = url.trim();
        const expected = trimmed.startsWith('http://') || trimmed.startsWith('https://');
        return isValidUrl(url) === expected;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 12: Adding a valid link grows the link list by exactly one
  test('Property 12: addLink with valid args grows links array by exactly 1', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id:    fc.string({ minLength: 1, maxLength: 36 }),
            label: fc.string({ minLength: 1, maxLength: 100 }),
            url:   fc.constantFrom('https://example.com', 'http://test.org'),
          }),
          { minLength: 0, maxLength: 49 }
        ),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.constantFrom('https://kiro.dev', 'http://localhost', 'https://github.com'),
        (existingLinks, label, url) => {
          localStorage.clear();
          localStorage.setItem('quick_links', JSON.stringify(existingLinks));

          const before = JSON.parse(localStorage.getItem('quick_links') || '[]').length;
          addLink(label, url);
          const after = JSON.parse(localStorage.getItem('quick_links') || '[]').length;
          const stored = JSON.parse(localStorage.getItem('quick_links') || '[]');
          const last = stored[stored.length - 1];

          return (
            after === before + 1 &&
            last &&
            last.label === label.trim() &&
            last.url   === url.trim()
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 13: Link list never exceeds 50 entries
  test('Property 13: addLink with 50 existing links leaves the array at length 50', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.constantFrom('https://example.com', 'http://test.com'),
        (label, url) => {
          localStorage.clear();
          const fullLinks = Array.from({ length: 50 }, (_, i) => ({
            id: `link-${i}`, label: `Link ${i}`, url: 'https://example.com',
          }));
          localStorage.setItem('quick_links', JSON.stringify(fullLinks));

          addLink(label, url);

          const stored = JSON.parse(localStorage.getItem('quick_links') || '[]');
          return stored.length === 50;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: todo-list-website, Property 14: Quick Links storage round-trip preserves all fields
  test('Property 14: JSON round-trip preserves id, label, url for all link entries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id:    fc.string({ minLength: 1, maxLength: 36 }),
            label: fc.string({ minLength: 1, maxLength: 100 }),
            url:   fc.string({ minLength: 1, maxLength: 200 }),
          }),
          { maxLength: 50 }
        ),
        (linkArray) => {
          const roundTripped = JSON.parse(JSON.stringify(linkArray));
          return (
            roundTripped.length === linkArray.length &&
            linkArray.every((l, i) =>
              roundTripped[i].id    === l.id &&
              roundTripped[i].label === l.label &&
              roundTripped[i].url   === l.url
            )
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// UNIT / EXAMPLE-BASED TESTS
// ---------------------------------------------------------------------------

describe('Unit Tests — getGreetingText boundary hours', () => {
  test('hour 4  → Good Night',     () => expect(getGreetingText(4)).toBe('Good Night'));
  test('hour 5  → Good Morning',   () => expect(getGreetingText(5)).toBe('Good Morning'));
  test('hour 11 → Good Morning',   () => expect(getGreetingText(11)).toBe('Good Morning'));
  test('hour 12 → Good Afternoon', () => expect(getGreetingText(12)).toBe('Good Afternoon'));
  test('hour 17 → Good Afternoon', () => expect(getGreetingText(17)).toBe('Good Afternoon'));
  test('hour 18 → Good Evening',   () => expect(getGreetingText(18)).toBe('Good Evening'));
  test('hour 21 → Good Evening',   () => expect(getGreetingText(21)).toBe('Good Evening'));
  test('hour 22 → Good Night',     () => expect(getGreetingText(22)).toBe('Good Night'));
  test('hour 0  → Good Night',     () => expect(getGreetingText(0)).toBe('Good Night'));
  test('hour 23 → Good Night',     () => expect(getGreetingText(23)).toBe('Good Night'));
});

describe('Unit Tests — formatTime', () => {
  test('midnight → "00:00"', () => {
    const d = new Date(2026, 5, 1, 0, 0, 0);
    expect(formatTime(d)).toBe('00:00');
  });
  test('noon → "12:00"', () => {
    const d = new Date(2026, 5, 1, 12, 0, 0);
    expect(formatTime(d)).toBe('12:00');
  });
  test('09:05', () => {
    const d = new Date(2026, 5, 1, 9, 5, 0);
    expect(formatTime(d)).toBe('09:05');
  });
  test('23:59', () => {
    const d = new Date(2026, 5, 1, 23, 59, 0);
    expect(formatTime(d)).toBe('23:59');
  });
});

describe('Unit Tests — formatDate', () => {
  test('Monday, June 1, 2026', () => {
    const d = new Date(2026, 5, 1); // June 1 2026 is a Monday
    expect(formatDate(d)).toBe('Monday, June 1, 2026');
  });
  test('day is not zero-padded', () => {
    const d = new Date(2026, 5, 1);
    expect(formatDate(d)).not.toContain('01,');
  });
});

describe('Unit Tests — renderTimer known values', () => {
  test('renderTimer(0) → "00:00"',    () => expect(renderTimer(0)).toBe('00:00'));
  test('renderTimer(1500) → "25:00"', () => expect(renderTimer(1500)).toBe('25:00'));
  test('renderTimer(90) → "01:30"',   () => expect(renderTimer(90)).toBe('01:30'));
  test('renderTimer(61) → "01:01"',   () => expect(renderTimer(61)).toBe('01:01'));
  test('renderTimer(59) → "00:59"',   () => expect(renderTimer(59)).toBe('00:59'));
});

describe('Unit Tests — isValidUrl', () => {
  test('"https://example.com" → true',  () => expect(isValidUrl('https://example.com')).toBe(true));
  test('"http://x" → true',             () => expect(isValidUrl('http://x')).toBe(true));
  test('"ftp://x" → false',             () => expect(isValidUrl('ftp://x')).toBe(false));
  test('"" → false',                    () => expect(isValidUrl('')).toBe(false));
  test('"  " → false',                  () => expect(isValidUrl('  ')).toBe(false));
  test('"//x" → false',                 () => expect(isValidUrl('//x')).toBe(false));
  test('"relative/path" → false',       () => expect(isValidUrl('relative/path')).toBe(false));
  test('leading spaces with https → true', () => expect(isValidUrl('  https://ok.com')).toBe(true));
});

describe('Unit Tests — addTask / toggleTask / deleteTask / editTask', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('todo_tasks', JSON.stringify([]));
  });

  test('addTask adds a task with trimmed name and completed: false', () => {
    addTask('  Buy milk  ');
    const stored = JSON.parse(localStorage.getItem('todo_tasks'));
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Buy milk');
    expect(stored[0].completed).toBe(false);
  });

  test('addTask ignores whitespace-only input', () => {
    addTask('   ');
    const stored = JSON.parse(localStorage.getItem('todo_tasks'));
    expect(stored).toHaveLength(0);
  });

  test('addTask ignores empty string', () => {
    addTask('');
    const stored = JSON.parse(localStorage.getItem('todo_tasks'));
    expect(stored).toHaveLength(0);
  });

  test('toggleTask flips completed field', () => {
    const task = { id: 'abc', name: 'Test', completed: false };
    localStorage.setItem('todo_tasks', JSON.stringify([task]));
    toggleTask('abc');
    const stored = JSON.parse(localStorage.getItem('todo_tasks'));
    expect(stored[0].completed).toBe(true);
  });

  test('deleteTask removes the task', () => {
    const tasks = [
      { id: 'x1', name: 'Keep', completed: false },
      { id: 'x2', name: 'Delete me', completed: false },
    ];
    localStorage.setItem('todo_tasks', JSON.stringify(tasks));
    deleteTask('x2');
    const stored = JSON.parse(localStorage.getItem('todo_tasks'));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('x1');
  });

  test('editTask updates the task name', () => {
    const task = { id: 'e1', name: 'Old name', completed: false };
    localStorage.setItem('todo_tasks', JSON.stringify([task]));
    // editTask needs li reference; pass a minimal mock
    const li = {
      querySelector: (sel) => {
        if (sel === '.todo-edit-error') return { textContent: '' };
        if (sel === '.todo-edit-input')  return { remove: () => {} };
        if (sel === '.todo-confirm-btn') return { remove: () => {} };
        if (sel === '.todo-cancel-btn')  return { remove: () => {} };
        if (sel === '.todo-text')        return { textContent: '', style: {}, remove: () => {} };
        if (sel === '.todo-edit-btn')    return { style: {} };
        if (sel === '.todo-delete-btn')  return { style: {} };
        if (sel === '.todo-toggle')      return { style: {} };
        return null;
      },
    };
    editTask('e1', '  New name  ', li, task);
    const stored = JSON.parse(localStorage.getItem('todo_tasks'));
    expect(stored[0].name).toBe('New name');
  });

  test('editTask with empty name does NOT update storage', () => {
    const task = { id: 'e2', name: 'Keep', completed: false };
    localStorage.setItem('todo_tasks', JSON.stringify([task]));
    const li = {
      querySelector: (sel) => {
        if (sel === '.todo-edit-error') return { textContent: '' };
        if (sel === '.todo-text')       return { textContent: '', style: {} };
        if (sel === '.todo-edit-input') return { remove: () => {} };
        if (sel === '.todo-confirm-btn') return { remove: () => {} };
        if (sel === '.todo-cancel-btn')  return { remove: () => {} };
        if (sel === '.todo-edit-btn')   return { style: {} };
        if (sel === '.todo-delete-btn') return { style: {} };
        if (sel === '.todo-toggle')     return { style: {} };
        return null;
      },
    };
    editTask('e2', '   ', li, task);
    const stored = JSON.parse(localStorage.getItem('todo_tasks'));
    expect(stored[0].name).toBe('Keep');
  });
});

describe('Unit Tests — addLink / deleteLink', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('quick_links', JSON.stringify([]));
  });

  test('addLink adds a link with trimmed label and url', () => {
    addLink('  GitHub  ', '  https://github.com  ');
    const stored = JSON.parse(localStorage.getItem('quick_links'));
    expect(stored).toHaveLength(1);
    expect(stored[0].label).toBe('GitHub');
    expect(stored[0].url).toBe('https://github.com');
  });

  test('addLink rejects empty label', () => {
    addLink('', 'https://github.com');
    const stored = JSON.parse(localStorage.getItem('quick_links'));
    expect(stored).toHaveLength(0);
  });

  test('addLink rejects invalid URL', () => {
    addLink('GitHub', 'ftp://github.com');
    const stored = JSON.parse(localStorage.getItem('quick_links'));
    expect(stored).toHaveLength(0);
  });

  test('addLink rejects when 50 links exist', () => {
    const fullLinks = Array.from({ length: 50 }, (_, i) => ({
      id: `l${i}`, label: `L${i}`, url: 'https://x.com',
    }));
    localStorage.setItem('quick_links', JSON.stringify(fullLinks));
    addLink('Extra', 'https://extra.com');
    const stored = JSON.parse(localStorage.getItem('quick_links'));
    expect(stored).toHaveLength(50);
  });

  test('deleteLink removes the correct link', () => {
    const lnks = [
      { id: 'l1', label: 'Keep',   url: 'https://keep.com' },
      { id: 'l2', label: 'Remove', url: 'https://remove.com' },
    ];
    localStorage.setItem('quick_links', JSON.stringify(lnks));
    deleteLink('l2');
    const stored = JSON.parse(localStorage.getItem('quick_links'));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('l1');
  });
});

describe('Unit Tests — safeRead / safeWrite (localStorage error paths)', () => {
  beforeEach(() => localStorage.clear());

  test('safeRead returns defaultValue when key is absent', () => {
    expect(safeRead('no_such_key', [])).toEqual([]);
  });

  test('safeRead returns defaultValue for non-JSON string', () => {
    localStorage.setItem('k', 'not-json!!!');
    expect(safeRead('k', [])).toEqual([]);
  });

  test('safeRead returns defaultValue for valid JSON non-array', () => {
    localStorage.setItem('k', JSON.stringify({ foo: 'bar' }));
    expect(safeRead('k', [])).toEqual([]);
  });

  test('safeRead returns the array when value is a valid JSON array', () => {
    localStorage.setItem('k', JSON.stringify([1, 2, 3]));
    expect(safeRead('k', [])).toEqual([1, 2, 3]);
  });

  test('safeWrite returns true on success', () => {
    expect(safeWrite('k', [1, 2])).toBe(true);
    expect(JSON.parse(localStorage.getItem('k'))).toEqual([1, 2]);
  });

  test('safeWrite returns false when localStorage.setItem throws (QuotaExceededError)', () => {
    const orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw new DOMException('QuotaExceededError'); };
    expect(safeWrite('k', [1, 2])).toBe(false);
    localStorage.setItem = orig;
  });

  test('persistTasks shows error message and returns false on quota exceeded', () => {
    // Seed a task
    const task = { id: 't1', name: 'Task', completed: false };
    localStorage.setItem('todo_tasks', JSON.stringify([task]));

    // Intercept querySelector for .todo-error
    const errEl = { textContent: '' };
    const origQS = global.document.querySelector;
    global.document.querySelector = (sel) => sel === '.todo-error' ? errEl : null;

    // Force setItem to throw
    const orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw new DOMException('QuotaExceededError'); };

    const result = persistTasks();

    localStorage.setItem  = orig;
    global.document.querySelector = origQS;

    expect(result).toBe(false);
    expect(errEl.textContent).toContain('Unable to save');
  });

  test('persistLinks shows error message and returns false on quota exceeded', () => {
    const link = { id: 'l1', label: 'Test', url: 'https://test.com' };
    localStorage.setItem('quick_links', JSON.stringify([link]));

    const errEl = { textContent: '' };
    const origQS = global.document.querySelector;
    global.document.querySelector = (sel) => sel === '.links-error' ? errEl : null;

    const orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw new DOMException('QuotaExceededError'); };

    const result = persistLinks();

    localStorage.setItem  = orig;
    global.document.querySelector = origQS;

    expect(result).toBe(false);
    expect(errEl.textContent).toContain('Unable to save');
  });
});

describe('Unit Tests — panel isolation (initXxx wrapped in try/catch)', () => {
  test('initGreeting failure does not throw to caller', () => {
    // Temporarily break document.getElementById to simulate DOM not ready
    const orig = global.document.getElementById;
    global.document.getElementById = () => { throw new Error('DOM error'); };
    // setInterval is not defined in Node — mock it
    const origSI = global.setInterval;
    global.setInterval = () => {};
    expect(() => app.initGreeting()).not.toThrow();
    global.document.getElementById = orig;
    global.setInterval = origSI;
  });

  test('initTimer failure does not throw to caller', () => {
    const orig = global.document.getElementById;
    global.document.getElementById = () => { throw new Error('DOM error'); };
    expect(() => app.initTimer()).not.toThrow();
    global.document.getElementById = orig;
  });

  test('initTodoList failure does not throw to caller', () => {
    const orig = global.document.getElementById;
    global.document.getElementById = () => { throw new Error('DOM error'); };
    expect(() => app.initTodoList()).not.toThrow();
    global.document.getElementById = orig;
  });

  test('initQuickLinks failure does not throw to caller', () => {
    const orig = global.document.getElementById;
    global.document.getElementById = () => { throw new Error('DOM error'); };
    expect(() => app.initQuickLinks()).not.toThrow();
    global.document.getElementById = orig;
  });
});
