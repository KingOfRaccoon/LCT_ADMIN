// Centralized lightweight logger used across the builder.
// Controls whether debug/info/warn/error are printed via an internal trace flag.

const resolveInitialTrace = () => {
  try {
    if (typeof window !== 'undefined' && typeof window.__VC_TRACE__ !== 'undefined') {
      return Boolean(window.__VC_TRACE__);
    }
  } catch {
    // ignore window access errors (e.g. SSR)
  }

  // Prefer Vite-style env flags when available (frontend) or process env (node tests/server)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const { VITE_VC_TRACE, MODE, DEV } = import.meta.env;
      if (typeof VITE_VC_TRACE !== 'undefined') {
        return VITE_VC_TRACE === 'true' || VITE_VC_TRACE === true;
      }
      if (typeof DEV === 'boolean') {
        return DEV;
      }
      if (typeof MODE === 'string') {
        return MODE !== 'production';
      }
    }
  } catch {
    // ignore import.meta access errors (e.g. node without ESM env injection)
  }

  try {
    if (typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.env) {
      const { VC_TRACE, NODE_ENV } = globalThis.process.env;
      if (typeof VC_TRACE !== 'undefined') {
        return VC_TRACE === 'true';
      }
      if (typeof NODE_ENV === 'string') {
        return NODE_ENV !== 'production';
      }
    }
  } catch {
    // ignore process/env access errors
  }

  return false;
};

let trace = resolveInitialTrace();

const setTrace = (v) => {
  trace = Boolean(v);
  try {
    if (typeof window !== 'undefined') window.__VC_TRACE__ = trace;
  } catch {
    // ignore
  }
};

const enabled = () => trace;

const debug = (...args) => {
  if (!trace) return;
  console.debug(...args);
};

const info = (...args) => {
  if (!trace) return;
  console.info(...args);
};

const warn = (...args) => {
  if (!trace) return;
  console.warn(...args);
};

const error = (...args) => {
  if (!trace) return;
  console.error(...args);
};

export default {
  debug,
  info,
  warn,
  error,
  setTrace,
  enabled
};
