import '@testing-library/jest-dom/vitest'

// Node 25 and newer define their own `localStorage` and `sessionStorage` globals, which are undefined
// unless Node is started with --localstorage-file. In Vitest they shadow the working ones that jsdom
// provides, so the tests would find `localStorage.clear` missing. Put a working one back. Browsers
// are not affected: this is only about the test environment.
const restoreStorage = (name: 'localStorage' | 'sessionStorage') => {
  const current = (globalThis as Record<string, unknown>)[name] as Storage | undefined
  if (typeof current?.clear === 'function') return

  const fromJsdom = (globalThis as unknown as { jsdom?: { window: Window } }).jsdom?.window?.[name]
  const items = new Map<string, string>()
  const inMemory: Storage = {
    get length() { return items.size },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => { items.delete(key) },
    setItem: (key, value) => { items.set(key, String(value)) },
  }
  Object.defineProperty(globalThis, name, { configurable: true, value: fromJsdom ?? inMemory })
}

restoreStorage('localStorage')
restoreStorage('sessionStorage')
