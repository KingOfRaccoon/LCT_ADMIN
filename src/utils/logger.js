// Centralized lightweight logger used across the builder.
// Controls whether debug/info/warn/error are printed via an internal trace flag.
const detectDev = (() => {
  try {
    if (typeof window !== 'undefined' && typeof location !== 'undefined') {
      const host = location.hostname || '';
      const port = String(location.port || '');
      if (host === 'localhost' || host === '127.0.0.1' || port === '5173') return true;
    }
  } catch {
    // ignore
  }

  try {
    if (typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.env && globalThis.process.env.NODE_ENV !== 'production') {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
})();

let trace = (typeof window !== 'undefined' && Boolean(window.__VC_TRACE__)) || detectDev;

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
